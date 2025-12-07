/**
 * ===================================================================
 * Googleカレンダー連携機能 (固定URL & 詳細説明版)
 * ===================================================================
 */

/**
 * 法人カレンダーへの予定追加
 */
function addEventToCorporateCalendar(reservationData, shisetsuData, houjinData, timeData, koushiData) {
  try {
    // 1. 必要な情報を取得
    const shisetsu = shisetsuData.find(s => s.施設ID === reservationData.施設ID);
    if (!shisetsu) return ""; // 施設がない場合はスキップ

    const houjin = houjinData.find(h => h.法人ID === shisetsu.法人ID);
    if (!houjin || !houjin.連携カレンダーID) return ""; // カレンダー設定がない場合はスキップ

    // 講師名の取得
    const koushi = koushiData.find(k => k.講師ID === reservationData.講師ID);
    const koushiName = koushi ? koushi.講師名 : "未定";

    const calendarId = houjin.連携カレンダーID;
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Logger.log("Calendar not found: " + calendarId);
      return ""; 
    }

    // 2. 日時の設定
    const date = new Date(reservationData.レッスン日);
    const startTime = new Date(timeData.開始時間);
    const endTime = new Date(timeData.終了時間);

    const startDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startTime.getHours(), startTime.getMinutes());
    const endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endTime.getHours(), endTime.getMinutes());

    // 3. Meet URLの決定（固定IDを使用）
    let meetUrl = "";
    if (shisetsu.個別MeetID) {
      meetUrl = "https://meet.google.com/" + shisetsu.個別MeetID;
    } else if (houjin.法人共通MeetID) {
      meetUrl = "https://meet.google.com/" + houjin.法人共通MeetID;
    }
    
    // 会議コードの抽出 (表示用)
    const meetingCode = meetUrl.replace("https://meet.google.com/", "").trim();

    // 4. イベント情報の構築
    
    // タイトル: 【保育園】〇〇保育園
    const title = `【${shisetsu.施設区分 || 'レッスン'}】${shisetsu.施設名}`;
    
    // 説明欄: 詳細情報を記載
    const description = `
■施設名: ${shisetsu.施設名}
■区分: ${shisetsu.施設区分 || '-'}
■クラス: ${reservationData.参加クラス || '-'}
■講師: ${koushiName}
■時間: ${reservationData.時間名}
■会議コード: ${meetingCode}
■Meet URL: ${meetUrl}
`.trim();

    // ★★★ カレンダー設定のキモ ★★★
    // locationにURLを入れることで、カレンダー上でクリック可能にします
    const options = {
      description: description,
      location: meetUrl 
    };

    // 5. イベント作成
    const event = calendar.createEvent(title, startDateTime, endDateTime, options);
    
    Logger.log("Calendar event created: " + event.getId());
    return event.getId(); // 作成したイベントIDを返す

  } catch (e) {
    Logger.log("Calendar Error: " + e.toString());
    return "";
  }
}

/**
 * 法人カレンダーからの予定削除
 */
function deleteEventFromCorporateCalendar(eventId, shisetsuId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const houjinSheet = ss.getSheetByName("法人マスタ");
    
    const shisetsuData = sheetToObjects(shisetsuSheet);
    const houjinData = sheetToObjects(houjinSheet);

    const shisetsu = shisetsuData.find(s => s.施設ID === shisetsuId);
    if (!shisetsu) return;

    const houjin = houjinData.find(h => h.法人ID === shisetsu.法人ID);
    if (!houjin || !houjin.連携カレンダーID) return;

    const calendar = CalendarApp.getCalendarById(houjin.連携カレンダーID);
    if (calendar) {
      const event = calendar.getEventById(eventId);
      if (event) {
        event.deleteEvent();
        Logger.log("Calendar event deleted: " + eventId);
      }
    }
  } catch (e) {
    Logger.log("Calendar Delete Error: " + e.toString());
  }
}