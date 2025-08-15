import base64
import boto3
import google.auth
import google.auth.transport.requests
import json
import os
import re
import urllib.parse
from google.cloud import aiplatform

# --- 設定値 ---
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
TARGET_DATES_STR = os.environ.get('TARGET_DATES', '')
GCP_PROJECT_ID = "haneda-parking-468805"
GCP_LOCATION = "asia-northeast1"
MODEL_NAME = "gemini-1.5-flash-001"
# ----------------

# AWSクライアントを初期化
s3_client = boto3.client('s3')
sns_client = boto.client('sns')
secrets_client = boto3.client('secretsmanager')

# --- GCP認証情報の読み込み ---
print("Fetching GCP credentials from AWS Secrets Manager...")
gcp_credentials_secret = secrets_client.get_secret_value(SecretId="gcp/gemini-credentials")
gcp_credentials_json = json.loads(gcp_credentials_secret['SecretString'])
credentials, project_id = google.auth.load_credentials_from_dict(gcp_credentials_json)
print("Successfully loaded GCP credentials.")

# --- Vertex AIクライアントの初期化 ---
aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION, credentials=credentials)

# ★★★ ここが修正箇所です ★★★
# ModelServiceClientの初期化時に、認証情報を明示的に渡す
model_service_client_options = {"api_endpoint": f"{GCP_LOCATION}-aiplatform.googleapis.com"}
model = aiplatform.gapic.ModelServiceClient(
    credentials=credentials,
    client_options=model_service_client_options
)
# ★★★ ここまでが修正箇所です ★★★


def analyze_image_with_gemini(image_bytes, lot_name):
    # (この関数の中身は変更ありません)
    print(f"Analyzing image for {lot_name} with Gemini model {MODEL_NAME}...")
    prompt = f"""
    これは羽田空港駐車場の予約カレンダーのスクリーンショットです。
    画像の中から「{lot_name}」と書かれたカレンダーのみを注意深く分析してください。
    背景が緑色または白色になっている日付は「空きあり」です。
    「空きあり」と判断した日付の数字を、JSON形式の数値リストとして返してください。
    例: [11, 12, 24, 25]
    もし空きが一つも見つからなければ、空のリスト [] を返してください。
    赤色や灰色の日は無視してください。
    """
    encoded_content = base64.b64encode(image_bytes).decode("utf-8")
    instance = {"contents": [{"role": "user", "parts": [{"text": prompt}, {"inline_data": {"mime_type": "image/png", "data": encoded_content}}]}]}
    endpoint = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/publishers/google/models/{MODEL_NAME}"
    response = model.predict(endpoint=endpoint, instances=[instance])
    gemini_response_text = response.predictions[0]['content']
    print(f"Gemini raw response: {gemini_response_text}")
    json_match = re.search(r'\[(.*?)\]', gemini_response_text, re.DOTALL)
    if json_match:
        try:
            available_dates = json.loads(json_match.group(0))
            return sorted([int(d) for d in available_dates])
        except (json.JSONDecodeError, ValueError):
            print("Error: Gemini response was not valid JSON or contained non-numbers.")
            return []
    return []

def lambda_handler(event, context):
    # (この関数の中身は変更ありません)
    try:
        bucket, key = event['Records'][0]['s3']['bucket']['name'], urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        filename = os.path.basename(key)
        if not filename.lower().startswith('analysis-image-'): return
            
        lot = "P3";
        if "p2" in filename: lot = "P2"

        s3_object = s3_client.get_object(Bucket=bucket, Key=key)
        all_available_dates = analyze_image_with_gemini(s3_object['Body'].read(), lot)
        print(f"Gemini analysis found available dates: {all_available_dates}")

        subject, message, dates_to_notify = "", "", []
        message_intro, message_link_text = "", ""
        
        if TARGET_DATES_STR:
            target_dates = {int(d.strip()) for d in TARGET_DATES_STR.split(',') if d.strip()}
            matched_dates = sorted(list(set(all_available_dates) & target_dates))
            if matched_dates:
                dates_to_notify, subject = matched_dates, f"【ターゲット検知/Gemini】羽田空港駐車場 {lot}で空き発見！"
                message_intro, message_link_text = "監視対象の日にちで駐車場の空きを検知！", "▼予約サイト（至急！）"
        else:
            if all_available_dates:
                dates_to_notify, subject = all_available_dates, f"【空き検知/Gemini】羽田空港駐車場 {lot}"
                message_intro, message_link_text = f"羽田空港 {lot} 駐車場に空きが検知されました。", "▼予約サイト"

        if dates_to_notify:
            month_str = ""
            match = re.search(r'_(\d{4})-(\d{2})\.png', filename)
            if match: month_str = match.group(2).lstrip('0')
            if month_str: dates_str = "\n".join([f"{month_str}/{day}　空きあり" for day in dates_to_notify])
            else: dates_str = "\n".join([f"{day}日　空きあり" for day in dates_to_notify])
            message = (f"{message_intro}\n\n▼空きのある日付\n{dates_str}\n\n{message_link_text}\nhttps://hnd-rsv.aeif.or.jp/airport2/app/toppage\n")
            print(f"Notification will be sent for dates: {dates_to_notify}")
            if SNS_TOPIC_ARN:
                sns_client.publish(TopicArn=SNS_TOPIC_ARN, Message=message, Subject=subject)
                print("Notification sent to SNS.")
        else:
            print("No dates to notify.")

        return {'statusCode': 200, 'body': json.dumps({'notified_dates': dates_to_notify})}
    except Exception as e:
        print(f"Error processing event: {e}")
        raise e