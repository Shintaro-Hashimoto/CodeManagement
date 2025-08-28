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
# ■ post_hybrid_message 関数（Slack通知担当）
# ==============================================================================
def post_hybrid_message(bot_token, channel_id, title, status, details):
    """Block KitとAttachmentsを組み合わせたハイブリッド形式で通知を送信する"""
    if not bot_token or not channel_id:
        print("SlackのボットトークンまたはチャンネルIDが設定されていません。")
        return

    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    
    status_map = {
        "正常終了": {"text": "Success", "color": "#36a64f"},
        "実行エラー": {"text": "Failure", "color": "#e01e5a"},
        "情報": {"text": "Information", "color": "#439fe0"}
    }
    current_status = status_map.get(status, {"text": "Unknown", "color": "#808080"})
    status_text = current_status["text"]
    color = current_status["color"]

    try:
        # ★修正点: タイトルからバッチ名のみを抽出するロジックを更新
        short_title = title.split('：')[1].replace('】', '')
    except IndexError:
        short_title = title

    payload = {
        "channel": channel_id,
        # ★修正点: フォールバックテキストのフォーマットを調整
        "text": f"{title} 実行結果",
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {"type": "section", "text": {"type": "mrkdwn", "text": f"*{short_title}*"}},
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
        print(f"Slack通知送信結果: {resp.status}")
        print(f"Slack APIからのレスポンス: {resp.data.decode('utf-8')}")
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ lambda_handler 関数（メイン処理担当）
# ==============================================================================
def lambda_handler(event, context):
    
    slack_bot_token = ""
    slack_channel_id = ""
    service_account_info = {}
    # ★修正点: 通知タイトルを変更
    title = "【enスケジューラ：AWS S3 to Google Drive】"

    try:
        # --- 事前準備: SlackとGoogleの認証情報を取得 ---
        token_secret = secrets_manager_client.get_secret_value(SecretId="slack/bot-token")
        slack_bot_token = token_secret['SecretString']
        
        channel_secret = secrets_manager_client.get_secret_value(SecretId="slack/channel-id")
        slack_channel_id = channel_secret['SecretString']
        
        google_secret = secrets_manager_client.get_secret_value(SecretId="google/drive-api-credentials")
        service_account_info = json.loads(google_secret['SecretString'])
        
    except Exception as e:
        print(f"AWS Secrets Managerからの認証情報取得に失敗しました: {e}")
        return {'statusCode': 500, 'body': 'Failed to get credentials.'}

    # --- メイン処理 ---
    file_name = "N/A"
    try:
        print("ファイル書き込み完了を待機します... (30秒)")
        time.sleep(30)
        print("待機完了。処理を再開します。")
        
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        file_name = os.path.basename(s3_key)
        
        if '/old/' in s3_key:
            print(f"処理済みフォルダ内のファイルのためスキップします: {s3_key}")
            return {'statusCode': 200, 'body': 'Skipped file in old folder.'}
        
        local_path = f'/tmp/{file_name}'
        s3_client.download_file(bucket_name, s3_key, local_path)
        
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = {'name': file_name, 'parents': [os.environ['DRIVE_FOLDER_ID']]}
        media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
        file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
        drive_file_id = file.get('id')
        
        old_s3_key = os.path.join(os.path.dirname(s3_key), 'old', file_name)
        s3_client.copy_object(CopySource={'Bucket': bucket_name, 'Key': s3_key}, Bucket=bucket_name, Key=old_s3_key)
        s3_client.delete_object(Bucket=bucket_name, Key=s3_key)
        
        success_details = f"✅ {file_name} を取り込みました\nGoogle Drive File ID: {drive_file_id}"
        post_hybrid_message(slack_bot_token, slack_channel_id, title, "正常終了", success_details)
            
        return {'statusCode': 200, 'body': json.dumps(f'Successfully processed {s3_key}')}

    except Exception as e:
        print(f"[ERROR] 処理中にエラーが発生しました: {e}")
        error_details = f"❌ {file_name} の処理に失敗しました\n{e}"
        post_hybrid_message(slack_bot_token, slack_channel_id, title, "実行エラー", error_details)
        raise e
