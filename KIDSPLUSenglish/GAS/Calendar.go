/**
 * ===================================================================
 * Googleカレンダー連携機能 (法人 & マスター 同時同期版)
 * ===================================================================
 */

// ★★★ マスターカレンダーID ★★★
const MASTER_CALENDAR_ID = "c_3899a395a62dfa0e33d68ba02a330895e62c55e35e772c97f6c30694718601f4@group.calendar.google.com";

/**
 * 1. 未登録の予約を検知してカレンダー(法人＆マスター)に同期する関数
 * ※トリガー設定推奨: 「時間主導型」で「10分おき」などに設定してください
 */
function syncNewReservations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");

  // 全データ取得
  const yoyakuData = yoyakuSheet.getDataRange().getValues();
  
  // マスタ類をオブジェクト化 (検索高速化)
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const timetableData = sheetToObjects(timetableSheet);
  const koushiData = sheetToObjects(koushiSheet);

  // ヘッダー行を除くループ
  for (let i = 1; i < yoyakuData.length; i++) {
    const row = yoyakuData[i];
    
    // 行データの取得 (列インデックスに注意: A列=0, I列=8, J列=9)
    const reservationId = row[0];
    const facilityId = row[2];
    const status = row[3];
    const lessonDate = new Date(row[5]);
    const timeName = row[6];
    const koushiId = row[7];
    
    const currentEventId = row[8];       // I列: 法人カレンダー用ID
    const currentMasterEventId = row[9]; // J列: マスターカレンダー用ID

    // 「予約済」かつ「どちらかのIDが欠けている」場合のみ処理
    if (status === "予約済" && (!currentEventId || !currentMasterEventId)) {
      
      // 1. 必要な情報を取得・構築
      const shisetsu = shisetsuData.find(s => s.施設ID === facilityId);
      if (!shisetsu) continue;

      const houjin = houjinData.find(h => h.法人ID === shisetsu.法人ID);
      const timeInfo = timetableData.find(t => t.時間名 === timeName);
      if (!timeInfo) continue; // 時間情報エラー

      const koushi = koushiData.find(k => k.講師ID === koushiId);
      const koushiName = koushi ? koushi.講師名 : "未定";

      // 2. 日時セット
      const startTime = new Date(lessonDate);
      const endTime = new Date(lessonDate);
      const tStart = new Date(timeInfo.開始時間);
      const tEnd = new Date(timeInfo.終了時間);
      startTime.setHours(tStart.getHours(), tStart.getMinutes(), 0);
      endTime.setHours(tEnd.getHours(), tEnd.getMinutes(), 0);

      // 3. Meet URL決定ロジック (提供コードより)
      let meetUrl = "";
      if (shisetsu.個別MeetID) {
        meetUrl = "https://meet.google.com/" + shisetsu.個別MeetID;
      } else if (houjin && houjin.法人共通MeetID) {
        meetUrl = "https://meet.google.com/" + houjin.法人共通MeetID;
      }
      const meetingCode = meetUrl.replace("https://meet.google.com/", "").trim();

      // 4. イベント詳細の構築
      const title = `【${shisetsu.施設区分 || 'レッスン'}】${shisetsu.施設名}`;
      const description = `
■施設名: ${shisetsu.施設名}
■区分: ${shisetsu.施設区分 || '-'}
■クラス: ${row[4] || '-'}
■講師: ${koushiName}
■時間: ${timeName}
■会議コード: ${meetingCode}
■Meet URL: ${meetUrl}
      `.trim();

      const options = {
        description: description,
        location: meetUrl
      };

      // --- 書き込み処理開始 ---
      let newEventId = currentEventId;
      let newMasterEventId = currentMasterEventId;

      // A. 法人カレンダーへ登録
      if (!newEventId && houjin && houjin.連携カレンダーID) {
        try {
          const cal = CalendarApp.getCalendarById(houjin.連携カレンダーID);
          if (cal) {
            const event = cal.createEvent(title, startTime, endTime, options);
            newEventId = event.getId();
            Logger.log(`[法人Cal] 作成完了: ${shisetsu.施設名}`);
          }
        } catch (e) {
          Logger.log(`[法人Cal] エラー: ${e.toString()}`);
        }
      }

      // B. マスターカレンダーへ登録
      if (!newMasterEventId && MASTER_CALENDAR_ID) {
        try {
          const masterCal = CalendarApp.getCalendarById(MASTER_CALENDAR_ID);
          if (masterCal) {
            // マスター用タイトル: 法人名も含めると管理しやすい
            const masterTitle = `[${houjin ? houjin.法人名 : '-'}] ${title}`;
            const event = masterCal.createEvent(masterTitle, startTime, endTime, options);
            newMasterEventId = event.getId();
            Logger.log(`[マスターCal] 作成完了: ${shisetsu.施設名}`);
          }
        } catch (e) {
          Logger.log(`[マスターCal] エラー: ${e.toString()}`);
        }
      }

      // --- スプレッドシート更新 ---
      if (newEventId !== currentEventId || newMasterEventId !== currentMasterEventId) {
        // 行番号は i + 1
        // I列(9列目) = getRange(row, 9)
        // J列(10列目) = getRange(row, 10)
        yoyakuSheet.getRange(i + 1, 9).setValue(newEventId);
        yoyakuSheet.getRange(i + 1, 10).setValue(newMasterEventId);
      }
    }
  }
}

/**
 * 2. 予約キャンセル時にカレンダーから削除する関数
 * (WebApp.gs から呼ばれる)
 * * @param {string} eventId - 法人カレンダーのイベントID (I列)
 * @param {string} masterEventId - マスターカレンダーのイベントID (J列)
 * @param {string} facilityId - 施設ID (法人カレンダー特定用)
 */
function deleteEventFromCalendars(eventId, masterEventId, facilityId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);

  // A. 法人カレンダーから削除
  if (eventId) {
    const shisetsu = shisetsuData.find(s => s.施設ID === facilityId);
    if (shisetsu) {
      const houjin = houjinData.find(h => h.法人ID === shisetsu.法人ID);
      if (houjin && houjin.連携カレンダーID) {
        try {
          const cal = CalendarApp.getCalendarById(houjin.連携カレンダーID);
          const event = cal.getEventById(eventId);
          if (event) {
            event.deleteEvent();
            Logger.log("法人カレンダーから削除: " + eventId);
          }
        } catch (e) {
          Logger.log("法人カレンダー削除エラー: " + e.toString());
        }
      }
    }
  }

  // B. マスターカレンダーから削除
  if (masterEventId && MASTER_CALENDAR_ID) {
    try {
      const masterCal = CalendarApp.getCalendarById(MASTER_CALENDAR_ID);
      const event = masterCal.getEventById(masterEventId);
      if (event) {
        event.deleteEvent();
        Logger.log("マスターカレンダーから削除: " + masterEventId);
      }
    } catch (e) {
      Logger.log("マスターカレンダー削除エラー: " + e.toString());
    }
  }
}