import json
import boto3
import os
from datetime import datetime, timezone, timedelta
from google.oauth2 import service_account
import gspread

# ---------------------------------
# AWSクライアントの初期化
# ---------------------------------
secrets_manager_client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')

# ---------------------------------
# 環境変数から設定を読み込み
# ---------------------------------
HISTORY_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME')
LATEST_STATUS_TABLE_NAME = os.environ.get('LATEST_STATUS_TABLE_NAME')
GOOGLE_SECRET_NAME = os.environ.get('GOOGLE_SECRET_NAME')
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'Unknown')

# ---------------------------------
# DynamoDBテーブルのオブジェクト
# ---------------------------------
history_table = dynamodb.Table(HISTORY_TABLE_NAME)
latest_status_table = dynamodb.Table(LATEST_STATUS_TABLE_NAME)

# ---------------------------------
# Reasonを分類する関数
# ---------------------------------
def categorize_reason(reason_text):
    """SendGridのreason文字列を解析して、簡易的な日本語のカテゴリを返す"""
    if not reason_text:
        return "理由不明"

    if reason_text == "Invalid":
        return "メールアドレス形式不正"
    
    lower_reason = reason_text.lower()

    if "does not exist" in lower_reason or "no such user" in lower_reason or "doesn't have a" in lower_reason or "unknown user" in lower_reason:
        return "宛先不明"
    if "bounced address" in lower_reason:
        return "過去にエラーあり"
    if "mailbox unavailable" in lower_reason or "out of storage" in lower_reason or "over quota" in lower_reason:
        return "相手の受信ボックスが一杯"
    if "message too large" in lower_reason or "size exceeded" in lower_reason:
        return "メールサイズ超過"
    if "unrecognized address" in lower_reason or "unable to get mx info" in lower_reason:
        return "無効なドメイン"
    if "non-ascii" in lower_reason:
        return "メールアドレスに無効な文字"
    if "ptr record" in lower_reason or "forward dns" in lower_reason:
        return "送信元サーバー設定不備（PTR）"
    if "spam" in lower_reason or "rejected for policy reasons" in lower_reason or "blocked" in lower_reason:
        return "迷惑メールとして拒否"
    if "timeout" in lower_reason:
        return "相手サーバー無応答（タイムアウト）"
    
    return "その他（テクニカルエラー）"

# ---------------------------------
# Googleスプレッドシートのクライアントを初期化する関数
# ---------------------------------
def get_gspread_client():
    if not GOOGLE_SECRET_NAME:
        print("Error: GOOGLE_SECRET_NAME environment variable is not set.")
        return None
    try:
        google_secret = secrets_manager_client.get_secret_value(SecretId=GOOGLE_SECRET_NAME)
        service_account_info = json.loads(google_secret['SecretString'])
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        creds = service_account.Credentials.from_service_account_info(service_account_info, scopes=scopes)
        client = gspread.authorize(creds)
        return client
    except Exception as e:
        print(f"Failed to initialize Google Sheets client: {e}")
        return None

gspread_client = get_gspread_client()

# ---------------------------------
# メインのLambdaハンドラ
# ---------------------------------
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event))
    try:
        if 'body' in event:
            sendgrid_events = json.loads(event['body'])
        else:
            sendgrid_events = event
        for sg_event in sendgrid_events:
            if 'sg_message_id' in sg_event and 'timestamp' in sg_event and 'event' in sg_event:
                
                # DynamoDBへの書き込み処理
                history_table.put_item(Item={
                    'sg_message_id': sg_event['sg_message_id'],
                    'timestamp': sg_event['timestamp'],
                    'event': sg_event['event'],
                    'email': sg_event.get('email', 'N/A'),
                    'reason': sg_event.get('reason', 'N/A')
                })
                latest_status_table.put_item(Item={
                    'sg_message_id': sg_event['sg_message_id'],
                    'last_updated': sg_event['timestamp'],
                    'latest_status': sg_event['event'],
                    'email': sg_event.get('email', 'N/A'),
                    'reason': sg_event.get('reason', 'N/A')
                })
                
                # Googleスプレッドシートへの書き込み処理
                event_type = sg_event.get('event')
                if event_type in ['bounce', 'dropped'] and gspread_client and SPREADSHEET_ID:
                    try:
                        worksheet = gspread_client.open_by_key(SPREADSHEET_ID).sheet1
                        dt_object_jst = datetime.fromtimestamp(sg_event['timestamp'], timezone(timedelta(hours=+9)))
                        jst_timestamp_str = dt_object_jst.strftime('%Y-%m-%d %H:%M:%S')
                        jst_date_str = dt_object_jst.strftime('%Y/%m/%d')
                        
                        original_reason = sg_event.get('reason', 'N/A')
                        simple_reason = categorize_reason(original_reason)
                        email = sg_event.get('email', 'N/A')

                        # ★★★ ここから新しい処理 ★★★
                        # Emailアドレスからドメインを抽出
                        domain = ''
                        if isinstance(email, str) and '@' in email:
                            domain = email.split('@')[1]
                        # ★★★ 新しい処理ここまで ★★★

                        row_to_append = [
                            jst_timestamp_str,
                            jst_date_str,
                            event_type,
                            email,
                            SERVICE_NAME,
                            simple_reason,
                            original_reason,
                            domain  # H列: Domain
                        ]
                        
                        worksheet.append_row(row_to_append)
                        print(f"Successfully appended to Google Sheet for email: {email}")
                    except Exception as e:
                        print(f"Failed to append to Google Sheet: {e}")
    except Exception as e:
        print(f"Error processing event: {e}")
        return {'statusCode': 500, 'body': json.dumps('Error processing request')}
    return {'statusCode': 200, 'body': json.dumps('Successfully processed event')}