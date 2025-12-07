function createScheduleBatch(teikiID) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const teikiSheet = ss.getSheetByName("定期スケジュール");
    const lessonSheet = ss.getSheetByName("レッスン枠");
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const timetableSheet = ss.getSheetByName("時間割マスタ");
    
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const houjinSheet = ss.getSheetByName("法人マスタ");
    const koushiSheet = ss.getSheetByName("講師マスタ");
    const holidaySheet = ss.getSheetByName("祝日マスタ"); // ★追加

    const shisetsuData = sheetToObjects(shisetsuSheet);
    const houjinData = sheetToObjects(houjinSheet);
    const koushiData = sheetToObjects(koushiSheet);
    const timetableData = sheetToObjects(timetableSheet);
    const holidayData = sheetToObjects(holidaySheet); // ★追加

    // ★祝日リスト作成 (YYYY/MM/DD形式の配列)
    const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));

    const lessonData = lessonSheet.getDataRange().getValues();
    const lessonHeaders = lessonData.shift() || [];
    const lessonDateIndex = lessonHeaders.indexOf("レッスン日");
    const lessonKoushiIndex = lessonHeaders.indexOf("講師ID");
    const lessonJikanmeiIndex = lessonHeaders.indexOf("時間名");
    const lessonIDIndex = lessonHeaders.indexOf("レッスン枠ID");

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
    
    for (let i = 0; i < 90; i++) {
      let currentDate = new Date(startDate.getTime());
      currentDate.setDate(startDate.getDate() + i);

      const day = currentDate.getDay();
      if (day === 0 || day === 6) continue;
      if (endDate && currentDate > endDate) break; 

      // ★祝日チェック
      const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (holidays.includes(dateStr)) {
        Logger.log("Skip Holiday: " + dateStr);
        continue;
      }

      if (day === targetDayOfWeek) {
        // ... (以下、作成処理は変更なし) ...
        timetableData.forEach(function(timeRow) {
          const jikanmei = timeRow.時間名;
          let lessonID = findLessonSlot(
            lessonData, currentDate, koushiID, jikanmei, 
            lessonDateIndex, lessonKoushiIndex, lessonJikanmeiIndex, lessonIDIndex
          );

          if (!lessonID) {
            lessonID = getShortId();
            const newLessonRow = [lessonID, koushiID, currentDate, jikanmei, false];
            lessonSheet.appendRow(newLessonRow);
            lessonData.push(newLessonRow);
          }

          if (jikanmei === teikiJikanmei) {
            const resData = {
              レッスン日: currentDate,
              施設ID: shisetsuID,
              講師ID: koushiID,
              時間名: jikanmei,
              参加クラス: sankaClass
            };
            const calEventId = addEventToCorporateCalendar(resData, shisetsuData, houjinData, timeRow, koushiData);

            yoyakuSheet.appendRow([
              getShortId(),
              lessonID,
              shisetsuID,
              "予約済",
              sankaClass,
              currentDate,
              jikanmei,
              koushiID,
              calEventId
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

// ... (createInitialLessonSlots_Triggered も同様に holidayData を読み込み、祝日チェックを追加してください) ...