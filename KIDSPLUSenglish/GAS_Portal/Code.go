/**
 * ===================================================================
 * 法人ポータル用 バックエンド (Code.gs) - 個別操作対応版
 * ===================================================================
 */

const SPREADSHEET_ID = "1sbFPxzpilekkJ9OsdJ0140AsdyLy5AX4xfo0PSg4as8"; // ★実際のスプレッドシートID

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('レッスン予約ポータル')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ログイン処理
 */
function login(corpId, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const houjinSheet = ss.getSheetByName("法人マスタ");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const timeSheet = ss.getSheetByName("時間割マスタ");

    const houjinData = sheetToObjects(houjinSheet);
    const targetCorp = houjinData.find(h => String(h.法人ID) === String(corpId) && String(h.パスワード) === String(password));

    if (!targetCorp) {
      return { success: false, message: "IDまたはパスワードが違います。" };
    }

    const shisetsuData = sheetToObjects(shisetsuSheet);
    const myFacilities = shisetsuData
      .filter(s => String(s.法人ID) === String(corpId))
      .map(s => ({
        id: String(s.施設ID),
        name: s.施設名,
        type: s.施設区分
      }));

    const timeData = sheetToObjects(timeSheet).map(t => ({
      name: t.時間名,
      start: Utilities.formatDate(new Date(t.開始時間), Session.getScriptTimeZone(), "HH:mm"),
      end: Utilities.formatDate(new Date(t.終了時間), Session.getScriptTimeZone(), "HH:mm")
    }));

    const allowedTimes = targetCorp.利用可能時間 ? String(targetCorp.利用可能時間).split(",") : [];

    return {
      success: true,
      corpName: targetCorp.法人名,
      constraints: {
        allowedDays: targetCorp.契約曜日 ? String(targetCorp.契約曜日).split(",") : [], 
        allowedTimes: allowedTimes 
      },
      facilities: myFacilities,
      timetables: timeData
    };
  } catch (e) {
    return { success: false, message: "Login Error: " + e.toString() };
  }
}

/**
 * 予約可能日リスト取得
 */
function getLessonAvailability(facilityIds) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const lessonFrameSheet = ss.getSheetByName("レッスン枠");

    const shisetsuData = shisetsuSheet.getDataRange().getValues();
    const targetTeacherIds = new Set();
    
    for (let i = 1; i < shisetsuData.length; i++) {
      const rowFacId = String(shisetsuData[i][0]);
      if (facilityIds.includes(rowFacId)) {
        const tid = shisetsuData[i][3];
        if (tid) targetTeacherIds.add(String(tid));
      }
    }

    if (targetTeacherIds.size === 0) return [];

    const lessonData = lessonFrameSheet.getDataRange().getValues();
    const availableDates = [];
    const processedKeys = new Set(); 

    for (let i = 1; i < lessonData.length; i++) {
      const lTeacherId = String(lessonData[i][1]);
      const lDate = lessonData[i][2];
      
      if (targetTeacherIds.has(lTeacherId) && lDate) {
        const dateStr = Utilities.formatDate(new Date(lDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (!processedKeys.has(dateStr)) {
          availableDates.push(dateStr);
          processedKeys.add(dateStr);
        }
      }
    }
    return availableDates; 
  } catch(e) {
    return [];
  }
}

/**
 * 予約登録
 */
function registerReservation(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const lessonFrameSheet = ss.getSheetByName("レッスン枠"); 

    const lessonDate = Utilities.parseDate(data.dateStr, Session.getScriptTimeZone(), "yyyy-MM-dd");

    let teacherId = "";
    const shisetsuData = shisetsuSheet.getDataRange().getValues();
    for (let i = 1; i < shisetsuData.length; i++) {
      if (String(shisetsuData[i][0]) === String(data.facilityId)) {
        teacherId = shisetsuData[i][3]; 
        break;
      }
    }

    if (!teacherId) {
      return { success: false, message: "この施設の担当講師が設定されていません。" };
    }

    const existingFrameId = findExistingLessonFrameId(lessonFrameSheet, lessonDate, teacherId, data.timeName);

    if (!existingFrameId) {
      return { success: false, message: "選択された日時のレッスン枠が見つかりません。" };
    }

    const reservationId = "WEB_" + Utilities.getUuid().slice(0, 8); 

    yoyakuSheet.appendRow([
      reservationId,            // A
      existingFrameId,          // B
      data.facilityId,          // C
      "予約済",                 // D
      data.className || "",     // E
      lessonDate,               // F
      data.timeName,            // G
      teacherId,                // H
      "",                       // I
      ""                        // J
    ]);

    return { success: true };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

function findExistingLessonFrameId(sheet, dateObj, teacherId, timeName) {
  const data = sheet.getDataRange().getValues();
  const targetDateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy/MM/dd");
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][2]; 
    if (!rowDate) continue;

    const rowDateStr = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy/MM/dd");
    const rowTeacher = String(data[i][1]); 
    const rowTime = String(data[i][3]);    

    if (rowDateStr === targetDateStr && rowTeacher === String(teacherId) && rowTime === String(timeName)) {
      return data[i][0]; 
    }
  }
  return null; 
}

// --- ヘルパー関数 ---

/**
 * ★改修: 予約一覧取得
 * details配列に個別の予約情報を格納して返す
 */
function getMyReservations(corpId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    
    const shisetsuData = sheetToObjects(shisetsuSheet);
    const myFacilities = shisetsuData.filter(s => String(s.法人ID) === String(corpId));
    const targetFacilityIds = myFacilities.map(s => String(s.施設ID)); 
    const facilityMap = {};
    myFacilities.forEach(s => facilityMap[s.施設ID] = s.施設名);

    const yoyakuData = sheetToObjects(yoyakuSheet);
    const rawReservations = yoyakuData.filter(r => targetFacilityIds.includes(String(r.施設ID)) && r.ステータス === "予約済");

    // グループ化キー: 日付_時間名_講師ID
    const groupedData = {};

    rawReservations.forEach(r => {
      const d = new Date(r.レッスン日);
      const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const key = `${dateStr}_${r.時間名}_${r.講師ID}`; 

      if (!groupedData[key]) {
        groupedData[key] = {
          date: dateStr,
          timeName: r.時間名,
          details: [] // ★個別の予約情報をここに集める
        };
      }
      
      const fName = facilityMap[r.施設ID] || "不明な施設";
      groupedData[key].details.push({
        reservationId: r.予約ID,
        facilityName: fName,
        className: r.参加クラス || "なし"
      });
    });

    const myReservations = Object.values(groupedData).map(group => {
      // カレンダー表示用テキスト（カンマ区切り）
      const joinedFacilities = group.details.map(d => d.facilityName).join(', ');
      
      return {
        id: group.details[0].reservationId, // 代表ID（クリックイベント用）
        title: `${group.timeName} ${joinedFacilities}`,
        start: group.date,
        extendedProps: {
          timeName: group.timeName,
          // ★ここで詳細配列を丸ごと渡す
          details: group.details 
        }
      };
    });

    return myReservations;
  } catch (e) {
    return []; 
  }
}

/**
 * ★改修: キャンセル処理 (単一ID用)
 */
function cancelReservation(reservationId, corpId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    
    const rowIndex = findRowIndex(yoyakuSheet, reservationId);
    if (rowIndex === -1) return { success: false, message: "予約が見つかりません" };

    const rowData = yoyakuSheet.getRange(rowIndex, 1, 1, 10).getValues()[0];
    const lessonDate = new Date(rowData[5]);
    
    if (isEditable(lessonDate)) {
       const facilityId = rowData[2];
       const eventId = rowData[8];
       const masterEventId = rowData[9];
       
       deleteEvent_(ss, corpId, facilityId, eventId, masterEventId);
       yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");
    } else {
       return { success: false, message: "変更期限(2日前)を過ぎているため操作できません。" };
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 施設変更処理 (単一ID用)
 */
function changeFacility(reservationId, newFacilityId, corpId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const rowIndex = findRowIndex(yoyakuSheet, reservationId);
    if (rowIndex === -1) return { success: false, message: "予約が見つかりません" };

    const rowData = yoyakuSheet.getRange(rowIndex, 1, 1, 10).getValues()[0];
    const lessonDate = new Date(rowData[5]);

    if (!isEditable(lessonDate)) {
      return { success: false, message: "変更期限(2日前)を過ぎているため操作できません。" };
    }

    const oldFacilityId = rowData[2];
    const eventId = rowData[8];
    const masterEventId = rowData[9];
    deleteEvent_(ss, corpId, oldFacilityId, eventId, masterEventId);

    yoyakuSheet.getRange(rowIndex, 3).setValue(newFacilityId);
    yoyakuSheet.getRange(rowIndex, 9).setValue("");
    yoyakuSheet.getRange(rowIndex, 10).setValue("");

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const result = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    result.push(obj);
  }
  return result;
}

function findRowIndex(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function isEditable(lessonDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(lessonDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  return diffDays >= 2;
}

function deleteEvent_(ss, corpId, facilityId, eventId, masterEventId) {
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);

  const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(facilityId));
  if (shisetsu) {
    const houjin = houjinData.find(h => String(h.法人ID) === String(shisetsu.法人ID));
    if (houjin && String(houjin.法人ID) === String(corpId) && houjin.連携カレンダーID && eventId) {
      try {
        CalendarApp.getCalendarById(houjin.連携カレンダーID).getEventById(eventId).deleteEvent();
      } catch(e) {}
    }
  }
  const MASTER_CAL_ID = "c_3899a395a62dfa0e33d68ba02a330895e62c55e35e772c97f6c30694718601f4@group.calendar.google.com";
  if (masterEventId) {
    try {
      CalendarApp.getCalendarById(MASTER_CAL_ID).getEventById(masterEventId).deleteEvent();
    } catch(e) {}
  }
}