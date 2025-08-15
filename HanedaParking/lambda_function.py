import json
import urllib.parse
import boto3
import io
import os
import re
from PIL import Image

# (クライアント初期化などは変更なし)
s3_client = boto3.client('s3')
rekognition_client = boto3.client('rekognition')
sns_client = boto3.client('sns')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
TARGET_DATES_STR = os.environ.get('TARGET_DATES', '')

P2_REGION = {'x_min': 0.05, 'x_max': 0.50, 'y_min': 0.40, 'y_max': 0.80}
P3_REGION = {'x_min': 0.50, 'x_max': 0.95, 'y_min': 0.40, 'y_max': 0.80}

def is_green_or_white(r, g, b):
    is_green = g > r * 1.1 and g > b * 1.1 and g > 60
    is_white = r > 200 and g > 200 and b > 200
    return is_green or is_white

def find_available_dates(bucket, key, target_region):
    available_dates = set()
    print(f"Analyzing text in image: s3://{bucket}/{key}")
    response_text = rekognition_client.detect_text(Image={'S3Object': {'Bucket': bucket, 'Name': key}})
    
    date_texts = {}
    for text in response_text['TextDetections']:
        if text['Type'] == 'WORD' and text['DetectedText'].isdigit() and 1 <= int(text['DetectedText']) <= 31:
            date_texts[text['DetectedText']] = text['Geometry']['BoundingBox']
    
    if not date_texts: 
        print("No date-like text found.")
        return []

    print(f"Rekognition detected {len(date_texts)} numbers. Filtering by target region...")
    s3_object = s3_client.get_object(Bucket=bucket, Key=key)
    image = Image.open(io.BytesIO(s3_object['Body'].read())).convert("RGB")
    img_width, img_height = image.size

    for date, box in date_texts.items():
        center_x = box['Left'] + (box['Width'] / 2)
        center_y = box['Top'] + (box['Height'] / 2)
        
        # ★★★ ここからが診断用のログ ★★★
        region_check_passed = (target_region['x_min'] < center_x < target_region['x_max'] and 
                               target_region['y_min'] < center_y < target_region['y_max'])
        
        print(f"--- Checking date '{date}'. Center coords: (x:{center_x:.3f}, y:{center_y:.3f}). In region? {region_check_passed}")
        # ★★★ ここまでが診断用のログ ★★★
        
        if not region_check_passed:
            continue
            
        px, py = int(center_x * img_width), int(center_y * img_height)
        is_available = False
        offsets = [(0, 0), (0, -2), (0, 2), (-2, 0), (2, 0)]
        for dx, dy in offsets:
            check_x, check_y = px + dx, py + dy
            if 0 <= check_x < img_width and 0 <= check_y < img_height:
                r, g, b = image.getpixel((check_x, check_y))
                if is_green_or_white(r, g, b):
                    is_available = True
                    break
        if is_available:
            available_dates.add(int(date))

    return sorted(list(available_dates))

def lambda_handler(event, context):
    # (このlambda_handler関数の中身はver2.3から変更ありません)
    try:
        bucket, key = event['Records'][0]['s3']['bucket']['name'], urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        filename = os.path.basename(key)
        if not filename.lower().startswith('analysis-image-'): return
        
        lot, target_region = ("P3", P3_REGION)
        if "p2" in key: lot, target_region = ("P2", P2_REGION)
        print(f"Targeting LOT: {lot}")

        all_available_dates = find_available_dates(bucket, key, target_region)
        print(f"All available dates found in {lot} region: {all_available_dates}")

        subject, message, dates_to_notify = "", "", []
        message_intro, message_link_text = "", ""
        
        if TARGET_DATES_STR:
            target_dates = {int(d.strip()) for d in TARGET_DATES_STR.split(',') if d.strip()}
            matched_dates = sorted(list(set(all_available_dates) & target_dates))
            if matched_dates:
                dates_to_notify, subject = matched_dates, f"【ターゲット検知】羽田空港駐車場 {lot}で空き発見！"
                message_intro, message_link_text = "監視対象の日にちで、駐車場の空きを検知しました！", "▼予約サイト（至急！）"
        else:
            if all_available_dates:
                dates_to_notify, subject = all_available_dates, f"【空き検知】羽田空港駐車場 {lot}"
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