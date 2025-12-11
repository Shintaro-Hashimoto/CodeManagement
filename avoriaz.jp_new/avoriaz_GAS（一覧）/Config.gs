// ==========================================================
// Config.gs - 閲覧アプリ用設定
// ==========================================================

// 予約データが入っているスプレッドシートのID (既存のConfigと同じID)
const TARGET_SPREADSHEET_ID = '1kOgnZj7vsmxfzfGn0O_8LSlw0JafSpk0USSYDEsZz1A'; 

// シート名定義
const SHEET_NAME_RESERVATION = '05_Reservations_Pool'; // 予約データ
const SHEET_NAME_INVENTORY   = '02_Inventory';         // 部屋マスタ
const SHEET_NAME_CUSTOMER    = '01_Customers';         // 顧客マスタ

// 表示期間設定
const PAST_DAYS = 10;   // 過去何日まで表示するか
const FUTURE_DAYS = 90; // 未来何日まで表示するか
