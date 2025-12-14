/**
 * ===================================================================
 * スケジュール一括作成機能 (Batch Creation)
 * ===================================================================
 */

/**
 * 1. 定期スケジュール追加時に呼び出される関数
 * 90日分の「レッスン枠」と「参加予約」を一括作成し、カレンダーにも登録する
 * @param {string} teikiID - 定期スケジュールマスタの定期ID
 */
function createScheduleBatch(teikiID) {
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

    // レッスン枠データの準備
    const lessonData = lessonSheet.getDataRange().getValues();
    const lessonHeaders = lessonData.shift() || [];
    const lessonDateIndex = lessonHeaders.indexOf("レッスン日");
    const lessonKoushiIndex = lessonHeaders.indexOf("講師ID");
    const lessonJikanmeiIndex = lessonHeaders.indexOf("時間名");
    const lessonIDIndex = lessonHeaders.indexOf("レッスン枠ID");

    // 定期スケジュールの取得
    const scheduleData = findRowData(teikiSheet, teikiID, 1);
    if (!scheduleData) return "ERROR: Schedule not found: " + teikiID;

    const koushiID = scheduleData["担当講師ID"];
    const shisetsuID = scheduleData["施設ID"];
    const youbiStr = scheduleData["曜日"];
    const targetDayOfWeek = youbiToNumber(youbiStr);
    const startDate = new Date(scheduleData["契約開始日"]);
    const endDate = scheduleData["契約終了日"] ? new Date(scheduleData["契約終了日"]) : null;
    const sankaClass = scheduleData["参加クラス"];
    const teikiJikanmei = scheduleData["時間名"];
    
    // 90日ループ
    for (let i = 0; i < 90; i++) {
      let currentDate = new Date(startDate.getTime());
      currentDate.setDate(startDate.getDate() + i);

      // 平日チェック & 終了日チェック
      const day = currentDate.getDay();
      if (day === 0 || day === 6) continue;
      if (endDate && currentDate > endDate) break; 

      // 祝日チェック
      const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (holidays.includes(dateStr)) continue;

      if (day === targetDayOfWeek) {
        
        timetableData.forEach(function(timeRow) {
          const jikanmei = timeRow.時間名;
          let lessonID = findLessonSlot(
            lessonData, currentDate, koushiID, jikanmei, 
            lessonDateIndex, lessonKoushiIndex, lessonJikanmeiIndex, lessonIDIndex
          );

          // 枠がなければ作成
          if (!lessonID) {
            lessonID = getShortId();
            const newLessonRow = [
              lessonID,
              koushiID,
              currentDate,
              jikanmei
            ];
            lessonSheet.appendRow(newLessonRow);
            lessonData.push(newLessonRow);
          }

          // 該当時間の予約を作成
          if (jikanmei === teikiJikanmei) {
            const resData = {
              レッスン日: currentDate,
              施設ID: shisetsuID,
              講師ID: koushiID,
              時間名: jikanmei,
              参加クラス: sankaClass
            };
            
            // カレンダー連携
            const calEventId = addEventToCorporateCalendar(resData, shisetsuData, houjinData, timeRow, koushiData);

            yoyakuSheet.appendRow([
              getShortId(), // 予約ID
              lessonID,     // レッスン枠ID
              shisetsuID,   // 施設ID
              "予約済",     // ステータス
              sankaClass,   // 参加クラス
              currentDate,  // [コピー]レッスン日
              jikanmei,     // [コピー]時間名
              koushiID,     // [コピー]講師ID
              calEventId    // カレンダーイベントID
            ]);
          }
        });
      }
    }
    return "SUCCESS: Batch creation completed for " + teikiID;
  } catch (e) {
    return "ERROR: " + e;
  }
}

/**
 * 2. 講師追加時に呼び出される関数
 * 90日分の「レッスン枠」のみを一括作成する（祝日スキップ対応）
 * @param {string} koushiID - 講師マスタの講師ID
 */
function createInitialLessonSlots_Triggered(koushiID) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const lecturerSheet = ss.getSheetByName("講師マスタ");
    const lessonSheet = ss.getSheetByName("レッスン枠");
    const timetableSheet = ss.getSheetByName("時間割マスタ");
    const holidaySheet = ss.getSheetByName("祝日マスタ");

    const timetables = sheetToObjects(timetableSheet);
    const existingLessons = sheetToObjects(lessonSheet);
    const holidayData = sheetToObjects(holidaySheet);
    
    // 祝日リスト
    const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));

    const lecturer = findRowData(lecturerSheet, koushiID, 1);
    if (!lecturer) return "ERROR: Lecturer not found";

    if (!lecturer.勤務曜日 || !lecturer.契約開始日) {
       return "WARN: Missing schedule info";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contractStartDate = new Date(lecturer.契約開始日);
    const startDate = (contractStartDate > today) ? contractStartDate : today;
    const endDate = lecturer.契約終了日 ? new Date(lecturer.契約終了日) : null;

    let createdCount = 0;
    let newRows = [];

    for (let i = 0; i < 90; i++) {
      let currentDate = new Date(startDate.getTime());
      currentDate.setDate(startDate.getDate() + i);
      
      const day = currentDate.getDay();
      if (day === 0 || day === 6) continue; // 土日スキップ

      const currentDayOfWeekStr = youbiToNumber_reverse(day);
      
      if (endDate && currentDate > endDate) continue;
      
      // 祝日チェック
      const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (holidays.includes(dateStr)) continue;

      // 勤務曜日チェック
      if (!lecturer.勤務曜日.includes(currentDayOfWeekStr)) continue;

      for (const timetable of timetables) {
        // 重複チェック
        const isDuplicate = existingLessons.some(lesson => 
          new Date(lesson.レッスン日).getTime() === currentDate.getTime() &&
          lesson.講師ID === lecturer.講師ID &&
          lesson.時間名 === timetable.時間名
        );

        if (!isDuplicate) {
          newRows.push([
            getShortId(),
            lecturer.講師ID,
            currentDate,
            timetable.時間名
          ]);
          createdCount++;
        }
      }
    }

    if (newRows.length > 0) {
      // 4列分書き込み (ID, 講師ID, 日付, 時間名)
      lessonSheet.getRange(lessonSheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
      return "SUCCESS: Created " + createdCount + " slots";
    } else {
      return "SUCCESS: No slots needed";
    }
    
  } catch (e) {
    return "ERROR: " + e;
  }
}