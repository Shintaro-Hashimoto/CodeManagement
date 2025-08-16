import boto3
import os
import json
import time  # timeモジュールをインポート
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

# ==============================================================================
# ■ ヘルパー関数 (Google Driveフォルダ作成担当)
# ==============================================================================
def get_or_create_folder(drive_service, folder_name, parent_id):
    """指定された親フォルダ内にフォルダが存在するか確認し、なければ作成する"""
    query = f"name='{folder_name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    response = drive_service.files().list(q=query, supportsAllDrives=True, includeItemsFromAllDrives=True, fields='files(id, name)').execute()
    files = response.get('files', [])
    
    if files:
        print(f"フォルダ '{folder_name}' は既に存在します。ID: {files[0].get('id')}")
        return files[0].get('id')
    else:
        print(f"フォルダ '{folder_name}' が見つかりません。新規作成します...")
        file_metadata = {
            'name': folder_name,
            'parents': [parent_id],
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = drive_service.files().create(body=file_metadata, supportsAllDrives=True, fields='id').execute()
        print(f"フォルダを作成しました。ID: {folder.get('id')}")
        return folder.get('id')

# ==============================================================================
# ■ ヘルパー関数 (Slack通知担当)
# ==============================================================================
def send_slack_notification(webhook_url, status, file_name, details=""):
    """Slackに実行結果を通知する"""
    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    color = "#36a64f" if status == "Success" else "#d50000"
    status_icon = "✅" if status == "Success" else "❌"
    
    if status == "Success":
        details_text = f"*詳細*\n{status_icon} {file_name} を取り込みました\n```{details}```"
    else:
        details_text = f"*詳細*\n{status_icon} {file_name} の処理に失敗しました\n```{details}```"

    slack_message = {
        "text": "【東海市勤怠データ：CSVファイル取込】実行結果",
        "attachments": [
            {"color": color, "blocks": [{"type": "section", "text": { "type": "mrkdwn", "text": "*S3 to Google Drive (tokai)*" }},{"type": "section", "fields": [{ "type": "mrkdwn", "text": f"*実行日時*\n{exec_time}" },{ "type": "mrkdwn", "text": f"*ステータス*\n{status}" }]},{"type": "section", "text": { "type": "mrkdwn", "text": details_text }}]}
        ]
    }
    
    try:
        encoded_msg = json.dumps(slack_message).encode('utf-8')
        http.request('POST', webhook_url, body=encoded_msg, headers={'Content-Type': 'application/json'})
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ メイン関数
# ==============================================================================
def lambda_handler(event, context):
    slack_webhook_url = ""
    try:
        webhook_secret = secrets_manager_client.get_secret_value(SecretId=os.environ['SLACK_SECRET_NAME'])
        slack_webhook_url = webhook_secret['SecretString']
    except Exception as e:
        print(f"Slack Webhook URLの取得に失敗: {e}")

    file_name = "N/A"
    try:
        # ★★★★★ 修正点 ★★★★★
        # ファイル書き込み完了を待つため、10秒間待機する
        print("ファイル書き込み完了を待機します... (10秒)")
        time.sleep(10)
        print("待機完了。処理を再開します。")
        # ★★★★★★★★★★★★★★★

        # --- S3イベント解析 ---
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        file_name = os.path.basename(s3_key)
        
        s3_path_parts = os.path.dirname(s3_key).split('/')
        
        # --- Google Drive 認証 ---
        google_secret = secrets_manager_client.get_secret_value(SecretId=os.environ['GOOGLE_SECRET_NAME'])
        service_account_info = json.loads(google_secret['SecretString'])
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)

        # --- Google Drive フォルダ構造の作成 ---
        parent_folder_id = os.environ['DRIVE_ROOT_FOLDER_ID']
        for folder_name in s3_path_parts:
            parent_folder_id = get_or_create_folder(drive_service, folder_name, parent_folder_id)
        
        destination_folder_id = parent_folder_id
        
        # --- S3からダウンロード & Google Driveへアップロード ---
        local_path = f'/tmp/{file_name}'
        s3_client.download_file(bucket_name, s3_key, local_path)
        
        file_metadata = {'name': file_name, 'parents': [destination_folder_id]}
        media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
        file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
        drive_file_id = file.get('id')
        
        # --- 成功通知 ---
        if slack_webhook_url:
            success_details = f"S3 Path: s3://{bucket_name}/{s3_key}\nGoogle Drive File ID: {drive_file_id}"
            send_slack_notification(slack_webhook_url, "Success", file_name, success_details)
            
        return {'statusCode': 200, 'body': json.dumps(f'Successfully processed {s3_key}')}

    except Exception as e:
        print(f"[ERROR] 処理中にエラーが発生しました: {e}")
        if slack_webhook_url:
            send_slack_notification(slack_webhook_url, "Failure", file_name, str(e))
        raise e