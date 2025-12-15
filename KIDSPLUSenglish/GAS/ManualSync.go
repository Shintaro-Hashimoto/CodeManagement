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

/**
 * 手動実行用：キャンセル済みの予約で、カレンダーIDが残っているものを削除・クリアする
 * (今日以降の予約を対象)
 */
function cleanupCancelledReservations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  
  // ★追加: カレンダーIDを特定するために講師マスタが必要
  const koushiSheet = ss.getSheetByName("講師マスタ"); 
  const koushiData = sheetToObjects(koushiSheet); 

  const yoyakuData = yoyakuSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;

  // ヘッダーを除いてループ
  for (let i = 1; i < yoyakuData.length; i++) {
    const row = yoyakuData[i];
    
    // 列の定義 (A=0, C=2, D=3, F=5, I=8, J=9, K=10)
    const reservationId = row[0];
    const facilityId    = row[2];
    const status        = row[3];
    const koushiId      = row[4];       // ★確認: 講師IDの列番号 (E列=4 と仮定しています。違えば修正してください)
    const lessonDate    = new Date(row[5]);
    
    const eventId       = row[8];       // I列: 法人カレンダーID
    const masterEventId = row[9];       // J列: マスターカレンダーID
    const koushiEventId = row[10];      // ★追加: K列: 講師カレンダーイベントID

    // 条件: 「今日以降」かつ「キャンセル済」かつ「いずれかのカレンダーIDが残っている」
    // ★修正: koushiEventId もチェック対象に追加
    if (lessonDate >= today && status === "キャンセル済" && (eventId || masterEventId || koushiEventId)) {
      
      Logger.log(`削除対象発見: 行${i + 1} / 予約ID:${reservationId} / 講師ID:${koushiId}`);

      // Calendar.gs の削除関数を呼び出し
      if (typeof deleteEventFromCalendars === 'function') {
        // ★修正: 講師イベントID と 講師ID(またはマスタデータ) を渡す必要があります
        // ※ deleteEventFromCalendars 側も、引数を4つ以上受け取れるよう修正が必要です
        deleteEventFromCalendars(eventId, masterEventId, facilityId, koushiEventId, koushiId, koushiData);
      } else {
        Logger.log("エラー: deleteEventFromCalendars 関数が見つかりません。");
        return;
      }

      // スプレッドシートのIDセルをクリア
      yoyakuSheet.getRange(i + 1, 9).setValue("");  // I列
      yoyakuSheet.getRange(i + 1, 10).setValue(""); // J列
      yoyakuSheet.getRange(i + 1, 11).setValue(""); // ★ここだけ実行されていて、上の関数に渡っていなかったのが原因です

      count++;
      Utilities.sleep(500);
    }
  }

  Logger.log(`クリーンアップ完了: 計 ${count} 件のキャンセル漏れを処理しました。`);
}