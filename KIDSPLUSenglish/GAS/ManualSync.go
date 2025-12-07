/**
 * 手動実行用：既存の未来の予約をカレンダーに一括登録する
 */
function syncExistingReservations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ"); // ★追加

  const yoyakuData = sheetToObjects(yoyakuSheet);
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const timetableData = sheetToObjects(timetableSheet);
  const koushiData = sheetToObjects(koushiSheet); // ★追加

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const range = yoyakuSheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  const colIndex_EventId = headers.indexOf("カレンダーイベントID");

  if (colIndex_EventId === -1) {
    Logger.log("エラー: 'カレンダーイベントID' 列が見つかりません。");
    return;
  }

  let count = 0;

  for (let i = 0; i < yoyakuData.length; i++) {
    const row = yoyakuData[i];
    const lessonDate = new Date(row.レッスン日);
    const eventId = row.カレンダーイベントID;

    if (lessonDate >= today && row.ステータス === "予約済" && !eventId) {
      
      const timeInfo = timetableData.find(t => t.時間名 === row.時間名);

      if (timeInfo) {
        const resData = {
          レッスン日: lessonDate,
          施設ID: row.施設ID,
          講師ID: row.講師ID,
          時間名: row.時間名,
          参加クラス: row.参加クラス
        };

        // ★修正: koushiDataを渡す
        const newEventId = addEventToCorporateCalendar(resData, shisetsuData, houjinData, timeInfo, koushiData);

        if (newEventId) {
          yoyakuSheet.getRange(i + 2, colIndex_EventId + 1).setValue(newEventId);
          count++;
          Logger.log(`登録完了: ${row.施設ID} - ${lessonDate.toLocaleDateString()}`);
          Utilities.sleep(500); 
        }
      }
    }
  }
  Logger.log(`処理終了: 合計 ${count} 件の予約をカレンダーに同期しました。`);
}