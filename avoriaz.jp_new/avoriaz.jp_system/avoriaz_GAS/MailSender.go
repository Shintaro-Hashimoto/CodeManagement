// ==========================================================
// MailSender.gs - メール送信 (HTML + iCalendar + 履歴保存)
// ==========================================================

// --- 1. 予約確定メール ---

function sendMailFromAppSheet(id, lastName, firstName, email, type, checkIn, checkOut, plan, count, price) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const reservation = {
    id: id,
    name: lastName + " " + firstName,
    email: email,
    type: type,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    plan: String(plan), 
    count: count,
    price: price ? Number(price) : 0
  };

  sendBookingEmailForAppSheet(reservation);
}

function sendBookingEmailForAppSheet(reservation) {
  const subject = `【AVORIAZ】ご予約確定のお知らせ（予約ID：${reservation.id}）`;

  if (!reservation.email) {
    Logger.log('メール送信スキップ: メールアドレス未設定');
    saveEmailLog(reservation.id, '予約確定', '未設定', reservation.name, subject, 'SKIP', 'メールアドレスなし');
    return;
  }

  // --- テキスト形式 ---
  const textBody = `
${reservation.name} 様

この度は数ある宿の中から AVORIAZ をお選びいただき、誠にありがとうございます。
以下の内容にて、ご予約が確定いたしました。

峰の原高原の豊かな自然とともに、${reservation.name} 様のお越しを心よりお待ちしております。

------------------------------------
■ ご予約情報
------------------------------------
予約ID: ${reservation.id}
申込種別: ${reservation.type}
チェックイン: ${formatDate(reservation.checkIn)}
チェックアウト: ${formatDate(reservation.checkOut)}
プラン: ${reservation.plan}
人数: ${reservation.count}名

ご不明な点がございましたら、お気軽にご連絡ください。
当日はどうぞお気をつけてお越しくださいませ。

--
${FACILITY_NAME}
電話番号：0268-74-2704
メール：info@avoriaz.jp
Web: ${FACILITY_WEB}
`;

  // --- HTML形式 ---
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #444; max-width: 600px; border: 1px solid #e0e0e0; padding: 0; background-color: #ffffff;">
      
      <div style="background-color: #2C5F2D; color: #fff; padding: 30px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: normal;">ご予約確定のお知らせ</h2>
        <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.9;">AVORIAZ</p>
      </div>

      <div style="padding: 40px 30px;">
        <p style="margin-bottom: 20px; font-size: 16px;">${reservation.name} 様</p>
        
        <p style="line-height: 1.8; color: #555;">
          この度は数ある宿の中から AVORIAZ をお選びいただき、誠にありがとうございます。<br>
          <strong>以下の内容にて、ご予約が確定いたしました。</strong>
        </p>
        
        <p style="line-height: 1.8; color: #555;">
          内容にお間違いがないか、今一度ご確認くださいませ。<br>
          峰の原高原の豊かな自然とともに、心よりお待ちしております。
        </p>
        
        <div style="margin: 30px 0; border-top: 2px solid #2C5F2D; border-bottom: 1px solid #eee;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <th style="text-align: left; padding: 15px 10px; color: #2C5F2D; font-weight: bold; width: 30%; border-bottom: 1px solid #eee;">チェックイン</th>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eee;"><strong>${formatDate(reservation.checkIn)}</strong></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 15px 10px; color: #2C5F2D; font-weight: bold; border-bottom: 1px solid #eee;">チェックアウト</th>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eee;">${formatDate(reservation.checkOut)}</td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 15px 10px; color: #2C5F2D; font-weight: bold; border-bottom: 1px solid #eee;">プラン</th>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eee;">${reservation.plan}</td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 15px 10px; color: #2C5F2D; font-weight: bold; border-bottom: 1px solid #eee;">人数</th>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eee;">${reservation.count}名</td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 15px 10px; color: #666; font-weight: normal; border-bottom: 1px solid #eee; font-size: 12px;">予約ID</th>
              <td style="padding: 15px 10px; border-bottom: 1px solid #eee; color: #666; font-size: 12px;">${reservation.id}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f4f8f4; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <p style="margin: 0; font-size: 14px; color: #2C5F2D;">
            <strong>【カレンダーへの登録】</strong><br>
            <span style="font-size: 12px; color: #666;">添付の <code>invite.ics</code> ファイルを開くと、<br>お使いのカレンダーアプリに予定を登録できます。</span>
          </p>
        </div>

        <p style="line-height: 1.8; color: #555;">
          ご不明な点がございましたら、お気軽にご連絡ください。<br>
          当日はどうぞお気をつけてお越しくださいませ。
        </p>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 30px 20px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee;">
        <p style="margin: 5px 0; font-weight: bold; color: #2C5F2D; font-size: 15px;">AVORIAZ</p>
        <p style="margin: 5px 0;">〒386-2211 長野県須坂市仁礼峰の原高原3153-166</p>
        <p style="margin: 5px 0;">電話番号：0268-74-2704</p>
        <p style="margin: 15px 0 0;">
          <a href="${FACILITY_WEB}" style="color: #2C5F2D; text-decoration: none; border-bottom: 1px solid #2C5F2D;">公式ホームページ</a>
        </p>
      </div>
    </div>
  `;

  const icsContent = createIcsContent(reservation);
  const icsBlob = Utilities.newBlob(icsContent, 'text/calendar', 'invite.ics');

  try {
    GmailApp.sendEmail(reservation.email, subject, textBody, {
      htmlBody: htmlBody,
      attachments: [icsBlob],
      name: 'AVORIAZ',
      bcc: 'info@avoriaz.jp' 
    });
    
    Logger.log('確定メール送信完了: ' + reservation.email);
    saveEmailLog(reservation.id, '予約確定', reservation.email, reservation.name, subject, 'SUCCESS', '');
    
  } catch (e) {
    Logger.log('確定メール送信エラー: ' + e.toString());
    saveEmailLog(reservation.id, '予約確定', reservation.email, reservation.name, subject, 'ERROR', e.toString());
  }
}


// --- 2. キャンセルメール ---

function sendCancellationMailFromAppSheet(id, lastName, firstName, email, type, checkIn, checkOut, plan, count) {
  const checkInDate = new Date(checkIn);

  const reservation = {
    id: id,
    name: lastName + " " + firstName,
    email: email,
    type: type,
    checkIn: checkInDate,
    plan: String(plan)
  };

  sendCancellationEmailForAppSheet(reservation);
}

function sendCancellationEmailForAppSheet(reservation) {
  // ★ 修正: キャンセル「確定」のお知らせ
  const subject = `【AVORIAZ】ご予約キャンセル確定のお知らせ（予約ID：${reservation.id}）`;

  if (!reservation.email) {
    Logger.log('キャンセルメール送信スキップ: メールアドレス未設定');
    saveEmailLog(reservation.id, 'キャンセル', '未設定', reservation.name, subject, 'SKIP', 'メールアドレスなし');
    return;
  }

  const textBody = `
${reservation.name} 様

AVORIAZです。
以下のご予約のキャンセルが確定いたしました。

------------------------------------
■ キャンセルされたご予約
------------------------------------
予約ID: ${reservation.id}
申込種別: ${reservation.type}
チェックイン: ${formatDate(reservation.checkIn)}
プラン: ${reservation.plan}

またのご利用を心よりお待ちしております。

--
${FACILITY_NAME}
電話番号：0268-74-2704
メール：info@avoriaz.jp
`;

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #444; max-width: 600px; border: 1px solid #e0e0e0; padding: 0; background-color: #ffffff;">
      <div style="background-color: #78909C; color: #fff; padding: 25px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px;">ご予約キャンセル確定のお知らせ</h2>
      </div>

      <div style="padding: 30px 20px;">
        <p style="margin-bottom: 20px;">${reservation.name} 様</p>
        <p style="line-height: 1.6;">以下のご予約のキャンセルが確定いたしました。<br>ご利用をご検討いただき、ありがとうございました。</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align: left; padding: 12px 8px; color: #666; font-weight: normal; width: 30%;">予約ID</th>
            <td style="padding: 12px 8px;">${reservation.id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align: left; padding: 12px 8px; color: #666; font-weight: normal;">申込種別</th>
            <td style="padding: 12px 8px;">${reservation.type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align: left; padding: 12px 8px; color: #666; font-weight: normal;">チェックイン</th>
            <td style="padding: 12px 8px;"><strong>${formatDate(reservation.checkIn)}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align: left; padding: 12px 8px; color: #666; font-weight: normal;">プラン</th>
            <td style="padding: 12px 8px;">${reservation.plan}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
        <p style="margin: 5px 0; font-weight: bold; color: #555;">AVORIAZ</p>
        <p style="margin: 5px 0;">電話番号：0268-74-2704</p>
        <p style="margin: 5px 0;">Web: <a href="${FACILITY_WEB}" style="color: #37474F; text-decoration: none;">${FACILITY_WEB}</a></p>
      </div>
    </div>
  `;

  try {
    GmailApp.sendEmail(reservation.email, subject, textBody, {
      htmlBody: htmlBody,
      name: 'AVORIAZ',
      bcc: 'info@avoriaz.jp'
    });
    
    Logger.log('キャンセルメール送信完了: ' + reservation.email);
    saveEmailLog(reservation.id, 'キャンセル', reservation.email, reservation.name, subject, 'SUCCESS', '');
  
  } catch (e) {
    Logger.log('キャンセルメール送信エラー: ' + e.toString());
    saveEmailLog(reservation.id, 'キャンセル', reservation.email, reservation.name, subject, 'ERROR', e.toString());
  }
}


// --- 3. 満室お断りメール ---

function sendSoldOutMailFromAppSheet(id, lastName, firstName, email, type, checkIn, checkOut, plan, count, customMessage) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const reservation = {
    id: id,
    name: lastName + " " + firstName,
    email: email,
    type: type,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    plan: String(plan),
    count: count,
    customMessage: customMessage || ''
  };

  sendSoldOutEmailForAppSheet(reservation);
}

function sendSoldOutEmailForAppSheet(reservation) {
  // ★ 修正: タイトルをシンプルに
  const subject = `【AVORIAZ】ご予約に関するお詫び`;

  if (!reservation.email) {
    Logger.log('満室メール送信スキップ: メールアドレス未設定');
    saveEmailLog(reservation.id, '満室NG', '未設定', reservation.name, subject, 'SKIP', 'メールアドレスなし');
    return;
  }

  const customMessageBlockHtml = reservation.customMessage
    ? `<div style="background-color: #fefefe; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 4px;">
         <p style="margin: 0 0 10px; font-weight: bold; color: #555;">【施設からのメッセージ】</p>
         <p style="margin: 0; white-space: pre-wrap;">${reservation.customMessage}</p>
       </div>`
    : '';

  const textBody = `
${reservation.name} 様

この度は、ロッジ アボリアにご予約のお申し込みをいただき、誠にありがとうございます。
誠に恐縮ながら、お申し込みいただいた日程は、ご予約を承ることができませんでした。

${reservation.customMessage ? '--------------------\n【施設からのメッセージ】\n' + reservation.customMessage + '\n--------------------' : ''}

今回はご予約を承ることができませんが、またの機会にお待ちしております。
`;

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #444; max-width: 600px; border: 1px solid #e0e0e0; padding: 0; background-color: #ffffff;">
      <div style="background-color: #8D6E63; color: #fff; padding: 25px 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px; font-weight: normal;">ご予約に関するお詫び</h2>
      </div>
      <div style="padding: 40px 30px;">
        <p>${reservation.name} 様</p>
        <p>この度は、ロッジ アボリアにご予約のお申し込みをいただき、誠にありがとうございます。<br>
        誠に恐縮ながら、お申し込みいただいた日程は、ご予約を承ることができませんでした。</p>
        ${customMessageBlockHtml}
        <p>今回はご予約を承ることができませんが、またの機会にお待ちしております。</p>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee;">
        <p style="margin: 5px 0; font-weight: bold; color: #8D6E63;">AVORIAZ</p>
        <p style="margin: 5px 0;">電話番号：0268-74-2704</p>
        <p style="margin: 5px 0;">Web: <a href="${FACILITY_WEB}" style="color: #8D6E63; text-decoration: none;">${FACILITY_WEB}</a></p>
      </div>
    </div>
  `;

  try {
    GmailApp.sendEmail(reservation.email, subject, textBody, {
      htmlBody: htmlBody,
      name: 'AVORIAZ',
      bcc: 'info@avoriaz.jp'
    });
    saveEmailLog(reservation.id, '満室NG', reservation.email, reservation.name, subject, 'SUCCESS', '');
  } catch (e) {
    saveEmailLog(reservation.id, '満室NG', reservation.email, reservation.name, subject, 'ERROR', e.toString());
  }
}


// --- 4. 共通ヘルパー関数 ---

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm");
}

function createIcsContent(res) {
  const formatIcsDate = (d) => Utilities.formatDate(d, "GMT", "yyyyMMdd'T'HHmm00'Z'");
  const now = formatIcsDate(new Date());
  const start = formatIcsDate(res.checkIn);
  const end = formatIcsDate(res.checkOut);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AVORIAZ Reservation//JP",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + Utilities.getUuid() + "@avoriaz.jp",
    "DTSTAMP:" + now,
    "DTSTART:" + start,
    "DTEND:" + end,
    "SUMMARY:宿泊予約：AVORIAZ",
    "DESCRIPTION:ご予約ありがとうございます。\\n予約ID: " + res.id + "\\nプラン: " + res.plan + "\\nチェックイン: " + formatDate(res.checkIn),
    "LOCATION:" + FACILITY_ADDRESS, 
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}