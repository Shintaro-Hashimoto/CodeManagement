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
# ■ Slack通知担当関数 (lemon-qlsプロジェクトと共通の新しい形式)
# ==============================================================================
def post_hybrid_message(bot_token, channel_id, title_prefix, file_name, status, details):
    """Block KitとAttachmentsを組み合わせたハイブリッド形式で通知を送信する"""
    if not bot_token or not channel_id:
        print("SlackのボットトークンまたはチャンネルIDが設定されていません。")
        return

    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    
    status_map = {
        "正常終了": {"text": "Success", "color": "#36a64f"},
        "実行エラー": {"text": "Failure", "color": "#e01e5a"}
    }
    current_status = status_map.get(status, {"text": "Unknown", "color": "#808080"})
    status_text = current_status["text"]
    color = current_status["color"]
    
    main_title = f"CSVファイル取込: {file_name}"

    payload = {
        "channel": channel_id,
        "text": f"{title_prefix} 実行結果",
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
        print(f"Slack通知送信結果: {resp.status}")
        print(f"Slack APIからのレスポンス: {resp.data.decode('utf-8')}")
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ メイン関数 (tokaiプロジェクトのロジック)
# ==============================================================================
def lambda_handler(event, context):
    
    slack_bot_token = ""
    slack_channel_id = ""
    title_prefix = "【東海市勤怠データ】"

    try:
        # --- (修正) 新しい方式でSlack認証情報を取得 ---
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
        time.sleep(10) # 10秒待機
        
        # --- S3イベント解析 (tokaiプロジェクトのロジック) ---
        bucket_name = event['Records'][0]['s3']['bucket']['name']
        s3_key = unquote_plus(event['Records'][0]['s3']['object']['key'])
        s3_path = f"s3://{bucket_name}/{s3_key}"
        file_name = os.path.basename(s3_key)
        
        s3_path_parts = os.path.dirname(s3_key).split('/')
        
        # --- Google Drive 認証 & フォルダ作成 (tokaiプロジェクトのロジック) ---
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)

        parent_folder_id = os.environ['DRIVE_ROOT_FOLDER_ID']
        for folder_name in s3_path_parts:
            parent_folder_id = get_or_create_folder(drive_service, folder_name, parent_folder_id)
        
        destination_folder_id = parent_folder_id
        
        # --- S3からダウンロード & Google Driveへアップロード (tokaiプロジェクトのロジック) ---
        local_path = f'/tmp/{file_name}'
        s3_client.download_file(bucket_name, s3_key, local_path)
        
        file_metadata = {'name': file_name, 'parents': [destination_folder_id]}
        media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
        file = drive_service.files().create(
            body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
        drive_file_id = file.get('id')
        
        # --- (修正) 新しい方式で成功通知 ---
        success_details = (
            f"✅ S3 Path: {s3_path}\n"
            f"✅ Google Drive File ID: {drive_file_id}"
        )
        post_hybrid_message(slack_bot_token, slack_channel_id, title_prefix, file_name, "正常終了", success_details)
            
        return {'statusCode': 200, 'body': json.dumps(f'Successfully processed {s3_key}')}

    except Exception as e:
        print(f"[ERROR] 処理中にエラーが発生しました: {e}")
        # --- (修正) 新しい方式で失敗通知 ---
        error_details = (
            f"❌ S3 Path: {s3_path}\n"
            f"❌ Error: {e}"
        )
        post_hybrid_message(slack_bot_token, slack_channel_id, title_prefix, file_name, "実行エラー", error_details)
        raise e