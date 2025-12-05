// ==================================================
// 5. ステータス変更通知メール (Notification_Trigger.gs)
// 役割: AppSheetからのトリガーで各種メールを送信する
// ==================================================

/**
 * [準備中] ステータスに変更された時の通知 (受注確定メール)
 */
function sendOrderConfirmedEmail(orderId) {
  sendEmailByStatus(orderId, 'CONFIRMED');
}

/**
 * [キャンセル] ステータスに変更された時の通知
 */
function sendOrderCancelledEmail(orderId) {
  sendEmailByStatus(orderId, 'CANCELLED');
}

/**
 * [発送済] ステータスに変更された時の通知 (既存機能)
 */
function sendShippingNotification(orderId) {
  sendEmailByStatus(orderId, 'SHIPPED');
}

// --------------------------------------------------
// 共通処理関数
// --------------------------------------------------
function sendEmailByStatus(orderId, type) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
  const orderSheet = ss.getSheetByName(SHEET_ORDERS);
  const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);

  const orders = getDataMap(orderSheet, 'OrderID');
  const order = orders[orderId];

  if (!order) {
    console.error('注文が見つかりません: ' + orderId);
    return;
  }

  // お届け先データ取得
  const recipientsData = recipientSheet.getDataRange().getValues();
  const rHeaders = recipientsData[0];
  const targetRecipients = [];

  for (let i = 1; i < recipientsData.length; i++) {
    const row = recipientsData[i];
    if (row[rHeaders.indexOf('OrderID (Ref)')] === orderId) {
      targetRecipients.push({
        name: row[rHeaders.indexOf('お届け先氏名')],
        postal: row[rHeaders.indexOf('お届け先郵便番号')],
        address: row[rHeaders.indexOf('お届け先住所')] + (row[rHeaders.indexOf('お届け先建物名')] || ''),
        trackingNumber: row[rHeaders.indexOf('伝票番号')] || '' 
      });
    }
  }

  // メール内容の分岐
  let subject = '';
  let bodyTitle = '';
  let bodyMessage = '';
  
  if (type === 'CONFIRMED') {
    subject = '【パン工房 MARIKO】ご注文を承りました';
    bodyTitle = 'ご注文確定のお知らせ';
    bodyMessage = `
      この度はご注文ありがとうございます。<br>
      パン工房 MARIKO です。<br><br>
      ご注文内容を確認し、正式に受注いたしました。<br>
      発送の準備が整い次第、改めてご連絡させていただきます。
    `;
  } else if (type === 'CANCELLED') {
    subject = '【パン工房 MARIKO】ご注文キャンセルのお知らせ';
    bodyTitle = 'ご注文キャンセル';
    bodyMessage = `
      パン工房 MARIKO です。<br><br>
      誠に残念ではございますが、以下のご注文をキャンセル処理いたしました。<br>
      ご不明な点がございましたら、お問い合わせください。
    `;
  } else if (type === 'SHIPPED') {
    subject = '【パン工房 MARIKO】商品を発送いたしました';
    bodyTitle = '発送のお知らせ';
    bodyMessage = `
      いつもご利用ありがとうございます。<br>
      パン工房 MARIKO です。<br><br>
      ご注文いただきました商品を、本日発送いたしました。<br>
      到着まで今しばらくお待ちくださいませ。
    `;
  }

  // HTML生成
  const htmlBody = createHtmlEmailBody(order, targetRecipients, bodyTitle, bodyMessage, type);
  const recipientEmail = order['ご注文者Email'];
  const customerName = order['ご注文者名'];

  const options = {
    htmlBody: htmlBody,
    name: 'パン工房 MARIKO',
    // bcc: 'info@avoriaz.jp', // 必要ならON
    replyTo: 'info@avoriaz.jp'
  };

  if (recipientEmail) {
    try {
      GmailApp.sendEmail(recipientEmail, subject, 'このメールはHTML形式です。', options);
      logEmailHistory(orderId, type, recipientEmail, customerName, subject, 'Success', '');
      console.log('メール送信完了: ' + type);
    } catch (e) {
      logEmailHistory(orderId, type, recipientEmail, customerName, subject, 'Error', e.toString());
    }
  }
}

// HTMLメール生成 (汎用化)
function createHtmlEmailBody(order, recipients, title, message, type) {
  let recipientsHtml = '';
  recipients.forEach((r, i) => {
    // 発送通知の時だけ伝票番号を出す
    let trackingHtml = '';
    if (type === 'SHIPPED' && r.trackingNumber) {
      trackingHtml = `<p style="margin: 8px 0 0; font-weight:bold; color:#2C5F2D;">伝票番号: ${r.trackingNumber}</p>
         <p style="margin: 2px 0 0; font-size:0.85em;"><a href="http://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.NQ0010?id=${r.trackingNumber}" style="color:#2C5F2D;">配送状況を確認する</a></p>`;
    }

    recipientsHtml += `
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #2C5F2D;">
        <p style="margin: 0; font-weight: bold; color: #333;">お届け先 ${i + 1}</p>
        <p style="margin: 5px 0 0;">${r.name} 様</p>
        <p style="margin: 0; font-size: 0.9em; color: #666;">〒${r.postal} ${r.address}</p>
        ${trackingHtml}
      </div>
    `;
  });

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="background-color: #2C5F2D; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${title}</h1>
      </div>
      <div style="padding: 20px;">
        <p>${order['ご注文者名']} 様</p>
        <p>${message}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <h3 style="color: #2C5F2D; font-size: 16px;">■ ご注文内容</h3>
        ${recipientsHtml}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.9em; color: #666;">
          ※本メールは送信専用アドレスより自動送信されています。
        </p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 0.8em; color: #666;">
        <p style="margin: 0;"><strong>パン工房 MARIKO</strong></p>
        <p style="margin: 5px 0;">菅平・峰の原高原 ロッジ アボリア</p>
        <p style="margin: 0;"><a href="https://www.avoriaz.jp/" style="color: #2C5F2D; text-decoration: none;">https://www.avoriaz.jp/</a></p>
      </div>
    </div>
  `;
}

// 共通関数は _Common.gs にあるため削除