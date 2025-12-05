/**
 * ===================================================================
 * メール送信機能 (Daily & Weekly & Monthly) - Monthlyクラス非表示版
 * ===================================================================
 */

// --- 設定 ---
const MAIL_SENDER_NAME = "KIDS PLUS english";
const REPLY_TO_ADDRESS = "support@kidsplus.me";

// ★★★ 画像・URL設定 ★★★
const LOGO_URL = "https://www.kidsplus.school/wp-content/uploads/images/logo.png";
const ICON_URL = "https://www.kidsplus.school/wp-content/uploads/images/icon1.png";
const APP_URL  = "https://www.appsheet.com/start/5bc3fd25-0251-4979-a02b-fc102902e840";

// ★★★ キャンセル用WebアプリURL ★★★
// ※URLが変わった場合は更新してください
const CANCEL_WEB_URL = "https://script.google.com/macros/s/AKfycbzHBEp92jESEwv9Eg1WOxb75AHvXgdcrXPKZh_y6m2uCQOSI9NSd6WMeOsZR49ESLjS/exec";


/**
 * 1. 前日リマインドメール送信 (毎日 13:00 実行用)
 */
function sendDailyReminders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");

  const yoyakuData = sheetToObjects(yoyakuSheet);
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const koushiData = sheetToObjects(koushiSheet);
  const timetableData = sheetToObjects(timetableSheet);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), "yyyy/MM/dd");

  const remindersByFacility = {};

  yoyakuData.forEach(yoyaku => {
    const yoyakuDate = new Date(yoyaku.レッスン日);
    const yoyakuDateStr = Utilities.formatDate(yoyakuDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
    
    if (yoyakuDateStr === tomorrowStr && yoyaku.ステータス === "予約済") {
      const facilityID = yoyaku.施設ID;
      if (!remindersByFacility[facilityID]) {
        remindersByFacility[facilityID] = [];
      }
      remindersByFacility[facilityID].push(yoyaku);
    }
  });

  Object.keys(remindersByFacility).forEach(facilityID => {
    const reservations = remindersByFacility[facilityID];
    const shisetsu = shisetsuData.find(s => s.施設ID === facilityID);
    
    if (!shisetsu || !shisetsu.担当者メールアドレス) return;

    const houjin = houjinData.find(h => h.法人ID === shisetsu.法人ID);

    reservations.sort((a, b) => {
      const timeA = timetableData.find(t => t.時間名 === a.時間名);
      const timeB = timetableData.find(t => t.時間名 === b.時間名);
      if (!timeA) return 1;
      if (!timeB) return -1;
      return new Date(timeA.開始時間) - new Date(timeB.開始時間);
    });

    let lessonsHtml = "";
    let lessonsText = "";

    reservations.forEach(r => {
      const koushi = koushiData.find(k => k.講師ID === r.講師ID);
      const time = timetableData.find(t => t.時間名 === r.時間名);
      
      const startT = time ? Utilities.formatDate(new Date(time.開始時間), Session.getScriptTimeZone(), "HH:mm") : "-";
      const endT = time ? Utilities.formatDate(new Date(time.終了時間), Session.getScriptTimeZone(), "HH:mm") : "-";
      
      let meetUrl = "";
      if (shisetsu.個別MeetID) {
        meetUrl = "https://meet.google.com/" + shisetsu.個別MeetID;
      } else if (houjin && houjin.法人共通MeetID) {
        meetUrl = "https://meet.google.com/" + houjin.法人共通MeetID;
      }

      const meetingCode = meetUrl.replace("https://meet.google.com/", "");
      const cancelLink = CANCEL_WEB_URL + "?id=" + r.予約ID;

      lessonsHtml += `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; color: #0056b3; font-size: 20px;">
            <strong>⏰ ${startT} - ${endT}</strong> 
            <span style="font-size: 16px; color: #666;">(${r.時間名})</span>
          </p>
          <p style="margin: 5px 0; font-size: 18px;">
            <strong>🔑 会議コード:</strong> 
            <span style="font-family: monospace; letter-spacing: 1px; color: #333; border-bottom: 1px dotted #999;">${meetingCode}</span>
          </p>
          <p style="margin: 5px 0; font-size: 18px;">
            <strong>👩‍🏫 講師:</strong> ${koushi ? koushi.講師名 : '未定'}
          </p>
          <div style="margin-top: 20px; text-align: center;">
             <a href="${meetUrl}" style="background-color: #E63566; color: white; padding: 12px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
               🎥 Meetに参加する
             </a>
          </div>
          <div style="text-align: center; margin-top: 8px;">
             <span style="font-size: 11px; color: #999;">(${meetUrl})</span>
          </div>
          <div style="text-align: right; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
             <a href="${cancelLink}" style="font-size: 13px; color: #666; text-decoration: underline;">このレッスンをキャンセルする</a>
          </div>
        </div>
      `;

      lessonsText += `
--------------------------------------------------
■時間: ${startT} - ${endT} (${r.時間名})
■会議コード: ${meetingCode}
■講師: ${koushi ? koushi.講師名 : '未定'}
■URL: ${meetUrl}
■キャンセル: ${cancelLink}
`;
    });

    const subject = `【リマインド】明日の英語レッスンのお知らせ (${tomorrowStr})`;

    const htmlBody = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${LOGO_URL}" width="100" style="width: 100px; height: auto;" alt="KIDS PLUS english">
        </div>
        <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; margin-bottom: 20px; padding-bottom: 10px; font-size: 20px; text-align: center;">
          明日のレッスンのお知らせ
        </h2>
        <p style="font-size: 16px;">
          <strong>${shisetsu.施設名}</strong><br>
          ${shisetsu.担当者名 ? shisetsu.担当者名 + ' 様' : 'ご担当者様'}
        </p>
        <p style="font-size: 16px;">いつもご利用ありがとうございます。<br>
        明日のKIDS PLUS englishレッスンのご案内です（計 ${reservations.length}件）。</p>
        <div style="margin-top: 25px;">${lessonsHtml}</div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0 20px 0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${ICON_URL}" width="250" style="width: 250px; height: auto; vertical-align: middle;" alt="icon">
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 12px; color: #666; text-align: center; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;">※本メールは自動送信です。確認・変更は、アプリまたは上記リンクから申請してください。</p>
          <p style="margin: 0; border-top: 1px solid #ddd; padding-top: 10px;">
            <strong>【カスタマーサポート】</strong><br>
            ご不明点は、カスタマーサポートへご連絡ください。<br>
            <a href="mailto:support@kidsplus.me" style="color: #0056b3; text-decoration: none;">support@kidsplus.me</a><br>
            050-3185-1570
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 30px;">
           <a href="${APP_URL}" style="color: #0056b3; text-decoration: none; border: 1px solid #0056b3; padding: 10px 24px; border-radius: 4px; font-size: 15px; display: inline-block;">
             📱 アプリを開いて確認
           </a>
        </div>
      </div>
    `;

    const textBody = `
${shisetsu.施設名}
${shisetsu.担当者名 ? shisetsu.担当者名 + ' 様' : 'ご担当者様'}

いつもご利用ありがとうございます。
明日のKIDS PLUS englishレッスンのご案内です（計 ${reservations.length}件）。

${lessonsText}

※本メールは自動送信です。確認・変更は、アプリまたは上記リンクから申請してください。

【カスタマーサポート】
ご不明点は、カスタマーサポートへご連絡ください。
support@kidsplus.me
050-3185-1570

▼アプリを開いて確認
${APP_URL}
    `.trim();

    const options = {
      name: MAIL_SENDER_NAME,
      htmlBody: htmlBody,
      replyTo: REPLY_TO_ADDRESS
    };
    if (houjin && houjin.代表連絡先メールアドレス) options.cc = houjin.代表連絡先メールアドレス;

    MailApp.sendEmail(shisetsu.担当者メールアドレス, subject, textBody, options);
    Logger.log(`Sent Daily Reminder to: ${shisetsu.施設名} (${reservations.length} lessons)`);
  });
}

/**
 * 2. 週次スケジュール送信 (毎週月曜 8:00 実行用)
 */
function sendWeeklySchedule() {
  // ... (今回は変更なし) ...
}

/**
 * 3. 月次スケジュール確認メール送信 (毎月20日頃実行)
 * 修正: テーブルから「クラス」列を削除、期日を28日に設定
 */
function sendMonthlyConfirmation() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");

  const yoyakuData = sheetToObjects(yoyakuSheet);
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const timetableData = sheetToObjects(timetableSheet);
  const koushiData = sheetToObjects(koushiSheet);
  
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  
  const nextMonthStr = Utilities.formatDate(nextMonth, Session.getScriptTimeZone(), "yyyy-MM");
  const nextMonthDisplay = Utilities.formatDate(nextMonth, Session.getScriptTimeZone(), "yyyy年M月");

  // ★期日設定: 今月の28日
  const deadlineDate = new Date();
  deadlineDate.setDate(28); 
  const deadlineStr = Utilities.formatDate(deadlineDate, Session.getScriptTimeZone(), "M月28日");

  const baseUrl = CANCEL_WEB_URL; 

  shisetsuData.forEach(shisetsu => {
    if (!shisetsu.担当者メールアドレス) return;

    const targetReservations = yoyakuData.filter(r => {
      const d = new Date(r.レッスン日);
      const ym = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM");
      return r.施設ID === shisetsu.施設ID && ym === nextMonthStr && r.ステータス === "予約済";
    });

    if (targetReservations.length > 0) {
      targetReservations.sort((a, b) => new Date(a.レッスン日) - new Date(b.レッスン日));

      let tableRows = "";
      
      targetReservations.forEach(r => {
        const dStr = Utilities.formatDate(new Date(r.レッスン日), Session.getScriptTimeZone(), "MM/dd (E)");
        const time = timetableData.find(t => t.時間名 === r.時間名);
        const timeStr = time ? `${Utilities.formatDate(new Date(time.開始時間), Session.getScriptTimeZone(), "HH:mm")}-${Utilities.formatDate(new Date(time.終了時間), Session.getScriptTimeZone(), "HH:mm")}` : r.時間名;
        const koushi = koushiData.find(k => k.講師ID === r.講師ID);
        
        // ★修正: クラスの列を削除
        tableRows += `
          <tr>
            <td style="border-bottom:1px solid #eee; padding:8px;">${dStr}</td>
            <td style="border-bottom:1px solid #eee; padding:8px;">${timeStr}</td>
            <td style="border-bottom:1px solid #eee; padding:8px;">${koushi ? koushi.講師名 : '-'}</td>
          </tr>`;
      });

      const confirmUrl = `${baseUrl}?mode=monthly&fid=${shisetsu.施設ID}&ym=${nextMonthStr}`;
      const subject = `【重要】${nextMonthDisplay}分 レッスンスケジュールのご確認願い (${shisetsu.施設名})`;

      const htmlBody = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0056b3;">翌月のスケジュール確認</h2>
          <p>${shisetsu.施設名} 様</p>
          <p>いつもご利用ありがとうございます。<br>
          来月（${nextMonthDisplay}）のレッスンスケジュール（計${targetReservations.length}件）をお送りします。</p>
          
          <div style="background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 10px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background: #f8f9fa; font-weight: bold;">
                <td style="padding:8px;">日付</td>
                <td style="padding:8px;">時間</td>
                <td style="padding:8px;">講師</td>
              </tr>
              ${tableRows}
            </table>
          </div>

          <p>上記の日程で確定してよろしければ、特段の操作は不要です。<br>
          <strong>変更・キャンセルがある場合のみ</strong>、以下のボタンより期日までに申請してください。</p>
          
          <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; font-weight: bold;">
            確認期日：${deadlineStr} まで
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #E63566; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              ✅ スケジュール調整画面へ
            </a>
          </div>

          <p style="font-size:12px; color:#666;">
            ※期日を過ぎますと、自動的に予約確定となります。<br>
            URL: ${confirmUrl}
          </p>
        </div>
      `;

      MailApp.sendEmail({
        to: shisetsu.担当者メールアドレス,
        subject: subject,
        htmlBody: htmlBody,
        name: MAIL_SENDER_NAME,
        replyTo: REPLY_TO_ADDRESS
      });
      
      Logger.log(`Sent Monthly Confirm to: ${shisetsu.施設名}`);
    }
  });
}