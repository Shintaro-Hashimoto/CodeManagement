/**
 * ===================================================================
 * キャンセル専用Webアプリ (doGet / doPost) - 最終完全版
 * ===================================================================
 */

function doGet(e) {
  const mode = e.parameter.mode; // "monthly" か 指定なし(単発) か

  // --- A. 月次一括確認モード ---
  if (mode === "monthly") {
    return handleMonthlyView(e);
  }

  // --- B. 単発キャンセルモード (メールリンクからの遷移) ---
  return handleSingleView(e);
}

/**
 * 単発キャンセル画面の処理
 */
function handleSingleView(e) {
  const id = e.parameter.id;
  if (!id) return createHtmlOutput("エラー: 予約IDが指定されていません。");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const timeSheet = ss.getSheetByName("時間割マスタ");

  // 予約データを検索
  const rowData = findRowData(yoyakuSheet, id, 1);
  
  if (!rowData) {
    return createHtmlOutput("エラー: 指定された予約が見つかりません。<br>すでにキャンセルされたか、IDが間違っています。");
  }

  if (rowData["ステータス"] === "キャンセル済") {
    return createHtmlOutput("この予約はすでにキャンセルされています。");
  }

  // 施設名を検索
  const shisetsuData = findRowData(shisetsuSheet, rowData["施設ID"], 1);
  const facilityName = shisetsuData ? shisetsuData["施設名"] : "不明な施設";

  // HTMLテンプレート準備
  const template = HtmlService.createTemplateFromFile("Index");
  template.reservation = rowData;
  template.id = id;
  template.facilityName = facilityName;
  
  // 日時整形
  const dateStr = Utilities.formatDate(new Date(rowData["レッスン日"]), Session.getScriptTimeZone(), "yyyy/MM/dd (E)");
  const timeData = findRowData(timeSheet, rowData["時間名"], 1);
  let timeStr = rowData["時間名"];
  if (timeData) {
    const start = Utilities.formatDate(new Date(timeData["開始時間"]), Session.getScriptTimeZone(), "HH:mm");
    const end = Utilities.formatDate(new Date(timeData["終了時間"]), Session.getScriptTimeZone(), "HH:mm");
    timeStr += ` (${start} - ${end})`;
  }
  
  template.dateDisplay = dateStr;
  template.timeDisplay = timeStr;

  return template.evaluate()
    .setTitle("レッスンキャンセル確認")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 月次スケジュール確認画面の処理
 */
function handleMonthlyView(e) {
  const facilityId = e.parameter.fid; // 施設ID
  const targetMonth = e.parameter.ym; // "2025-12" 形式

  if (!facilityId || !targetMonth) return createHtmlOutput("エラー: パラメータが不足しています。");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const timeSheet = ss.getSheetByName("時間割マスタ");

  // 施設名取得
  const shisetsu = findRowData(shisetsuSheet, facilityId, 1);
  const facilityName = shisetsu ? shisetsu["施設名"] : "不明な施設";

  // 予約データ取得
  const yoyakuData = sheetToObjects(yoyakuSheet);
  const timetableData = sheetToObjects(timeSheet);
  
  // 対象月の予約を抽出
  const targetReservations = yoyakuData.filter(r => {
    const d = new Date(r.レッスン日);
    const ym = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM");
    return r.施設ID === facilityId && ym === targetMonth && r.ステータス === "予約済";
  });

  // 日付順にソート
  targetReservations.sort((a, b) => new Date(a.レッスン日) - new Date(b.レッスン日));

  // 曜日変換マップ (漢字表示用)
  const dayMap = ["日", "月", "火", "水", "木", "金", "土"];

  // 表示用データの作成
  const viewData = targetReservations.map(r => {
    const d = new Date(r.レッスン日);
    const ymd = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const dayIndex = d.getDay();
    const dStr = `${ymd} (${dayMap[dayIndex]})`; // 漢字の曜日

    const t = timetableData.find(tm => tm.時間名 === r.時間名);
    let tStr = r.時間名;
    if (t) {
      const s = Utilities.formatDate(new Date(t.開始時間), Session.getScriptTimeZone(), "HH:mm");
      const e = Utilities.formatDate(new Date(t.終了時間), Session.getScriptTimeZone(), "HH:mm");
      tStr = `${s} - ${e}`;
    }
    return {
      id: r.予約ID,
      displayDate: dStr,
      displayTime: tStr
    };
  });

  const template = HtmlService.createTemplateFromFile("Monthly");
  template.facilityName = facilityName;
  template.targetMonthStr = targetMonth;
  template.reservations = viewData;

  return template.evaluate()
    .setTitle("翌月のスケジュール確認")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 単発キャンセル実行関数 (クライアント側から呼ばれる)
 */
function processCancel(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const historySheet = ss.getSheetByName("変更履歴");
    
    const data = yoyakuSheet.getDataRange().getValues();
    let rowIndex = -1;
    let shisetsuId = "";
    let eventId = ""; 
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id) {
        rowIndex = i + 1; 
        shisetsuId = data[i][2]; 
        // カレンダーイベントID (列位置は要確認、I列=9列目ならインデックス8)
        if (data[i].length > 8) eventId = data[i][8]; 
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: "予約が見つかりません。" };

    // ステータス更新
    yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");

    // カレンダー削除連携
    if (eventId && typeof deleteEventFromCorporateCalendar === 'function') {
      deleteEventFromCorporateCalendar(eventId, shisetsuId);
    }

    // 履歴記録
    historySheet.appendRow([
      getShortId(), id, new Date(), "Webキャンセル機能", "メールリンクよりキャンセル実行"
    ]);

    return { success: true };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 月次一括キャンセル実行関数 (クライアント側から呼ばれる)
 */
function processMonthlyUpdate(cancelIds) {
  if (!cancelIds || cancelIds.length === 0) {
    return { success: true, message: "変更はありませんでした。" };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const historySheet = ss.getSheetByName("変更履歴");
    const data = yoyakuSheet.getDataRange().getValues();
    
    const idMap = new Map();
    for (let i = 1; i < data.length; i++) {
      idMap.set(data[i][0].toString(), i + 1);
    }

    let updatedCount = 0;

    cancelIds.forEach(id => {
      const rowIndex = idMap.get(id);
      if (rowIndex) {
        yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");
        
        const shisetsuId = data[rowIndex-1][2];
        let eventId = "";
        if (data[rowIndex-1].length > 8) eventId = data[rowIndex-1][8];

        if (eventId && typeof deleteEventFromCorporateCalendar === 'function') {
          deleteEventFromCorporateCalendar(eventId, shisetsuId);
        }

        historySheet.appendRow([
          getShortId(), id, new Date(), "Web月次確認", "チェック除外によるキャンセル"
        ]);
        updatedCount++;
      }
    });

    return { success: true, count: updatedCount };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * シンプルなメッセージ表示用HTML生成関数
 */
function createHtmlOutput(msg) {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: sans-serif; padding: 20px; text-align: center; color: #333; background-color: #f4f4f4; }
          .container { background: #fff; padding: 30px 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          p { margin: 0; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>${msg}</p>
        </div>
      </body>
    </html>
  `).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}