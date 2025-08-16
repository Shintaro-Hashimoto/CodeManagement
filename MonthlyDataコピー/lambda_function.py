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

# ファイル名とGoogle DriveフォルダIDの対応表
DRIVE_FOLDER_MAPPING = {
    "lemon_": "1-JdOXqFZWNcf72RBQfdiqtVv1DJ8CNsa",
    "lemon_complaints_": "1pK2Vb_n39viLQK_trtNBqSji7e0nRDrj",
    "lemon_hiyarihatto_": "1pPJ7avjUTFN6IuVekRURTN5ozff1nMpi",
    "lemon_incidents_": "1na0G-3k-21B4nwqBCoPSRyqwJi2tBkZI",
    "qls_attendance_and_departure_": "1G5dSYx73TdWsGfpKOksCwaV3hYBiSeed"
}

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
        "text": "【Lemon/QLSデータ：CSVファイル取込】実行結果",
        "attachments": [
            {"color": color, "blocks": [{"type": "section", "text": { "type": "mrkdwn", "text": "*S3 to Google Drive (lemon-qls)*" }},{"type": "section", "fields": [{ "type": "mrkdwn", "text": f"*実行日時*\n{exec_time}" },{ "type": "mrkdwn", "text": f"*ステータス*\n{status}" }]},{"type": "section", "text": { "type": "mrkdwn", "text": details_text }}]}
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
        print("ファイル生成を待機します... (10秒)")
        time.sleep(10)
        print("待機完了。処理を再開します。")
        # ★★★★★★★★★★★★★★★
        
        # --- S3イベント解析 ---
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        
        # S3トリガーの問題を回避するため、コード側でプレフィックスを確認
        if not s3_key.startswith('dt='):
            print(f"ファイルパスが 'dt=' で始まらないため、処理をスキップします: {s3_key}")
            return {'statusCode': 200, 'body': 'Skipped file due to prefix mismatch.'}

        file_name = os.path.basename(s3_key)
        
        # --- ファイル名から保存先フォルダIDを決定 ---
        destination_folder_id = None
        for prefix, folder_id in DRIVE_FOLDER_MAPPING.items():
            if file_name.startswith(prefix):
                destination_folder_id = folder_id
                break
        
        if destination_folder_id is None:
            raise ValueError(f"ファイル名 '{file_name}' に一致する保存先が見つかりません。")

        # --- Google Drive 認証 ---
        google_secret = secrets_manager_client.get_secret_value(SecretId=os.environ['GOOGLE_SECRET_NAME'])
        service_account_info = json.loads(google_secret['SecretString'])
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)

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