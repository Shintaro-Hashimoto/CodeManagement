/**
 * ===================================================================
 * スケジュール一括作成機能 (Batch Creation) - 定期ID対応版
 * ===================================================================
 */

/**
 * 1. 【AppSheetボタン用】定期スケジュール追加時に実行
 * 90日分の「レッスン枠」を確認・作成し、「参加予約」を作成する
 */
function createScheduleBatch(teikiID) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const teikiSheet = ss.getSheetByName("定期スケジュール");
    const lessonSheet = ss.getSheetByName("レッスン枠");
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const holidaySheet = ss.getSheetByName("祝日マスタ");

    // 祝日データの取得
    const holidayData = sheetToObjects(holidaySheet);
    const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));

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
    
    // レッスン枠データの事前読み込み
    const lessonRows = lessonSheet.getDataRange().getValues();
    
    // 90日ループ
    for (let i = 0; i < 90; i++) {
      let currentDate = new Date(startDate.getTime());
      currentDate.setDate(startDate.getDate() + i);

      // 曜日・祝日・終了日チェック
      const day = currentDate.getDay();
      if (day === 0 || day === 6) continue;
      if (endDate && currentDate > endDate) break; 
      const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (holidays.includes(dateStr)) continue;

      if (day === targetDayOfWeek) {
        
        // --- 1. レッスン枠IDの特定・作成 ---
        let lessonID = "";
        
        for (let j = 1; j < lessonRows.length; j++) {
          const lDate = new Date(lessonRows[j][2]); // C列
          const lKoushi = lessonRows[j][1];         // B列
          const lTime = lessonRows[j][3];           // D列
          
          if (Utilities.formatDate(lDate, Session.getScriptTimeZone(), "yyyy/MM/dd") === dateStr &&
              lKoushi === koushiID &&
              lTime === teikiJikanmei) {
            lessonID = lessonRows[j][0]; // A列
            break;
          }
        }

        if (!lessonID) {
          lessonID = getShortId();
          const newLessonRow = [
            lessonID,       // A
            koushiID,       // B
            currentDate,    // C
            teikiJikanmei   // D
          ];
          lessonSheet.appendRow(newLessonRow);
          lessonRows.push(newLessonRow); 
        }

        // --- 2. 予約の作成 ---
        // ★修正: K列(講師Cal)、L列(定期ID)を追加
        yoyakuSheet.appendRow([
          getShortId(),       // A: 予約ID
          lessonID,           // B: レッスン枠ID
          shisetsuID,         // C: 施設ID
          "予約済",           // D: ステータス
          sankaClass,         // E: 参加クラス
          currentDate,        // F: レッスン日
          teikiJikanmei,      // G: 時間名
          koushiID,           // H: 講師ID
          "",                 // I: 法人Cal
          "",                 // J: マスターCal
          "",                 // K: 講師Cal (バッチ同期待ち)
          teikiID             // L: 定期ID (★追加)
        ]);
      }
    }
    return "SUCCESS: Batch creation completed for " + teikiID;
  } catch (e) {
    return "ERROR: " + e;
  }
}

/**
 * 2. 【月次トリガー用】毎月実行
 * 全定期スケジュールを確認し、翌月分の予約を一括作成する
 */
function generateNextMonthReservations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const teikiSheet = ss.getSheetByName("定期スケジュール");
  const lessonSheet = ss.getSheetByName("レッスン枠");
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const holidaySheet = ss.getSheetByName("祝日マスタ");

  if (!teikiSheet || !yoyakuSheet) return;

  // 期間設定: 翌月の1日〜末日
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const startDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
  const endDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

  const holidayData = sheetToObjects(holidaySheet);
  const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));
  const teikiData = sheetToObjects(teikiSheet);
  
  // レッスン枠データの事前読み込み
  const lessonRows = lessonSheet.getDataRange().getValues();

  // 既存予約の取得 (重複回避用)
  const yoyakuData = sheetToObjects(yoyakuSheet);
  const existingMap = new Set();
  yoyakuData.forEach(row => {
    const d = new Date(row.レッスン日);
    const dStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    existingMap.add(`${row.施設ID}_${dStr}_${row.時間名}`);
  });

  const newRows = [];
  const dayMap = ["日", "月", "火", "水", "木", "金", "土"];

  Logger.log(`翌月予約作成開始: ${Utilities.formatDate(startDay, Session.getScriptTimeZone(), "yyyy/MM")}`);

  // 1日から末日までループ
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    if (holidays.includes(dateStr)) continue;

    const dayOfWeek = dayMap[d.getDay()];
    const targets = teikiData.filter(t => t.曜日 === dayOfWeek);

    targets.forEach(teiki => {
      const contractStart = new Date(teiki.契約開始日);
      const contractEnd = teiki.契約終了日 ? new Date(teiki.契約終了日) : null;
      if (d < contractStart) return;
      if (contractEnd && d > contractEnd) return;
      if (existingMap.has(`${teiki.施設ID}_${dateKey}_${teiki.時間名}`)) return;

      // --- 1. レッスン枠IDの特定・作成 ---
      let lessonID = "";
      const koushiID = teiki["担当講師ID"];
      const timeName = teiki.時間名;

      for (let j = 1; j < lessonRows.length; j++) {
        const lDate = new Date(lessonRows[j][2]);
        const lKoushi = lessonRows[j][1];
        const lTime = lessonRows[j][3];
        
        if (Utilities.formatDate(lDate, Session.getScriptTimeZone(), "yyyy/MM/dd") === dateStr &&
            lKoushi === koushiID &&
            lTime === timeName) {
          lessonID = lessonRows[j][0];
          break;
        }
      }

      if (!lessonID) {
        lessonID = getShortId();
        const newLessonRow = [lessonID, koushiID, new Date(d), timeName];
        lessonSheet.appendRow(newLessonRow);
        lessonRows.push(newLessonRow);
      }

      // --- 2. 行データ作成 ---
      // ★修正: K列(講師Cal), L列(定期ID)を追加
      // sheetToObjectsを使っているので teiki.定期ID でIDが取れる前提
      const currentTeikiID = teiki["定期ID"]; 

      newRows.push([
        getShortId(),           // A: 予約ID
        lessonID,               // B: レッスン枠ID
        teiki.施設ID,           // C: 施設ID
        "予約済",               // D: ステータス
        teiki.参加クラス || "", // E: 参加クラス
        new Date(d),            // F: レッスン日
        teiki.時間名,           // G: 時間名
        koushiID,               // H: 講師ID
        "",                     // I: 法人Cal
        "",                     // J: マスターCal
        "",                     // K: 講師Cal (バッチ待ち)
        currentTeikiID          // L: 定期ID (★追加)
      ]);
    });
  }

  if (newRows.length > 0) {
    const lastRow = yoyakuSheet.getLastRow();
    yoyakuSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    Logger.log(`完了: ${newRows.length} 件作成`);
  } else {
    Logger.log("作成対象なし");
  }
}

// 3. createInitialLessonSlots_Triggered は変更なし
function createInitialLessonSlots_Triggered(koushiID) {
  // (元のコードのまま変更なし)
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const lecturerSheet = ss.getSheetByName("講師マスタ");
    const lessonSheet = ss.getSheetByName("レッスン枠");
    const timetableSheet = ss.getSheetByName("時間割マスタ");
    const holidaySheet = ss.getSheetByName("祝日マスタ");

    const timetables = sheetToObjects(timetableSheet);
    const existingLessons = sheetToObjects(lessonSheet);
    const holidayData = sheetToObjects(holidaySheet);
    const holidays = holidayData.map(h => Utilities.formatDate(new Date(h.日付), Session.getScriptTimeZone(), "yyyy/MM/dd"));

    const lecturer = findRowData(lecturerSheet, koushiID, 1);
    if (!lecturer) return "ERROR: Lecturer not found";
    if (!lecturer.勤務曜日 || !lecturer.契約開始日) return "WARN: Missing schedule info";

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
      if (day === 0 || day === 6) continue;

      const currentDayOfWeekStr = youbiToNumber_reverse(day);
      if (endDate && currentDate > endDate) continue;
      
      const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (holidays.includes(dateStr)) continue;

      if (!lecturer.勤務曜日.includes(currentDayOfWeekStr)) continue;

      for (const timetable of timetables) {
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
      lessonSheet.getRange(lessonSheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
      return "SUCCESS: Created " + createdCount + " slots";
    }
    return "SUCCESS: No slots needed";
  } catch (e) {
    return "ERROR: " + e;
  }
}