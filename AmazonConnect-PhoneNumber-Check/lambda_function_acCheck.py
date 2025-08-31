import os
import boto3
import csv
import io
import json
import requests
from datetime import datetime, timezone, timedelta

# --- 環境変数から設定値を取得 ---
S3_BUCKET = os.environ['S3_BUCKET_NAME']
S3_KEY = os.environ['S3_FILE_KEY']
SLACK_BOT_TOKEN = os.environ.get('SLACK_BOT_TOKEN')
SLACK_CHANNEL_ID = os.environ.get('SLACK_CHANNEL_ID')

# --- AWSサービスクライアントの初期化 ---
s3_client = boto3.client('s3')

# --- Slack 通知関数 ---

def create_slack_block_for_blocklist(phone_number, reason):
    """着信ブロック通知用のSlackメッセージ（Block Kit）を作成する"""
    # 電話番号のフォーマットを日本の0から始まる形式に変換
    if phone_number and phone_number.startswith('+81') and len(phone_number) > 3:
        formatted_phone_number = '0' + phone_number[3:]
    else:
        formatted_phone_number = phone_number

    # JST（日本標準時）の現在時刻を取得
    jst = timezone(timedelta(hours=+9), 'JST')
    current_time_jst = datetime.now(jst)
    formatted_datetime = current_time_jst.strftime('%Y/%m/%d %H:%M:%S')

    payload = {
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": "*【着信ブロック通知】*"}},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*受信日時*\n{formatted_datetime}"},
                    {"type": "mrkdwn", "text": f"*電話番号*\n{formatted_phone_number}"}
                ]
            },
            {"type": "divider"},
            # --- ここから変更 ---
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*リストの番号に該当する着信がありました*\n>>> 登録内容：{reason}"
                }
            }
            # --- ここまで変更 ---
        ]
    }
    return payload

def forward_slack_message(block_payload):
    """Slack API (chat.postMessage) を使ってメッセージを送信する"""
    print("Slackにメッセージを送信します。")
    SLACK_API_URL = "https://slack.com/api/chat.postMessage"
    
    headers = {
        "Authorization": "Bearer " + SLACK_BOT_TOKEN,
        "Content-Type": "application/json; charset=utf-8"
    }
    
    data_to_send = {
        "channel": SLACK_CHANNEL_ID,
        "blocks": block_payload["blocks"]
    }

    try:
        response = requests.post(SLACK_API_URL, headers=headers, data=json.dumps(data_to_send))
        response.raise_for_status()
        response_json = response.json()
        if not response_json.get("ok"):
            raise Exception(f"Slack API Error: {response_json.get('error')}")
        print("Slackへのメッセージ送信に成功しました。")
    except requests.exceptions.RequestException as e:
        print(f"Slackへのメッセージ送信中にエラーが発生しました: {e}")
        raise

# --- メインハンドラ ---

def lambda_handler(event, context):
    customer_number = event['Details']['ContactData']['CustomerEndpoint']['Address']
    print(f"Checking number: {customer_number}")

    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=S3_KEY)
        csv_content = response['Body'].read().decode('utf-8')
        
        csv_reader = csv.reader(io.StringIO(csv_content))
        number_dict = {row[0]: row[1] for row in csv_reader if len(row) >= 2}

        if customer_number in number_dict:
            reason = number_dict[customer_number]
            print(f"Number {customer_number} is IN the list. Reason: {reason}")
            
            try:
                slack_payload = create_slack_block_for_blocklist(customer_number, reason)
                forward_slack_message(slack_payload)
            except Exception as e:
                print(f"ERROR sending Slack notification: {e}")

            return {
                'isListed': 'true',
                'reason': reason
            }
        else:
            print(f"Number {customer_number} is NOT in the list.")
            return {
                'isListed': 'false',
                'reason': ''
            }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'isListed': 'false',
            'reason': 'error'
        }