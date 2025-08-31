import os
import json
import boto3
import gspread
import pandas as pd
from io import StringIO
from google.oauth2.service_account import Credentials

# --- 環境変数 ---
SECRET_NAME = os.environ['GOOGLE_SECRET_NAME']
SPREADSHEET_ID = os.environ['SPREADSHEET_ID']
TARGET_BUCKET = os.environ['TARGET_S3_BUCKET']
TARGET_KEY = os.environ['TARGET_S3_KEY']
SHEET_NAME = "シート1" # スプレッドシートのシート名を指定

# --- AWSサービスクライアント ---
secrets_manager = boto3.client('secretsmanager')
s3_client = boto3.client('s3')

def get_google_credentials():
    """Secrets ManagerからGoogleの認証情報を取得する"""
    print("Secrets ManagerからGoogle認証情報を取得します。")
    try:
        response = secrets_manager.get_secret_value(SecretId=SECRET_NAME)
        secret_string = response['SecretString']
        return json.loads(secret_string)
    except Exception as e:
        print(f"Secrets Managerからの認証情報取得に失敗しました: {e}")
        raise

def normalize_phone_number(phone):
    """電話番号を+81形式に正規化する（先頭の0が消えている場合にも対応）"""
    if not isinstance(phone, str):
        phone = str(phone)
    if not phone:
        return ""
    
    # すでに+81形式の場合はそのまま返す
    if phone.startswith('+81'):
        return phone
    # 先頭が'0'で始まる場合は、'0'を'+81'に置換
    if phone.startswith('0'):
        return '+81' + phone[1:]
    # 上記以外（先頭の'0'が消えていると想定される）場合は、そのまま先頭に'+81'を付与
    return '+81' + phone

def lambda_handler(event, context):
    print("処理を開始します。")
    try:
        # 1. Google認証情報を取得
        creds_json = get_google_credentials()
        # 共有ドライブ対応のため、drive.readonlyスコープも追加
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ]
        creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
        gc = gspread.authorize(creds)
        print("Google APIへの認証に成功しました。")

        # 2. スプレッドシートからデータを取得
        spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet(SHEET_NAME)
        values = worksheet.get_all_values()
        if len(values) <= 1: # ヘッダー行のみ、または完全に空の場合
            print("スプレッドシートにデータがありません。空のファイルをS3に配置します。")
            s3_client.put_object(Bucket=TARGET_BUCKET, Key=TARGET_KEY, Body="")
            return {'statusCode': 200, 'body': 'No data found. Empty file created.'}
        
        # ヘッダーとデータ本体を分離
        header = values[0]
        records = values[1:]
        print(f"{len(records)}件のデータをスプレッドシートから取得しました。")

        # 3. データをPandas DataFrameに変換し、電話番号を正規化
        df = pd.DataFrame(records, columns=header)
        
        # 1列目の列名を取得して、その列の電話番号を正規化
        phone_column_name = df.columns[0]
        df[phone_column_name] = df[phone_column_name].astype(str).apply(normalize_phone_number)
        print("電話番号の正規化が完了しました。")

        # 4. DataFrameをCSV形式の文字列に変換
        csv_buffer = StringIO()
        df.to_csv(csv_buffer, header=False, index=False)
        csv_content = csv_buffer.getvalue()

        # 5. S3にCSVファイルをアップロード
        s3_client.put_object(
            Bucket=TARGET_BUCKET,
            Key=TARGET_KEY,
            Body=csv_content,
            ContentType='text/csv'
        )
        print(f"S3バケット '{TARGET_BUCKET}' に '{TARGET_KEY}' としてファイルをアップロードしました。")
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Successfully synced spreadsheet to S3.')
        }

    except Exception as e:
        print(f"処理中にエラーが発生しました: {e}")
        raise e

