// ==========================================================
// Config.gs - 設定・定数
// ==========================================================

// AppSheetのデータソースであるスプレッドシートID
const TARGET_SPREADSHEET_ID = '1kOgnZj7vsmxfzfGn0O_8LSlw0JafSpk0USSYDEsZz1A'; 

// ★ メール送信履歴用のスプレッドシートID
const LOG_SPREADSHEET_ID = '1tTt_NG7Oxrzv7-Wo79QV7jvUW5H6paNgjK91lgVNikQ';

// シート名
const SHEET_NAME_CUSTOMER = '01_Customers'; 
const SHEET_NAME_RESERVATION = '05_Reservations_Pool';
const SHEET_NAME_OCCUPANCY = '07_Occupancy';
const SHEET_NAME_MAIL_LOG = '送信履歴';
const SHEET_NAME_INQUIRY = '14_Inquiries';

// ウェブ予約メールの送信元アドレス
const CF7_SENDER_EMAIL = 'info@avoriaz.jp'; 

// 検索クエリ (楽天メールのみ対象)
const SEARCH_QUERY = `to:info@avoriaz.jp subject:"楽天トラベル" OR (from:${CF7_SENDER_EMAIL} (subject:"AVORIAZ【HP予約_" OR subject:"AVORIAZ【HPお問い合わせ】")) is:unread`;

// 施設情報
const FACILITY_NAME = "ロッジ アボリア";
const FACILITY_ADDRESS = "〒386-2211 長野県須坂市仁礼峰の原高原3153-166 Lodge AVORIAZ";
const FACILITY_WEB = "https://www.avoriaz.jp";