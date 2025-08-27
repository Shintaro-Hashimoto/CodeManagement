# ==============================================================================
# 必要なライブラリをすべてインポート
# ==============================================================================
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

# ==============================================================================
# グローバル設定：クライアントを初期化
# ==============================================================================
s3_client = boto3.client('s3')
secrets_manager_client = boto3.client('secretsmanager')
http = urllib3.PoolManager()

# ==============================================================================
# ■ send_slack_notification 関数（Slack通知担当）
# ==============================================================================
def send_slack_notification(webhook_url, status, file_name, details=""):
    """Slackに実行結果を通知する (最終確定版 v2)"""
    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    
    color = "#36a64f" if status == "Success" else "#d50000"
    status_icon = "✅" if status == "Success" else "❌"
    
    # 詳細セクションのテキストをステータスに応じて組み立て
    if status == "Success":
        details_text = f"*詳細*\n{status_icon} {file_name} を取り込みました\n```{details}```"
    else:
        details_text = f"*詳細*\n{status_icon} {file_name} の処理に失敗しました\n```{details}```"

    # Slackに送信するメッセージを最終デザインで構築
    slack_message = {
        "text": "【enスケジューラ：CSVファイル取込】実行結果",
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": { "type": "mrkdwn", "text": "*AWS S3 to Google Drive*" }
                    },
                    {
                        "type": "section",
                        "fields": [
                            { "type": "mrkdwn", "text": f"*実行日時*\n{exec_time}" },
                            { "type": "mrkdwn", "text": f"*ステータス*\n{status}" }
                        ]
                    },
                    {
                        "type": "section",
                        "text": { "type": "mrkdwn", "text": details_text }
                    }
                ]
            }
        ]
    }
    
    try:
        encoded_msg = json.dumps(slack_message).encode('utf-8')
        resp = http.request('POST', webhook_url, body=encoded_msg, headers={'Content-Type': 'application/json'})
        print(f"Slack通知送信結果: {resp.status}")
        print(f"Slack APIからのレスポンス: {resp.data.decode('utf-8')}")
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ lambda_handler 関数（メイン処理担当）
# ==============================================================================
def lambda_handler(event, context):
    
    # --- 事前準備: Slack Webhook URLを取得 ---
    slack_webhook_url = ""
    try:
        webhook_secret = secrets_manager_client.get_secret_value(SecretId="slack/webhook-url")
        slack_webhook_url = webhook_secret['SecretString']
    except Exception as e:
        print(f"Slack Webhook URLの取得に失敗しました: {e}")
    
    # --- メイン処理 ---
    file_name = "N/A"
    try:
        # ファイル書き込み完了を待つため、60秒間待機する
        print("ファイル書き込み完了を待機します... (30秒)")
        time.sleep(30)
        print("待機完了。処理を再開します。")
        
        # S3イベントからファイル情報を取得
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        file_name = os.path.basename(s3_key)
        
        if '/old/' in s3_key:
            print(f"処理済みフォルダ内のファイルのためスキップします: {s3_key}")
            return {'statusCode': 200, 'body': 'Skipped file in old folder.'}
        
        # Google認証情報を取得
        google_secret = secrets_manager_client.get_secret_value(SecretId="google/drive-api-credentials")
        service_account_info = json.loads(google_secret['SecretString'])
        
        # S3からファイルをダウンロード
        local_path = f'/tmp/{file_name}'
        s3_client.download_file(bucket_name, s3_key, local_path)
        
        # Google Driveへアップロード
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = {'name': file_name, 'parents': [os.environ['DRIVE_FOLDER_ID']]}
        media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
        file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
        drive_file_id = file.get('id')
        
        # S3内でファイルを移動
        old_s3_key = os.path.join(os.path.dirname(s3_key), 'old', file_name)
        s3_client.copy_object(CopySource={'Bucket': bucket_name, 'Key': s3_key}, Bucket=bucket_name, Key=old_s3_key)
        s3_client.delete_object(Bucket=bucket_name, Key=s3_key)
        
        # 成功通知
        if slack_webhook_url:
            success_details = f"Google Drive File ID: {drive_file_id}"
            send_slack_notification(slack_webhook_url, "Success", file_name, success_details)
            
        return {'statusCode': 200, 'body': json.dumps(f'Successfully processed {s3_key}')}

    except Exception as e:
        print(f"[ERROR] 処理中にエラーが発生しました: {e}")
        # 失敗通知
        if slack_webhook_url:
            send_slack_notification(slack_webhook_url, "Failure", file_name, str(e))
        raise e