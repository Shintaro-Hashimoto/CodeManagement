import json
import os
import time
import datetime
import re
from typing import Dict, Any, Optional, List

import boto3
import requests
from botocore.exceptions import ClientError

# ===== Env vars =====
SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_CHANNEL_ID = os.environ["SLACK_CHANNEL_ID"]
DEDUP_TABLE = os.environ["DEDUP_TABLE"]
DEDUP_TTL_SECONDS = int(os.environ.get("DEDUP_TTL_SECONDS", "7200"))
CONNECT_INSTANCE_ID = os.environ["CONNECT_INSTANCE_ID"]  # Describe 用に必須

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DEDUP_TABLE)
connect = boto3.client("connect")

# 受信（システム）番号 → サービス名（適宜編集）
NUMBER_TO_SERVICE_MAP = {
    "+81366702570": "kids plus",
    "+815031851550": "APProg",
    "+815031851570": "Support",
}

# 正規表現フォールバック
E164_RE = re.compile(r"\+\d{8,15}")
JP_LOCAL_RE = re.compile(r"\b0\d{9,10}\b")

# ===== helpers =====
def _first(*vals):
    """最初に見つかった非空文字列 or dict(address=...) を返す"""
    for v in vals:
        if v is None:
            continue
        if isinstance(v, str):
            s = v.strip()
            if s:
                return s
        elif isinstance(v, dict):
            a = v.get("address")
            if isinstance(a, str) and a.strip():
                return a.strip()
    return None

def _unique_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in items:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out

def _format_jp(number: Optional[str]) -> str:
    """+81xxxxxxxxxx を 0xxxxxxxxxx 表示に"""
    if number and number.startswith("+81"):
        return "0" + number[3:]
    return number or "不明な番号"

def _queue_name_from_arn(queue_arn: str) -> str:
    """Queue 名の解決（DescribeQueue が使えなければ ARN 末尾）"""
    if not isinstance(queue_arn, str):
        return "不明なキュー"
    queue_id = queue_arn.split("/")[-1]
    display = queue_id
    try:
        resp = connect.describe_queue(InstanceId=CONNECT_INSTANCE_ID, QueueId=queue_id)
        display = resp.get("Queue", {}).get("Name") or display
    except Exception as e:
        print(f"[WARN] describe_queue failed: {e}")
    return display

def _fetch_customer_number_by_api(initial_or_contact_id: str) -> Optional[str]:
    """DescribeContact で CustomerEndpoint.Address（顧客番号）を取得"""
    if not initial_or_contact_id:
        return None
    try:
        resp = connect.describe_contact(
            InstanceId=CONNECT_INSTANCE_ID,
            ContactId=initial_or_contact_id  # INBOUND は initialContactId を指定でOK
        )
        contact = resp.get("Contact", {}) or {}
        ce = contact.get("CustomerEndpoint") or {}
        addr = ce.get("Address")
        if isinstance(addr, str) and addr.strip():
            return addr.strip()
    except Exception as e:
        print(f"[WARN] DescribeContact failed: {e}")
    return None

def _pick_customer_number(details: dict, system_number: Optional[str]) -> Optional[str]:
    """
    顧客の電話番号のみを選ぶ（system number を候補から除外）
    1) 顧客側の典型キーから収集（優先）
    2) system number と重複を除外
    3) 無ければ JSON 全体を正規表現でスキャンして system を除外
    """
    candidates: List[str] = [
        _first((details.get("customerEndpoint") or {}).get("address")),
        _first(((details.get("initiatingContact") or {}).get("endpoint") or {}).get("address")),
        _first((details.get("tags") or {}).get("aws:connect:customerEndpoint")),
        _first(details.get("customerEndpoint")),
        _first((details.get("attributes") or {}).get("CustomerNumber")),
        _first((details.get("Attributes") or {}).get("CustomerNumber")),
        _first((details.get("customer") or {}).get("address")),
        _first(((details.get("customer") or {}).get("endpoint") or {}).get("address")),
    ]
    candidates = _unique_preserve_order([c for c in candidates if isinstance(c, str) and c.strip()])
    if system_number:
        candidates = [c for c in candidates if c != system_number]
    if candidates:
        return candidates[0]

    # Fallback: 正規表現スキャン
    try:
        blob = json.dumps(details, ensure_ascii=False)
        all_nums = _unique_preserve_order(E164_RE.findall(blob) + JP_LOCAL_RE.findall(blob))
        if system_number:
            all_nums = [n for n in all_nums if n != system_number]
        if all_nums:
            return all_nums[0]
    except Exception as e:
        print(f"[WARN] regex scan for phone failed: {e}")
    return None

def _extract_quick_fields(details: dict) -> Dict[str, Optional[str]]:
    """単一イベントから拾える値（欠けてもOK。後でキャッシュとマージ）"""
    # 受信（system）番号：サービス判定用
    system_number = _first(
        (details.get("systemEndpoint") or {}).get("address"),
        (details.get("tags") or {}).get("aws:connect:systemEndpoint"),
        details.get("systemEndpoint"),
        (details.get("attributes") or {}).get("SystemNumber"),
        (details.get("Attributes") or {}).get("SystemNumber"),
    )
    # 発信者（customer）番号：Slack 表示用
    customer_number = _pick_customer_number(details, system_number)

    queue_info = details.get("queueInfo") or {}
    queue_name = _first(queue_info.get("name"))
    queue_arn = queue_info.get("queueArn") if isinstance(queue_info, dict) else None

    return {
        "system_number": system_number,
        "customer_number": customer_number,
        "queue_name": queue_name,
        "queue_arn": queue_arn,
    }

def _cache_put(initial_id: str, payload: Dict[str, Optional[str]]):
    """DISCONNECTED 用に情報をキャッシュ（INITIATED/QUEUED/CONNECTED で呼ぶ）"""
    try:
        now = int(time.time())
        ttl = now + DEDUP_TTL_SECONDS
        item = {"pk": f"cache:{initial_id}", "ts": now, "ttl": ttl}
        for k in ("system_number", "customer_number", "queue_name", "queue_arn", "agent_connected"):
            v = payload.get(k)
            if v is None:
                continue
            if isinstance(v, str):
                s = v.strip()
                if s:
                    item[k] = s
            elif isinstance(v, (int, bool)):
                item[k] = int(bool(v))
        if len(item) > 3:
            table.put_item(Item=item)
    except Exception as e:
        print(f"[WARN] cache_put failed: {e}")

def _cache_get(initial_id: str) -> Dict[str, Optional[str]]:
    try:
        resp = table.get_item(Key={"pk": f"cache:{initial_id}"})
        return resp.get("Item") or {}
    except Exception as e:
        print(f"[WARN] cache_get failed: {e}")
        return {}

def _cache_merge_agent_connected(initial_id: str, connected: bool):
    """agent_connected=1 を Upsert（CONNECTED 受信時に呼ぶ）"""
    try:
        now = int(time.time())
        ttl = now + DEDUP_TTL_SECONDS
        table.update_item(
            Key={"pk": f"cache:{initial_id}"},
            UpdateExpression="SET #ts=:ts, #ttl=:ttl, #ac=:ac",
            ExpressionAttributeNames={"#ts": "ts", "#ttl": "ttl", "#ac": "agent_connected"},
            ExpressionAttributeValues={":ts": now, ":ttl": ttl, ":ac": 1 if connected else 0},
        )
    except ClientError as e:
        print(f"[INFO] update_item failed (creating cache): {e}")
        _cache_put(initial_id, {"agent_connected": 1 if connected else 0})
    except Exception as e:
        print(f"[WARN] cache_merge_agent_connected failed: {e}")

def _dedup_once(initial_id: str) -> bool:
    """initialContactId 単位で 1 回だけ通知"""
    now = int(time.time())
    ttl = now + DEDUP_TTL_SECONDS
    try:
        table.put_item(
            Item={"pk": f"abandon:{initial_id}", "ts": now, "ttl": ttl},
            ConditionExpression="attribute_not_exists(pk)",
        )
        print(f"[INFO] dedup ok (first notify): {initial_id}")
        return True
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        if code == "ConditionalCheckFailedException":
            print(f"[INFO] dedup hit (suppress duplicate): {initial_id}")
            return False
        print(f"[WARN] dedup unexpected error (allow notify): {e}")
        return True
    except Exception as e:
        print(f"[WARN] dedup unknown error (allow notify): {e}")
        return True

def _finalize_fields(details: dict) -> Dict[str, Any]:
    """
    イベント＋キャッシュを統合し、必要なら DescribeContact で顧客番号を補完。
    また dequeueTimestamp（デキュー＝エージェント応答）を見て抑止。
    """
    initial_id = details.get("initialContactId") or details.get("contactId") or ""
    quick = _extract_quick_fields(details)
    cache = _cache_get(initial_id)

    system_number = quick["system_number"] or cache.get("system_number")
    customer_number = quick["customer_number"] or cache.get("customer_number")

    # 顧客番号が取れていなければ DescribeContact で補完
    if not customer_number:
        api_num = _fetch_customer_number_by_api(initial_id)
        if api_num:
            customer_number = api_num
            _cache_put(initial_id, {"customer_number": customer_number})

    queue_name = quick["queue_name"] or cache.get("queue_name")
    queue_arn = quick["queue_arn"] or cache.get("queue_arn")

    qinfo = details.get("queueInfo") or {}
    dequeue_ts = qinfo.get("dequeueTimestamp") if isinstance(qinfo, dict) else None

    if (not queue_name) and queue_arn:
        queue_name = _queue_name_from_arn(queue_arn)

    service_name = NUMBER_TO_SERVICE_MAP.get(system_number or "", "不明な宛先")
    agent_connected = int(cache.get("agent_connected") or 0)
    if dequeue_ts:
        agent_connected = 1  # デキュー＝エージェント応答とみなす

    return {
        "service_name": service_name,
        "queue_name": queue_name or "不明なキュー",
        "customer_number_disp": _format_jp(customer_number),
        "agent_connected": agent_connected,
    }

def _send_slack(service_name: str, queue_name: str, customer_number_disp: str):
    jst = datetime.timezone(datetime.timedelta(hours=+9), "JST")
    timestamp = datetime.datetime.now(jst).strftime("%Y-%m-%d %H:%M:%S")
    blocks = {
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": "📞 *放棄呼（Abandoned）を検知しました*"}},
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*切断日時*\n{timestamp}"},
                    {"type": "mrkdwn", "text": f"*発信者番号*\n{customer_number_disp}"},
                    {"type": "mrkdwn", "text": f"*待機キュー*\n{queue_name}"},
                    {"type": "mrkdwn", "text": f"*宛先サービス*\n*{service_name}*"},
                ],
            },
        ]
    }
    url = "https://slack.com/api/chat.postMessage"
    headers = {"Authorization": "Bearer " + SLACK_BOT_TOKEN, "Content-Type": "application/json; charset=utf-8"}
    data = {"channel": SLACK_CHANNEL_ID, "blocks": blocks["blocks"]}
    resp = requests.post(url, headers=headers, data=json.dumps(data))
    resp.raise_for_status()

# ===== Lambda handler =====
def lambda_handler(event, context):
    details = event.get("detail", {}) or {}

    event_type = details.get("eventType")
    initiation = details.get("initiationMethod")
    initial_id = details.get("initialContactId") or details.get("contactId") or ""
    contact_id = details.get("contactId")
    role = (details.get("participantRole") or "").upper()
    agent = details.get("agentInfo") or {}
    qinfo = details.get("queueInfo") or {}

    # 1) 早期イベントでキャッシュ
    if initiation == "INBOUND" and event_type in ("INITIATED", "QUEUED"):
        _cache_put(initial_id, _extract_quick_fields(details))
        return {"status": "cached", "eventType": event_type}

    # 2) CONNECTED（どのレッグでも）で通話成立フラグ
    if initiation == "INBOUND" and event_type == "CONNECTED":
        _cache_merge_agent_connected(initial_id, True)
        _cache_put(initial_id, _extract_quick_fields(details))
        return {"status": "cached_connected", "agent_role": role or "unknown"}

    # 3) DISCONNECTED / INBOUND 以外は対象外
    if not (event_type == "DISCONNECTED" and initiation == "INBOUND"):
        return {"status": "skip_non_target"}

    # キューに到達していない（IVR 離脱など）は対象外
    if not qinfo:
        return {"status": "skip_not_queued"}

    # 子レッグ（agent leg など）は対象外
    if contact_id and initial_id and contact_id != initial_id:
        return {"status": "skip_child_leg"}

    # 役割が来ていれば CUSTOMER のみ対象
    if role and role != "CUSTOMER":
        return {"status": f"skip_role_{role}"}

    # disconnectReason が来ていれば CUSTOMER_DISCONNECT のみ
    reason = details.get("disconnectReason")
    if reason and reason != "CUSTOMER_DISCONNECT":
        return {"status": f"skip_reason_{reason}"}

    # 重複抑止（initialContactId 単位）
    if not _dedup_once(initial_id):
        return {"status": "duplicate"}

    # 最終統合（DescribeContact での顧客番号補完を含む）
    final = _finalize_fields(details)

    # エージェント応答済みは通知しない
    if (agent.get("agentArn") or agent.get("username")) or final.get("agent_connected"):
        return {"status": "skip_answered", "initialContactId": initial_id}

    # Slack 通知（発信者番号は customer_number_disp）
    _send_slack(
        service_name=final["service_name"],
        queue_name=final["queue_name"],
        customer_number_disp=final["customer_number_disp"],
    )
    return {
        "status": "notified",
        "initialContactId": initial_id,
        "role": role or "unknown",
        "reason": reason or "unknown",
        "queue": final["queue_name"],
    }
