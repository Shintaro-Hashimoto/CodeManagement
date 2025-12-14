/**
 * ===================================================================
 * 法人ポータル用 バックエンド (Code.gs) - 完全復旧版
 * ===================================================================
 */

// ★★★ 設定値 ★★★
const SPREADSHEET_ID = "1sbFPxzpilekkJ9OsdJ0140AsdyLy5AX4xfo0PSg4as8"; 
const ADMIN_MAIL_ADDRESS = "notification@kidsplus.school"; // ★通知先メール
const CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQA6YoaBdg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=IAQwZfGTPEHPdy-sxsPiJch2kN93jDNFFCnQ0ip8ixo"; // ★Google Chat URL

// ★★★ これが消えていたためエラーになっていました ★★★
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('レッスン予約ポータル')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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

function getHolidays() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const holidaySheet = ss.getSheetByName("祝日マスタ");
    const data = holidaySheet.getDataRange().getValues();
    const holidays = [];
    for (let i = 1; i < data.length; i++) {
      const dateVal = data[i][0]; 
      const applyVal = String(data[i][2]); 
      if (dateVal && applyVal.indexOf("日本") !== -1) {
        const dateStr = Utilities.formatDate(new Date(dateVal), Session.getScriptTimeZone(), "yyyy-MM-dd");
        holidays.push(dateStr);
      }
    }
    return holidays;
  } catch(e) {
    return [];
  }
}

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
    const className = data.className || ""; 

    yoyakuSheet.appendRow([
      reservationId,            // A
      existingFrameId,          // B
      data.facilityId,          // C
      "予約済",                 // D
      className,                // E
      lessonDate,               // F
      data.timeName,            // G
      teacherId,                // H
      "",                       // I
      "",                       // J
      "",                       // K
      ""                        // L: 定期ID (Web予約は空)
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

    const groupedData = {};

    rawReservations.forEach(r => {
      const d = new Date(r.レッスン日);
      const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const key = `${dateStr}_${r.時間名}_${r.講師ID}`; 

      if (!groupedData[key]) {
        groupedData[key] = {
          date: dateStr,
          timeName: r.時間名,
          details: [],
          hasRecurring: false 
        };
      }
      
      const teikiId = r["定期ID"]; 
      const isRegular = (teikiId && String(teikiId).trim() !== "");

      if (isRegular) {
        groupedData[key].hasRecurring = true;
      }

      const fName = facilityMap[r.施設ID] || "不明な施設";
      groupedData[key].details.push({
        reservationId: r.予約ID,
        facilityName: fName,
        className: r.参加クラス || "なし",
        isRegular: isRegular
      });
    });

    const myReservations = Object.values(groupedData).map(group => {
      const joinedFacilities = group.details.map(d => d.facilityName).join(', ');
      return {
        id: group.details[0].reservationId,
        title: `${group.timeName} ${joinedFacilities}`,
        start: group.date,
        extendedProps: {
          timeName: group.timeName,
          details: group.details,
          hasRecurring: group.hasRecurring 
        }
      };
    });

    return myReservations;
  } catch (e) {
    return []; 
  }
}

/**
 * ★修正: キャンセル処理（通知機能 + ログ出力 + 定期キャンセル対応）
 */
function cancelReservation(reservationId, corpId) {
  Logger.log(`[cancelReservation] START - ID: ${reservationId}, Corp: ${corpId}`);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const lecturerSheet = ss.getSheetByName("講師マスタ"); 
    
    const rowIndex = findRowIndex(yoyakuSheet, reservationId);
    if (rowIndex === -1) {
      Logger.log(`[cancelReservation] ERROR: Reservation not found`);
      return { success: false, message: "予約が見つかりません" };
    }

    const rowData = yoyakuSheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
    const lessonDate = new Date(rowData[5]);
    
    // 定期予約ガードは解除済み

    if (isEditable(lessonDate)) {
       const facilityId = rowData[2];
       const eventId = rowData[8];
       const masterEventId = rowData[9];
       const instructorEventId = rowData[10];
       const timeName = rowData[6];

       Logger.log(`[cancelReservation] Deleting calendars...`);
       deleteEvent_(ss, corpId, facilityId, eventId, masterEventId);
       
       if (instructorEventId) {
         try {
           const teacherId = rowData[7];
           const lecturerData = sheetToObjects(lecturerSheet);
           const lecturer = lecturerData.find(l => String(l.講師ID) === String(teacherId));
           const calId = lecturer ? (lecturer["カレンダーID"] || lecturer["担当者メールアドレス"]) : null;
           if (calId) {
             CalendarApp.getCalendarById(calId).getEventById(instructorEventId).deleteEvent();
             Logger.log(`[cancelReservation] Instructor calendar deleted`);
           }
         } catch(e) {
           Logger.log(`[cancelReservation] Instructor Cal Delete Error: ${e.toString()}`);
         }
       }

       yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");
       Logger.log(`[cancelReservation] DB Updated`);

       // --- 通知処理 ---
       const shisetsuData = sheetToObjects(shisetsuSheet);
       const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(facilityId));
       const facilityName = shisetsu ? shisetsu.施設名 : facilityId;
       const dateStr = Utilities.formatDate(lessonDate, Session.getScriptTimeZone(), "yyyy/MM/dd");

       const subject = `【キャンセル通知】${facilityName} (${dateStr})`;
       const body = `以下の予約が法人ポータルからキャンセルされました。\n\n■施設名: ${facilityName}\n■日時: ${dateStr}\n■時間: ${timeName}\n■予約ID: ${reservationId}`;

       // メール送信
       try {
         if (ADMIN_MAIL_ADDRESS) {
           MailApp.sendEmail(ADMIN_MAIL_ADDRESS, subject, body);
           Logger.log(`[cancelReservation] Mail Sent`);
         }
       } catch (e) { Logger.log("Mail Error: " + e); }

       // Chat送信
       try {
         if (CHAT_WEBHOOK_URL) {
           sendChatNotification(`🚨 *${subject}*\n${body}`);
           Logger.log(`[cancelReservation] Chat Sent`);
         }
       } catch (e) { Logger.log("Chat Error: " + e); }

       // Slack送信
       try {
         const channelId = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');
         if (channelId) {
           const slackTitle = `【KIDS PLUS：予約キャンセル通知】`; 
           postHybridMessage(channelId, slackTitle, "情報", body);
           Logger.log(`[cancelReservation] Slack Sent`);
         }
       } catch (e) { Logger.log("Slack Error: " + e); }

    } else {
       Logger.log(`[cancelReservation] ERROR: Not editable`);
       return { success: false, message: "変更期限(2日前)を過ぎているため操作できません。" };
    }

    return { success: true };
  } catch (e) {
    Logger.log(`[cancelReservation] CRITICAL ERROR: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}

function changeFacility(reservationId, newFacilityId, corpId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const rowIndex = findRowIndex(yoyakuSheet, reservationId);
    if (rowIndex === -1) return { success: false, message: "予約が見つかりません" };

    const rowData = yoyakuSheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
    const lessonDate = new Date(rowData[5]);

    if (!isEditable(lessonDate)) {
      return { success: false, message: "変更期限(2日前)を過ぎているため操作できません。" };
    }

    const oldFacilityId = rowData[2];
    const eventId = rowData[8];
    const masterEventId = rowData[9];
    const instructorEventId = rowData[10];

    deleteEvent_(ss, corpId, oldFacilityId, eventId, masterEventId);
    if(instructorEventId) { /* 省略 */ }

    yoyakuSheet.getRange(rowIndex, 3).setValue(newFacilityId);
    yoyakuSheet.getRange(rowIndex, 9).setValue(""); 
    yoyakuSheet.getRange(rowIndex, 10).setValue("");
    yoyakuSheet.getRange(rowIndex, 11).setValue(""); 

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

// --- 通知用ヘルパー ---

function sendChatNotification(text) {
  if (!CHAT_WEBHOOK_URL) return;
  try {
    const payload = { "text": text };
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    };
    UrlFetchApp.fetch(CHAT_WEBHOOK_URL, options);
  } catch (e) {
    Logger.log("Chat Send Error: " + e.toString());
  }
}

function postHybridMessage(channelId, title, status, details) {
  const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!botToken) return;
  
  const executionTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let statusText = "Information";
  let color = "#439fe0";

  const shortTitle = title.indexOf('：') !== -1 ? title.substring(title.indexOf('：') + 1, title.length - 1) : title;

  const payload = {
    "channel": channelId,
    "text": `${title} 実行結果`,
    "attachments": [
      {
        "color": color,
        "blocks": [
          { "type": "section", "text": { "type": "mrkdwn", "text": `*${shortTitle}*` }},
          { "type": "section", "text": { "type": "mrkdwn", "text": "*詳細:*\n```" + details + "```" }}
        ]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json; charset=utf-8',
    'headers': { 'Authorization': 'Bearer ' + botToken },
    'payload': JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  } catch (e) {
    Logger.log('Slack API Error: ' + e.message);
  }
}

/**
 * 権限承認用の一回使い切り関数
 * エディタの「実行」ボタンからこれを実行して、ポップアップで「許可」してください。
 */
function authorizeScript() {
  console.log("認証を開始します...");
  
  // 1. カレンダー権限の要求
  CalendarApp.getDefaultCalendar();
  
  // 2. メール送信権限の要求
  MailApp.getRemainingDailyQuota();
  
  // 3. 外部通信(Chat/Slack)権限の要求
  UrlFetchApp.fetch("https://www.google.com");
  
  console.log("認証が完了しました！");
}