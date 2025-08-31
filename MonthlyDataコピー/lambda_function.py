import boto3
import os
import json
import urllib3
from datetime import datetime, timezone, timedelta

# --- グローバル設定 ---
s3_client = boto3.client('s3')
secrets_manager_client = boto3.client('secretsmanager')
http = urllib3.PoolManager()

# ファイル名とGoogle Driveフォルダ情報の対応表
DRIVE_FOLDER_MAPPING = {
    "lemon_": { "id": "1-JdOXqFZWNcf72RBQfdiqtVv1DJ8CNsa", "name": "園児データ" },
    "lemon_complaints_": { "id": "1pK2Vb_n39viLQK_trtNBqSji7e0nRDrj", "name": "苦情報告" },
    "lemon_hiyarihatto_": { "id": "1pPJ7avjUTFN6IuVekRURTN5ozff1nMpi", "name": "ヒヤリハット" },
    "lemon_incidents_": { "id": "1pPJ7avjUTFN6IuVekRURTN5ozff1nMpi", "name": "事故記録" },
    "qls_attendance_and_departure_": { "id": "1G5dSYx73TdWsGfpKOksCwaV3hYBiSeed", "name": "勤怠" }
}

# ==============================================================================
# ■ Slack通知担当関数
# ==============================================================================
def post_summary_message(bot_token, channel_id, title_prefix, status, details_list):
    """処理結果のサマリーをSlackに通知する"""
    if not bot_token or not channel_id:
        return

    jst = timezone(timedelta(hours=+9), 'JST')
    exec_time = datetime.now(jst).strftime('%Y/%m/%d %H:%M:%S')
    
    status_map = { "正常終了": {"text": "Success", "color": "#36a64f"}, "実行エラー": {"text": "Failure", "color": "#e01e5a"} }
    current_status = status_map.get(status, {"text": "Unknown", "color": "#808080"})
    
    # 処理結果のリストを改行で連結して、詳細メッセージを作成
    details_text = "\n".join(details_list)

    payload = {
        "channel": channel_id,
        "text": f"{title_prefix} バッチ処理実行結果",
        "attachments": [
            {
                "color": current_status["color"],
                "blocks": [
                    {"type": "section", "text": {"type": "mrkdwn", "text": f"*{title_prefix}*"}},
                    {"type": "section", "fields": [
                        {"type": "mrkdwn", "text": f"*実行日時:*\n{exec_time}"},
                        {"type": "mrkdwn", "text": f"*ステータス:*\n{current_status['text']}"}
                    ]},
                    {"type": "divider"},
                    {"type": "section", "text": {"type": "mrkdwn", "text": f"*詳細:*\n```{details_text}```"}}
                ]
            }
        ]
    }
    
    try:
        api_url = 'https://slack.com/api/chat.postMessage'
        headers = {'Content-Type': 'application/json; charset=utf-8', 'Authorization': f'Bearer {bot_token}'}
        encoded_msg = json.dumps(payload).encode('utf-8')
        http.request('POST', api_url, body=encoded_msg, headers=headers)
    except Exception as e:
        print(f"Slack通知送信エラー: {e}")

# ==============================================================================
# ■ メイン関数 (バッチ処理ロジック)
# ==============================================================================
def lambda_handler(event, context):
    
    slack_bot_token, slack_channel_id, service_account_info = "", "", {}
    title_prefix = "【Lemon/QLSデータ：CSV一括取込】"

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

    # 処理結果を保存するリスト
    results_list = []
    has_error = False

    try:
        # --- 処理対象のS3フォルダを決定 ---
        jst = timezone(timedelta(hours=+9), 'JST')
        today = datetime.now(jst)
        # 実行日時点のYYYY-MM-01形式の日付フォルダを対象とする
        target_date_str = today.strftime('%Y-%m-01')
        s3_bucket = "lemon-society-data-download-production"
        s3_prefix = f"dt={target_date_str}/"

        print(f"処理対象フォルダ: s3://{s3_bucket}/{s3_prefix}")
        
        # --- Google Drive 認証 ---
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=['https://www.googleapis.com/auth/drive'])
        drive_service = build('drive', 'v3', credentials=creds)

        # --- S3フォルダ内の全CSVファイルを処理 ---
        response = s3_client.list_objects_v2(Bucket=s3_bucket, Prefix=s3_prefix)
        if 'Contents' not in response:
            raise FileNotFoundError(f"S3フォルダ '{s3_prefix}' にファイルが見つかりません。")

        for obj in response['Contents']:
            s3_key = obj['Key']
            file_name = os.path.basename(s3_key)
            
            if not file_name.endswith('.csv'):
                continue

            try:
                # --- ファイル名から保存先フォルダ情報を決定 ---
                destination_folder_info = None
                for prefix, info in DRIVE_FOLDER_MAPPING.items():
                    if file_name.startswith(prefix):
                        destination_folder_info = info
                        break
                
                if destination_folder_info is None:
                    raise ValueError("一致する保存先定義が見つかりません。")

                destination_folder_id = destination_folder_info['id']
                
                # --- ファイルのコピー処理 ---
                local_path = f'/tmp/{file_name}'
                s3_client.download_file(s3_bucket, s3_key, local_path)
                
                file_metadata = {'name': file_name, 'parents': [destination_folder_id]}
                media = MediaFileUpload(local_path, mimetype='text/csv', resumable=True)
                file = drive_service.files().create(
                    body=file_metadata, media_body=media, fields='id', supportsAllDrives=True).execute()
                drive_file_id = file.get('id')
                
                # 成功結果をリストに追加
                drive_folder_name = destination_folder_info.get('name', 'N/A')
                results_list.append(f"✅ {file_name} -> {drive_folder_name} ({drive_file_id})")

            except Exception as file_e:
                # ファイルごとのエラーを記録
                print(f"[ERROR] ファイル '{file_name}' の処理中にエラー: {file_e}")
                results_list.append(f"❌ {file_name} -> Error: {file_e}")
                has_error = True

        # --- 最終的なサマリーをSlackに通知 ---
        final_status = "実行エラー" if has_error else "正常終了"
        post_summary_message(slack_bot_token, slack_channel_id, title_prefix, final_status, results_list)
            
        return {'statusCode': 200, 'body': json.dumps('Batch process completed.')}

    except Exception as e:
        print(f"[FATAL ERROR] 処理全体で致命的なエラーが発生しました: {e}")
        # 致命的なエラーが発生した場合も通知
        results_list.append(f"❌ 致命的なエラーが発生しました: {e}")
        post_summary_message(slack_bot_token, slack_channel_id, title_prefix, "実行エラー", results_list)
        raise e