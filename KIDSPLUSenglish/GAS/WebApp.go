/**
 * ===================================================================
 * キャンセル専用API (JSON版) - 全機能統合版
 * (Mail, Chat, Slack通知 & マスターカレンダー連携対応)
 * ===================================================================
 */

// ★★★ 事務局の通知先メールアドレス ★★★
const ADMIN_MAIL_ADDRESS = "notification@kidsplus.school";

// ★★★ Google Chat Webhook URL ★★★
const CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQA6YoaBdg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=IAQwZfGTPEHPdy-sxsPiJch2kN93jDNFFCnQ0ip8ixo"; 


// 出力をJSON形式にするヘルパー
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GETリクエスト: データの取得
function doGet(e) {
  const action = e.parameter.action;

  if (action === "get_single") {
    return getSingleReservation(e.parameter.id);
  }
  
  if (action === "get_monthly") {
    return getMonthlyReservations(e.parameter.fid, e.parameter.ym);
  }

  return responseJSON({ success: false, message: "Invalid action" });
}

// POSTリクエスト: 更新処理
function doPost(e) {
  const action = e.parameter.action;

  if (action === "cancel_single") {
    return processCancel(e.parameter.id);
  }

  if (action === "cancel_monthly") {
    const idsStr = e.parameter.ids || ""; 
    const ids = idsStr.split(",").filter(id => id); 
    return processMonthlyUpdate(ids);
  }

  return responseJSON({ success: false, message: "Invalid action" });
}

// --- 内部ロジック ---

function getSingleReservation(id) {
  if (!id) return responseJSON({ success: false, message: "IDがありません" });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const timeSheet = ss.getSheetByName("時間割マスタ");

  const rowData = findRowData(yoyakuSheet, id, 1);
  if (!rowData) return responseJSON({ success: false, message: "予約が見つかりません" });
  if (rowData["ステータス"] === "キャンセル済") {
    return responseJSON({ success: false, errorType: "ALREADY_CANCELLED", message: "キャンセル済みです" });
  }

  // 当日チェック
  const today = new Date();
  const lessonDate = new Date(rowData["レッスン日"]);
  const todayNum = Number(Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyyMMdd"));
  const lessonNum = Number(Utilities.formatDate(lessonDate, Session.getScriptTimeZone(), "yyyyMMdd"));

  if (todayNum >= lessonNum) {
    return responseJSON({ success: false, errorType: "TOO_LATE", message: "受付期間外です" });
  }

  const shisetsu = findRowData(shisetsuSheet, rowData["施設ID"], 1);
  const facilityName = shisetsu ? shisetsu["施設名"] : "-";

  const dateStr = Utilities.formatDate(lessonDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
  const dayStr = ["日","月","火","水","木","金","土"][lessonDate.getDay()];
  
  const timeData = findRowData(timeSheet, rowData["時間名"], 1);
  let timeStr = rowData["時間名"];
  if (timeData) {
    const s = Utilities.formatDate(new Date(timeData["開始時間"]), Session.getScriptTimeZone(), "HH:mm");
    const e = Utilities.formatDate(new Date(timeData["終了時間"]), Session.getScriptTimeZone(), "HH:mm");
    timeStr = `${s} - ${e}`;
  }

  return responseJSON({
    success: true,
    data: {
      id: id,
      facilityName: facilityName,
      dateDisplay: `${dateStr} (${dayStr})`,
      timeDisplay: timeStr
    }
  });
}

function getMonthlyReservations(fid, ym) {
  if (!fid || !ym) return responseJSON({ success: false, message: "パラメータ不足" });

  const today = new Date();
  const todayNum = Number(Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyyMMdd"));
  const parts = ym.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const deadlineDate = new Date(year, month - 1, 28);
  const deadlineNum = Number(Utilities.formatDate(deadlineDate, Session.getScriptTimeZone(), "yyyyMMdd"));

  if (todayNum > deadlineNum) {
    return responseJSON({ 
      success: false, 
      errorType: "DEADLINE_PASSED", 
      deadlineDisplay: Utilities.formatDate(deadlineDate, Session.getScriptTimeZone(), "MM/dd") 
    });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const timeSheet = ss.getSheetByName("時間割マスタ");

  const shisetsu = findRowData(shisetsuSheet, fid, 1);
  const facilityName = shisetsu ? shisetsu["施設名"] : "-";
  
  const yoyakuData = sheetToObjects(yoyakuSheet);
  const timetableData = sheetToObjects(timeSheet);

  const targetReservations = yoyakuData.filter(r => {
    const d = new Date(r.レッスン日);
    const rYm = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM");
    return r.施設ID === fid && rYm === ym && r.ステータス === "予約済";
  });

  targetReservations.sort((a, b) => new Date(a.レッスン日) - new Date(b.レッスン日));
  const dayMap = ["日", "月", "火", "水", "木", "金", "土"];

  const list = targetReservations.map(r => {
    const d = new Date(r.レッスン日);
    const ymd = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const dStr = `${ymd} (${dayMap[d.getDay()]})`;
    
    const t = timetableData.find(tm => tm.時間名 === r.時間名);
    let tStr = r.時間名;
    if (t) {
      const s = Utilities.formatDate(new Date(t.開始時間), Session.getScriptTimeZone(), "HH:mm");
      const e = Utilities.formatDate(new Date(t.終了時間), Session.getScriptTimeZone(), "HH:mm");
      tStr = `${s} - ${e}`;
    }

    return {
      id: r.予約ID,
      displayDate: dStr,
      displayTime: tStr
    };
  });

  return responseJSON({
    success: true,
    data: {
      facilityName: facilityName,
      targetMonth: ym,
      list: list
    }
  });
}

// processCancel (単発) - ★カレンダー連携更新版
function processCancel(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const historySheet = ss.getSheetByName("変更履歴");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");

    const data = yoyakuSheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let targetRow = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id) {
        rowIndex = i + 1;
        targetRow = data[i];
        break;
      }
    }

    if (rowIndex === -1) return responseJSON({ success: false, message: "Not found" });

    const shisetsuId = targetRow[2];
    const lessonDate = new Date(targetRow[5]);
    const timeName   = targetRow[6];
    
    // ★ID取得 (I列=8, J列=9)
    let eventId = "";
    if (targetRow.length > 8) eventId = targetRow[8];
    let masterEventId = "";
    if (targetRow.length > 9) masterEventId = targetRow[9];

    // ステータス更新
    yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");

    // ★カレンダー削除 (新しい関数を使用)
    if (typeof deleteEventFromCalendars === 'function') {
      deleteEventFromCalendars(eventId, masterEventId, shisetsuId);
    }

    historySheet.appendRow([getShortId(), id, new Date(), "Web", "Single Cancel"]);

    // 通知メッセージ作成
    const shisetsuData = sheetToObjects(shisetsuSheet);
    const shisetsu = shisetsuData.find(s => s.施設ID === shisetsuId);
    const facilityName = shisetsu ? shisetsu.施設名 : shisetsuId;
    const dateStr = Utilities.formatDate(lessonDate, Session.getScriptTimeZone(), "yyyy/MM/dd");

    const subject = `【キャンセル通知】${facilityName} (${dateStr})`;
    const body = `以下の予約がWebからキャンセルされました。\n\n■施設名: ${facilityName}\n■日時: ${dateStr}\n■時間: ${timeName}\n■予約ID: ${id}`;

    // メール送信
    try {
      MailApp.sendEmail(ADMIN_MAIL_ADDRESS, subject, body);
    } catch (e) { Logger.log("Mail Error: " + e); }

    // Google Chat送信
    sendChatNotification(`🚨 *${subject}*\n${body}`);

    // Slack送信 (情報ステータスで通知)
    try {
      const channelId = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');
      if (channelId) {
        const slackTitle = `【KIDS PLUS：予約キャンセル通知】`; 
        postHybridMessage(channelId, slackTitle, "情報", body);
      }
    } catch (e) { Logger.log("Slack Error: " + e); }

    return responseJSON({ success: true });

  } catch (e) {
    return responseJSON({ success: false, message: e.toString() });
  }
}

// processMonthlyUpdate (一括) - ★カレンダー連携更新版
function processMonthlyUpdate(cancelIds) {
  if (!cancelIds || cancelIds.length === 0) return responseJSON({ success: true, count: 0 });

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const historySheet = ss.getSheetByName("変更履歴");
    const shisetsuSheet = ss.getSheetByName("施設マスタ");

    const data = yoyakuSheet.getDataRange().getValues();
    const shisetsuData = sheetToObjects(shisetsuSheet);

    const idMap = new Map();
    for (let i = 1; i < data.length; i++) {
      idMap.set(data[i][0].toString(), i + 1);
    }

    let updatedCount = 0;
    let mailDetails = []; 
    let facilityNameForMail = ""; 

    cancelIds.forEach(id => {
      const rowIndex = idMap.get(id);
      if (rowIndex) {
        const rowData = data[rowIndex-1];
        const shisetsuId = rowData[2];
        const lessonDate = new Date(rowData[5]);
        const timeName = rowData[6];
        
        // ★ID取得 (I列=8, J列=9)
        let eventId = "";
        if (rowData.length > 8) eventId = rowData[8];
        let masterEventId = "";
        if (rowData.length > 9) masterEventId = rowData[9];

        if (!facilityNameForMail) {
          const s = shisetsuData.find(item => item.施設ID === shisetsuId);
          if (s) facilityNameForMail = s.施設名;
        }

        yoyakuSheet.getRange(rowIndex, 4).setValue("キャンセル済");
        
        // ★カレンダー削除 (新しい関数を使用)
        if (typeof deleteEventFromCalendars === 'function') {
          deleteEventFromCalendars(eventId, masterEventId, shisetsuId);
        }
        
        historySheet.appendRow([getShortId(), id, new Date(), "WebMonthly", "Batch Cancel"]);
        
        const dStr = Utilities.formatDate(lessonDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
        mailDetails.push(`・${dStr} (${timeName})`);
        
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      const subject = `【月次キャンセル通知】${facilityNameForMail} (他${updatedCount}件)`;
      const body = `月次確認画面から以下の予約がキャンセルされました。\n\n■施設名: ${facilityNameForMail || "不明"}\n■件数: ${updatedCount}件\n\n[キャンセル詳細]\n${mailDetails.join("\n")}`;

      // メール送信
      try {
        MailApp.sendEmail(ADMIN_MAIL_ADDRESS, subject, body);
      } catch (e) { Logger.log("Mail Error: " + e); }

      // Google Chat送信
      sendChatNotification(`📅 *${subject}*\n${body}`);

      // Slack送信
      try {
        const channelId = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');
        if (channelId) {
          const slackTitle = `【KIDS PLUS：月次キャンセル通知】`;
          postHybridMessage(channelId, slackTitle, "情報", body);
        }
      } catch (e) { Logger.log("Slack Error: " + e); }
    }

    return responseJSON({ success: true, count: updatedCount });
  } catch (e) {
    return responseJSON({ success: false, message: e.toString() });
  }
}

/**
 * Google Chatへメッセージを送信する関数
 */
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

/**
 * 【NEW】Block KitとAttachmentsを組み合わせたハイブリッド形式で通知を送信する
 */
function postHybridMessage(channelId, title, status, details) {
  const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!botToken) {
    Logger.log('Slackのボットトークンが設定されていません。');
    return;
  }
  const executionTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let statusText, color;
  switch (status) {
    case "正常終了": statusText = "Success"; color = "#36a64f"; break;
    case "実行エラー": statusText = "Failure"; color = "#e01e5a"; break;
    case "情報": statusText = "Information"; color = "#439fe0"; break;
    default: statusText = "Unknown"; color = "#808080"; break;
  }

  // タイトル切り出し: 【Project：Title】の Title部分を抽出
  const shortTitle = title.substring(title.indexOf('：') + 1, title.length - 1);

  const payload = {
    "channel": channelId,
    "text": `${title} 実行結果`,
    "attachments": [
      {
        "color": color,
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*${shortTitle}*`
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": `*実行日時:*\n${executionTime}`
              },
              {
                "type": "mrkdwn",
                "text": `*ステータス:*\n${statusText}`
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*詳細:*\n```" + details + "```"
            }
          }
        ]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json; charset=utf-8',
    'headers': {
      'Authorization': 'Bearer ' + botToken
    },
    'payload': JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  } catch (e) {
    Logger.log('Slack APIへの通知に失敗しました: ' + e.message);
  }
}