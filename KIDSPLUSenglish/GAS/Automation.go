/**
 * ===================================================================
 * AppSheet連携用 自動処理機能 (Automation.gs) - ステータス連動版
 * ===================================================================
 */

/**
 * ★AppSheet Automationから呼び出す関数
 * 指定した施設の「解約・キャンセル処理」を一括実行する
 */
function runCancellationAutomation(facilityId, dateStr) {
  Logger.log(`[Automation] 解約処理開始: ${facilityId} / 解約日: ${dateStr}`);

  if (!facilityId || !dateStr) {
    return "ERROR: パラメータが不足しています";
  }

  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0); // 時間をリセット

  // 1. 未来の予約をキャンセル＆カレンダー削除
  const cancelResult = cancelReservations_(facilityId, targetDate);
  
  // 2. 定期スケジュールの契約終了日を設定＆ステータス更新
  const stopResult = stopRegularSchedules_(facilityId, targetDate);

  return `SUCCESS: 予約キャンセル(${cancelResult}件) / 定期停止(${stopResult}件)`;
}

/**
 * 内部関数: 予約のキャンセル実行
 */
function cancelReservations_(facilityId, targetDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const data = yoyakuSheet.getDataRange().getValues();
  let count = 0;

  if (typeof deleteEventFromCalendars !== 'function') {
    Logger.log("ERROR: Calendar.gs が見つかりません");
    return 0;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rId = row[0];        // A: 予約ID
    const fId = row[2];        // C: 施設ID
    const status = row[3];     // D: ステータス
    const lDate = new Date(row[5]); // F: レッスン日
    const eId = row[8];        // I: 法人CalID
    const mId = row[9];        // J: マスターCalID

    if (fId === facilityId && status === "予約済" && lDate >= targetDate) {
      deleteEventFromCalendars(eId, mId, fId, rId);
      yoyakuSheet.getRange(i + 1, 4).setValue("キャンセル済");
      count++;
    }
  }
  Logger.log(`-> 予約キャンセル完了: ${count}件`);
  return count;
}

/**
 * 内部関数: 定期スケジュールの契約終了日を設定 & ステータスを「解約済」に
 */
function stopRegularSchedules_(facilityId, targetDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const teikiSheet = ss.getSheetByName("定期スケジュール");
  const data = teikiSheet.getDataRange().getValues();
  const headers = data[0];
  
  const colIdx_Facility = headers.indexOf("施設ID");
  const colIdx_EndDate = headers.indexOf("契約終了日");
  // ★追加: ステータス列を探す (列名は「ステータス」または「AutomationStatus」に合わせてください)
  let colIdx_Status = headers.indexOf("ステータス");
  if (colIdx_Status === -1) colIdx_Status = headers.indexOf("Status");

  if (colIdx_Facility === -1 || colIdx_EndDate === -1) {
    Logger.log("ERROR: 定期スケジュールの列が見つかりません");
    return 0;
  }

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const fId = data[i][colIdx_Facility];
    
    if (fId === facilityId) {
      // 終了日を設定
      teikiSheet.getRange(i + 1, colIdx_EndDate + 1).setValue(targetDate);
      
      // ★追加: ステータス列があれば「解約済」に更新
      if (colIdx_Status !== -1) {
        teikiSheet.getRange(i + 1, colIdx_Status + 1).setValue("解約済");
      }
      
      count++;
    }
  }
  Logger.log(`-> 定期スケジュール停止: ${count}件`);
  return count;
}