/**
 * ===================================================================
 * 毎日自動更新用スクリプト (91日目の予定追加)
 * ===================================================================
 */

/**
 * 毎日実行Bot用関数
 * 今日から90日後の日付をチェックし、契約曜日なら1日分だけ作成する
 * (祝日チェック、カレンダー登録含む)
 * @param {string} teikiID - 定期スケジュールマスタの定期ID
 */
function createDailyMaintenance(teikiID) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const teikiSheet = ss.getSheetByName("定期スケジュール");
    const lessonSheet = ss.getSheetByName("レッスン枠");
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const timetableSheet = ss.getSheetByName("時間割マスタ");
    
    // マスタ読み込み
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const houjinSheet = ss.getSheetByName("法人マスタ");
    const koushiSheet = ss.getSheetByName("講師マスタ");
    const holidaySheet = ss.getSheetByName("祝日マスタ");

    const shisetsuData = sheetToObjects(shisetsuSheet);
    const houjinData = sheetToObjects(houjinSheet);
    const koushiData = sheetToObjects(koushiSheet);
    const timetableData = sheetToObjects(timetableSheet);
    const holidayData = sheetToObjects(holidaySheet);

    // 祝日リスト作成
    const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));

    const scheduleData = findRowData(teikiSheet, teikiID, 1);
    if (!scheduleData) return "ERROR: Schedule not found";

    // ターゲット日付（今日から90日後）を計算
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 90); 
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy/MM/dd");

    // ★祝日チェック: 祝日ならスキップ
    if (holidays.includes(targetDateStr)) {
      return "SKIP: Holiday (" + targetDateStr + ")";
    }

    // 契約期間チェック
    const startDate = new Date(scheduleData["契約開始日"]);
    startDate.setHours(0, 0, 0, 0);
    const endDate = scheduleData["契約終了日"] ? new Date(scheduleData["契約終了日"]) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    if (targetDate < startDate) return "SKIP: Before start date";
    if (endDate && targetDate > endDate) return "SKIP: After end date";

    // 曜日チェック
    const targetDayOfWeek = youbiToNumber(scheduleData["曜日"]);
    const day = targetDate.getDay();
    
    if (day === 0 || day === 6) return "SKIP: Weekend"; // 土日はスキップ
    if (day !== targetDayOfWeek) return "SKIP: Day mismatch";

    // レッスン枠データの準備
    const lessonData = lessonSheet.getDataRange().getValues();
    const lessonHeaders = lessonData.shift() || [];
    const lessonDateIndex = lessonHeaders.indexOf("レッスン日");
    const lessonKoushiIndex = lessonHeaders.indexOf("講師ID");
    const lessonJikanmeiIndex = lessonHeaders.indexOf("時間名");
    const lessonIDIndex = lessonHeaders.indexOf("レッスン枠ID");

    const teikiJikanmei = scheduleData["時間名"];
    const koushiID = scheduleData["担当講師ID"];

    // 既存のレッスン枠を検索
    let lessonID = findLessonSlot(
      lessonData, targetDate, koushiID, teikiJikanmei, 
      lessonDateIndex, lessonKoushiIndex, lessonJikanmeiIndex, lessonIDIndex
    );
    
    // 枠がなければ作成
    if (!lessonID) {
      lessonID = getShortId();
      lessonSheet.appendRow([
        lessonID,
        koushiID,
        targetDate,
        teikiJikanmei
        // false (予約ありフラグ) は書き込まない
      ]);
    }

    const timeRow = timetableData.find(t => t.時間名 === teikiJikanmei);
    
    // カレンダー登録用データ
    const resData = {
      レッスン日: targetDate,
      施設ID: scheduleData["施設ID"],
      講師ID: koushiID,
      時間名: teikiJikanmei,
      参加クラス: scheduleData["参加クラス"]
    };
    
    // カレンダー連携実行 (講師情報 koushiData も渡す)
    const calEventId = addEventToCorporateCalendar(resData, shisetsuData, houjinData, timeRow, koushiData);

    // 参加予約を作成
    yoyakuSheet.appendRow([
      getShortId(),
      lessonID,
      scheduleData["施設ID"],
      "予約済",
      scheduleData["参加クラス"],
      targetDate,    // [コピー]レッスン日
      teikiJikanmei, // [コピー]時間名
      koushiID,      // [コピー]講師ID
      calEventId     // カレンダーイベントID
    ]);

    return "SUCCESS: Created for " + targetDateStr;

  } catch (e) {
    return "ERROR: " + e;
  }
}