import boto3
import os
import json
import time
import urllib3
from datetime import datetime, timezone, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from urllib.parse import unquote_plus

# --- グローバル設定 ---
s3_client = boto3.client('s3')
secrets_manager_client = boto3.client('secretsmanager')
http = urllib3.PoolManager()

# ★★★★★ 修正点 ★★★★★
# ご指定の正しいフォルダIDに対応表を更新
DRIVE_FOLDER_MAPPING = {
    "qls_attendance_and_departure_": {
        "id": "1G5dSYx73TdWsGfpKOksCwaV3hYBiSeed",
        "name": "勤怠"
    },
    "lemon_hiyarihatto_": {
        "id": "1pPJ7avjUTFN6IuVekRURTN5ozff1nMpi",
        "name": "ヒヤリハット"
    },
    "lemon_incidents_": {
        "id": "1na0G-3k-21B4nwqBCoPSRyqwJi2tBkZI", # ← 正しいIDに修正
        "name": "事故記録"
    },
    "lemon_complaints_": {
        "id": "1pK2Vb_n39viLQK_trtNBqSji7e0nRDrj",
        "name": "苦情報告"
    },
    "lemon_": {
        "id": "1-JdOXqFZWNcf72RBQfdiqtVv1DJ8CNsa",
        "name": "園児データ"
    }
}
# ★★★★★★★★★★★★★★★

# ==============================================================================
# ■ Slack通知担当関数
# ==============================================================================
def post_hybrid_message(bot_token, channel_id, title_prefix, file_name, status, details):
    if not bot_token or not channel_id:
        print("SlackのボットトークンまたはチャンネルIDが設定されていません。")
        return

    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    
    status_map = { "正常終了": {"text": "Success", "color": "#36a64f"}, "実行エラー": {"text": "Failure", "color": "#e01e5a"} }
    current_status = status_map.get(status, {"text": "Unknown", "color": "#808080"})
    status_text = current_status["text"]
    color = current_status["color"]
    
    main_title = f"CSVファイル取込: {file_name}"

    payload = {
        "channel": channel_id,
        "text": "【Lemon/QLSデータ：CSVファイル取込】 実行結果",
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {"type": "section", "text": {"type": "mrkdwn", "text": f"*{main_title}*"}},
                    {"type": "section", "fields": [
                        {"type": "mrkdwn", "text": f"*実行日時:*\n{exec_time}"},
                        {"type": "mrkdwn", "text": f"*ステータス:*\n{status_text}"}
                    ]},
                    {"type": "divider"},
                    {"type": "section", "text": {"type": "mrkdwn", "text": f"*詳細:*\n```{details}```"}}
                ]
            }
        ]
    }
    
    try:
        api_url = 'https://slack.com/api/chat.postMessage'
        headers = {'Content-Type': 'application/json; charset=utf-8', 'Authorization': f'Bearer {bot_token}'}
        encoded_msg = json.dumps(payload).encode('utf-8')
        resp = http.request('POST', api_url, body=encoded_msg, headers=headers)
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ メイン関数
# ==============================================================================
def lambda_handler(event, context):
    
    slack_bot_token = ""
    slack_channel_id = ""
    title_prefix = "【Lemon/QLSデータ】"

    try:
        token_secret = secrets_manager_client.get_secret_value(SecretId="slack/bot-token")
        slack_bot_token = token_secret['SecretString']
        channel_secret = secrets_manager_client.get_secret_value(SecretId="slack/channel-id")
        slack_channel_id = channel_secret['SecretString']
        google_secret = secrets_manager_client.get_secret_value(SecretId="google/drive-api-credentials")
        service_account_info = json.loads(google_secret['SecretString'])
    except Exception as e:
        print(f"AWS Secrets Managerからの認証情報取得に失敗しました: {e}")
        return {'statusCode': 500, 'body': 'Failed to get credentials.'}

    file_name = "N/A"
    s3_path = "N/A"
    try:
        time.sleep(10)
        
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        s3_path = f"s3://{bucket_name}/{s3_key}"
        
        if not s3_key.startswith('dt='):
            return {'statusCode': 200, 'body': 'Skipped file due to prefix mismatch.'}

        file_name = os.path.basename(s3_key)
        
        destination_folder_info = None
        for prefix, info in DRIVE_FOLDER_MAPPING.items():
            if file_name.startswith(prefix):
                destination_folder_info = info
                break
        
        if destination_folder_info is None:
            raise ValueError(f"ファイル名 '{file_name}' に一致する保存先が見つかりません。")

        destination_folder_id = destination_folder_info['id']

        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)
        local_path = f'/tmp/{file_name}'
        s3_client.download_file(bucket_name, s3_key, local_path)
        
        file_metadata = {'name': file_name, 'parents': [destination_folder_id]}
        media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
        file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
        drive_file_id = file.get('id')
        
        drive_folder_name = destination_folder_info.get('name', 'N/A')
        success_details = (
            f"✅ S3 Path: {s3_path}\n"
            f"✅ {drive_folder_name}（{drive_file_id}）"
        )
        post_hybrid_message(slack_bot_token, slack_channel_id, title_prefix, file_name, "正常終了", success_details)
            
        return {'statusCode': 200, 'body': json.dumps(f'Successfully processed {s3_key}')}

    except Exception as e:
        print(f"[ERROR] 処理中にエラーが発生しました: {e}")
        error_details = (
            f"❌ S3 Path: {s3_path}\n"
            f"❌ Error: {e}"
        )
        post_hybrid_message(slack_bot_token, slack_channel_id, title_prefix, file_name, "実行エラー", error_details)
        raise e
