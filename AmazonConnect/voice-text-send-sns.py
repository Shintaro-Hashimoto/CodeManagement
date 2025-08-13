# voice-text-send-slack.py

import json
import os
import urllib
import requests
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone, timedelta

print('Loading function')

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# 環境変数からSlackの情報を取得
SLACK_BOT_TOKEN = os.environ['SLACK_BOT_TOKEN']
SLACK_CHANNEL_ID = os.environ['SLACK_CHANNEL_ID']


def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    filename_no_extension = os.path.splitext(key)[0]
    
    table_name = "connect-voice-mail"
    dynamotable = dynamodb.Table(table_name)
    res = dynamotable.get_item(Key={"JobID": filename_no_extension})
    item = res["Item"]
    phone_number = item["PhoneNumber"]

    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        body = response['Body'].read()
        data = json.loads(body)
        trans_text = data['results']['transcripts'][0]['transcript']
        
        slack_payload = create_slack_block(phone_number, trans_text)
        
    except Exception as e:
        print(e)
        raise e
        
    res = forward_slack_message(slack_payload)
        
    return res

def forward_slack_message(block_payload):
    """Slack API (chat.postMessage) を使ってメッセージを送信する"""
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

    except requests.exceptions.RequestException as e:
        print(f"Error sending message to Slack: {e}")
        raise

    return { 
        'statusCode': 200,
        'body': json.dumps('Message sent to Slack successfully!')
    }

def create_slack_block(phone_number, transcript_text):
    """メッセージの見た目を作成する関数"""
    if phone_number and phone_number.startswith('+81') and len(phone_number) > 3:
        formatted_phone_number = '0' + phone_number[3:]
    elif phone_number and phone_number.startswith('81') and len(phone_number) > 2:
        formatted_phone_number = '0' + phone_number[2:]
    else:
        formatted_phone_number = phone_number

    jst = timezone(timedelta(hours=+9), 'JST')
    current_time_jst = datetime.now(jst)
    formatted_datetime = current_time_jst.strftime('%Y/%m/%d %H:%M:%S')

    payload = {
        "blocks": [
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "*【着信】ボイスメールが登録されました*"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*受信日時*\n{formatted_datetime}"},
                    {"type": "mrkdwn", "text": f"*電話番号*\n{formatted_phone_number}"}
                ]
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*メッセージ内容*\n>>> {transcript_text}"}
            }
        ]
    }
    return payload