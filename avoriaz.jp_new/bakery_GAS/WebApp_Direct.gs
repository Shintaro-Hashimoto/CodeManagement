// ==================================================
// 2. Web API 直接登録 (WebApp_Direct.gs)
// 役割: 新HPフォームから管理DBへ直接書き込む + 自動返信
// ★修正: 注文確認メールの冒頭に温かいメッセージを追加
// ==================================================

// 店舗情報（ご自宅用の送り主として登録）
const SHOP_SENDER_INFO = {
  name: 'パン工房MARIKO',
  postal: '386-2211',
  address: '長野県須坂市仁礼峰の原高原3153-166',
  building: '',
  phone: '0268-74-2760'
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return ContentService.createTextOutput(JSON.stringify({'result': 'error', 'error': 'Server Busy'})).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const orderSheet = ss.getSheetByName(SHEET_ORDERS);
    const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);
    const senderSheet = ss.getSheetByName(SHEET_SENDERS);
    const customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);

    const params = JSON.parse(e.postData.contents);
    const now = new Date();

    // 二重送信防止チェック
    const lastRow = orderSheet.getLastRow();
    if (lastRow > 1) {
      const headers = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
      const emailIdx = headers.indexOf('ご注文者Email');
      const dateIdx = headers.indexOf('注文日時');
      if (emailIdx > -1 && dateIdx > -1) {
        const lastOrderValues = orderSheet.getRange(lastRow, 1, 1, orderSheet.getLastColumn()).getValues()[0];
        const lastEmail = lastOrderValues[emailIdx];
        const lastDate = new Date(lastOrderValues[dateIdx]);
        const diffTime = now.getTime() - lastDate.getTime();
        if (lastEmail === params.orderer_email && diffTime < 60000 && diffTime >= 0) {
          return ContentService.createTextOutput(JSON.stringify({'result': 'success', 'orderId': 'DUPLICATE_SKIP'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 1. 顧客処理
    const customerId = getOrCreateCustomerId(customerSheet, {
      name: params.orderer_name,
      email: params.orderer_email,
      phone: params.orderer_phone
    });
    SpreadsheetApp.flush();

    // 2. 送り主処理
    let senderId = '';
    if (params.order_purpose === 'プレゼント用' && params.sender_name) {
      senderId = getOrCreateSenderId(senderSheet, {
        name: params.sender_name,
        postal: params.sender_postal,
        address: params.sender_address,
        building: params.sender_building,
        phone: params.sender_phone
      });
    } else {
      senderId = getOrCreateSenderId(senderSheet, SHOP_SENDER_INFO);
    }
    SpreadsheetApp.flush();

    // 3. 注文親データ
    const orderId = 'ORD-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const oHeaders = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
    const newOrderRow = new Array(oHeaders.length).fill('');
    const setVal = (headerName, val) => {
      const idx = oHeaders.indexOf(headerName);
      if (idx > -1) newOrderRow[idx] = val;
    };

    const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    setVal('OrderID', orderId);
    setVal('表示名', `${dateStr}｜${params.orderer_name}`);
    setVal('注文日時', now);
    setVal('注文ステータス', '受付');
    setVal('ご注文者名', params.orderer_name);
    setVal('ご注文者Email', params.orderer_email);
    setVal('ご注文者電話番号', "'" + params.orderer_phone);
    setVal('ご注文数 (総計)', params.total_quantity);
    setVal('お届け希望日', params.delivery_date);
    setVal('注文目的', params.order_purpose);
    
    const invOpt = params.invoice_option;
    const invDetail = params.invoice_option_detail;
    setVal('請求書送付オプション', invDetail ? `${invOpt} (${invDetail})` : invOpt);
    setVal('請求書送付オプション_詳細', invDetail);
    
    setVal('備考', params.notes);
    setVal('SenderID (Ref)', senderId);
    setVal('CustomerID (Ref)', customerId);

    orderSheet.appendRow(newOrderRow);

    // 4. お届け先リスト
    const rHeaders = recipientSheet.getRange(1, 1, 1, recipientSheet.getLastColumn()).getValues()[0];
    const recipients = params.recipients;

    recipients.forEach(r => {
      const newRecipientRow = new Array(rHeaders.length).fill('');
      const setRVal = (headerName, val) => {
        const idx = rHeaders.indexOf(headerName);
        if (idx > -1) newRecipientRow[idx] = val;
      };

      setRVal('RecipientID', 'REC-' + Utilities.getUuid().substring(0, 8).toUpperCase());
      setRVal('OrderID (Ref)', orderId);
      setRVal('お届け先氏名', r.name);
      if(r.company) setRVal('お届け先会社名', r.company);
      if(r.department) setRVal('お届け先部署名', r.department);
      setRVal('お届け先郵便番号', formatPostalCode(r.postal));
      setRVal('お届け先住所', r.address);
      setRVal('お届け先建物名', r.building ? "'" + r.building : "");
      setRVal('お届け先電話番号', "'" + r.phone);
      setRVal('配送数量', r.quantity);

      recipientSheet.appendRow(newRecipientRow);
    });
    
    SpreadsheetApp.flush();

    // 5. 確認メール送信 & ログ記録
    try {
      sendOrderConfirmationEmail(params, orderId);
    } catch (mailError) {
      logEmailHistory(orderId, '注文確認', params.orderer_email, params.orderer_name, '注文確認メール', 'Error', mailError.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({'result': 'success', 'orderId': orderId})).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({'result': 'error', 'error': e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 自動返信メール送信関数
function sendOrderConfirmationEmail(data, orderId) {
  const subject = `【パン工房 MARIKO】ご注文ありがとうございます (注文ID: ${orderId})`;
  
  let recipientsText = '';
  data.recipients.forEach((r, i) => {
    const companyStr = r.company ? `(${r.company}${r.department ? ' ' + r.department : ''}) ` : '';
    recipientsText += `
[お届け先 ${i + 1}]
--------------------------------------------------
お名前　：${r.name} 様 ${companyStr}
郵便番号：${r.postal}
住所　　：${r.address} ${r.building || ''}
電話番号：${r.phone}
数量　　：${r.quantity} 個
--------------------------------------------------
`;
  });

  let senderText = '';
  if (data.order_purpose === 'プレゼント用') {
    senderText = `
■送り主様 (伝票ご依頼主)
--------------------------------------------------
お名前　：${data.sender_name} 様
郵便番号：${data.sender_postal}
住所　　：${data.sender_address} ${data.sender_building || ''}
電話番号：${data.sender_phone}
--------------------------------------------------
`;
  } else {
    senderText = '（ご注文者様からのご依頼として発送いたします）';
  }

  // ★ここを修正しました！
  const body = `
${data.orderer_name} 様

この度は、数ある中からロッジアボリア/パン工房MARIKOの
シュトーレンをご注文いただき、誠にありがとうございます。

今年も心を込めて焼き上げますので、どうぞ楽しみにお待ちください。

--------------------------------------------------
以下の内容でご注文を承りました。

内容を確認のうえ、発送準備を進めさせていただきます。
発送が完了しましたら、改めて「発送完了メール」にてご連絡差し上げます。

お問い合わせの際は、件名または以下の「注文ID」をお知らせください。

==================================================
■ご注文内容 (注文ID: ${orderId})
==================================================
注文日時　：${formatDate(new Date())}
ご注文数　：合計 ${data.total_quantity} 個
お届け希望：${data.delivery_date ? data.delivery_date.replace(/-/g, '/') : '指定なし'}
注文目的　：${data.order_purpose}
請求書送付：${data.invoice_option}${data.invoice_option_detail ? ' (' + data.invoice_option_detail + ')' : ''}

■ご注文者様
--------------------------------------------------
お名前　：${data.orderer_name} 様
Email 　：${data.orderer_email}
電話番号：${data.orderer_phone}
--------------------------------------------------
${senderText}

■お届け先一覧
${recipientsText}

■備考
${data.notes || 'なし'}

==================================================
※本メールは送信専用アドレスより自動送信されています。
お心当たりのない場合は、お手数ですが下記までご連絡ください。

菅平・峰の原高原 ロッジ アボリア
パン工房 MARIKO
URL: http://www.avoriaz.jp
==================================================
`;

  const options = {
    name: 'パン工房 MARIKO',
    bcc: 'info@avoriaz.jp', // 店舗控え (BCC)
    replyTo: 'info@avoriaz.jp'
  };

  if (data.orderer_email) {
    GmailApp.sendEmail(data.orderer_email, subject, body, options);
    // 成功ログ
    logEmailHistory(orderId, '注文確認', data.orderer_email, data.orderer_name, subject, 'Success', '');
  }
}