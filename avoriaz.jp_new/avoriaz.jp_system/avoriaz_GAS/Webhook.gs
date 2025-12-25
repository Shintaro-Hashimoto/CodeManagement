// ==========================================================
// Webhook.gs - フォーム受信 & Square決済通知 (doPost) 【修正版】
// ==========================================================

// ★ Square Signature Key
const SQUARE_SIGNATURE_KEY = '_vPAnA9vGB9lQ8kOy0m7kw';
const NOTIFICATION_URL = ScriptApp.getService().getUrl(); 

function doPost(e) {
  try {
    // ----------------------------------------------------
    // 1. Squareからの通知かどうか判定
    // ----------------------------------------------------
    if (isSquareRequest(e)) {
      return handleSquarePayment(e);
    }

    // ----------------------------------------------------
    // 2. 既存のHPフォーム/キャンセル処理 (JSONパース)
    // ----------------------------------------------------
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("No Data");
    }
    const jsonData = JSON.parse(e.postData.contents);
    
    // 分岐: キャンセル処理
    if (jsonData['reservation-id']) {
      return handleWebCancellation(jsonData);
    }

    // 分岐: お問い合わせ処理
    if (jsonData['your-subject'] || jsonData['your-message']) {
      return handleWebInquiry(jsonData);
    }

    // --- 以下、通常の新規予約処理 ---
    const extractedData = parseWebhookData(jsonData);
    const reservationSource = identifySourceFromWebhook(jsonData);
    
    // ★★★ 修正箇所: 判定不能（食事プランなし）の救済措置 ★★★
    // PHP側からmeal-planが送られず判定できない場合、強制的に「宿泊」とする
    if (!reservationSource.service) {
       Logger.log('サービス種別が判定できないため、「宿泊」として処理します');
       reservationSource.service = '宿泊';
    }
    
    // データ不備のチェック
    if (!extractedData || !reservationSource.service) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid Data'}));
    }
    
    const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_RESERVATION);
    const headers = sheet.getDataRange().getValues()[0];
    
    // Utils.gsの関数を使用して行を作成
    const newRow = createNewReservationRow(headers, extractedData, reservationSource);
    
    if (newRow.length > 0) {
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Reservation Created'}));
    } else {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Row Creation Failed'}));
    }
    
  } catch (error) {
    Logger.log('Webhook Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}));
  }
}

// ----------------------------------------------------------
// ★ 新機能: Square決済通知の処理
// ----------------------------------------------------------
function isSquareRequest(e) {
  // Squareからのリクエストには必ずこの署名ヘッダーが含まれる
  return e.postData && e.postData.type === "application/json" && e.requestHeaders && e.requestHeaders['x-square-hmac-sha256'];
}

function handleSquarePayment(e) {
  const signature = e.requestHeaders['x-square-hmac-sha256'];
  const body = e.postData.contents;
  
  // 署名検証
  if (!validateSquareSignature(body, signature)) {
    Logger.log('Square Signature Verification Failed');
    return ContentService.createTextOutput('Signature Mismatch').setMimeType(ContentService.MimeType.TEXT); 
  }

  const json = JSON.parse(body);
  
  // テスト通知などはスキップ
  if (json.type !== 'payment.updated') {
    return ContentService.createTextOutput('Event Ignored').setMimeType(ContentService.MimeType.TEXT);
  }

  const paymentObj = json.data.object.payment;
  const paymentId = paymentObj.id;
  const status = paymentObj.status;
  const amount = paymentObj.amount_money.amount; 
  const currency = paymentObj.amount_money.currency;
  const note = paymentObj.note || ''; 
  
  // 予約IDの抽出
  const reservationIdMatch = note.match(/(G[a-zA-Z0-9]{7})/);
  const reservationId = reservationIdMatch ? reservationIdMatch[1] : '';

  // スプレッドシートへ保存
  savePaymentToSheet(paymentId, reservationId, amount, currency, status, note, JSON.stringify(json));

  return ContentService.createTextOutput('Payment Processed').setMimeType(ContentService.MimeType.TEXT);
}

function validateSquareSignature(body, signature) {
  const payload = NOTIFICATION_URL + body;
  const rawSignature = Utilities.computeHmacSha256Signature(payload, SQUARE_SIGNATURE_KEY);
  const computedSignature = Utilities.base64Encode(rawSignature);
  return signature === computedSignature;
}

function savePaymentToSheet(paymentId, reservationId, amount, currency, status, note, rawData) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('15_Payments'); 
  
  if (!sheet) {
    Logger.log('Error: 15_Payments Sheet not found');
    return;
  }
  
  // 重複チェック
  const data = sheet.getDataRange().getValues();
  if (data.length > 1) {
    const squareIdIndex = 7; 
    for (let i = 1; i < data.length; i++) {
      if (data[i][squareIdIndex] === paymentId) {
        Logger.log('Duplicate Payment Notification: ' + paymentId);
        return; 
      }
    }
  }

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  const appSheetId = 'PAY_' + Utilities.getUuid().substring(0, 8); 

  sheet.appendRow([
    appSheetId,    // PaymentID
    timestamp,     // 日時
    reservationId, // 予約ID (Ref)
    amount,        // 金額
    currency,      // 通貨
    status,        // ステータス
    note,          // メモ
    paymentId,     // SquareID
    rawData        // RawData
  ]);
  
  Logger.log(`Square決済保存: ${amount}円 (予約ID: ${reservationId})`);
}

// ----------------------------------------------------------
// ★ 既存機能: Webお問い合わせ処理関数 (そのまま維持)
// ----------------------------------------------------------
function handleWebInquiry(data) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_INQUIRY);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Inquiry Sheet Not Found'}));
  }

  // 1. 顧客IDの取得・生成
  const tempExtractedData = {
    氏名_せい: (data['your-name'] || '').split(/\s+/)[0],
    氏名_めい: (data['your-name'] || '').split(/\s+/)[1] || '',
    ふりがな_せい: (data['your-name'] || '').split(/\s+/)[0],
    ふりがな_めい: (data['your-name'] || '').split(/\s+/)[1] || '',
    電話番号: data['your-tel'] || '',
    Email: data['your-email'] || ''
  };
  
  const reservationSource = { route: 'フォーム' }; 
  const customerId = getOrCreateCustomerId(tempExtractedData, reservationSource);
  
  // 2. ID生成
  const inquiryId = 'INQ_' + Utilities.getUuid().substring(0, 8);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  
  // 3. 保存
  sheet.appendRow([
    inquiryId,
    timestamp,
    customerId,
    '', 
    data['your-name'],
    data['your-email'],
    data['your-tel'],
    Array.isArray(data['your-subject']) ? data['your-subject'].join(', ') : (data['your-subject'] || ''),
    data['your-message'],
    '未対応', 
    ''
  ]);
  
  Logger.log(`お問い合わせ保存完了(Webhook): ${inquiryId}`);
  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Inquiry Saved'}));
}

// ----------------------------------------------------------
// Webキャンセル処理 (そのまま維持)
// ----------------------------------------------------------
function handleWebCancellation(data) {
  const inputId = data['reservation-id'].trim();
  const inputEmail = data['your-email'].trim();
  const cancelReason = data['cancellation-reason'] || '理由なし';
  
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const resSheet = ss.getSheetByName(SHEET_NAME_RESERVATION);
  const resData = resSheet.getDataRange().getValues();
  const resHeaders = resData[0];
  
  const idIndex = resHeaders.indexOf('予約ID');
  const refCustIndex = resHeaders.indexOf('顧客ID (Ref)');
  const statusIndex = resHeaders.indexOf('予約ステータス');
  const checkInDateIndex = resHeaders.indexOf('チェックイン日');
  const typeIndex = resHeaders.indexOf('申込種別');
  const planIndex = resHeaders.indexOf('プラン');
  const alertIndex = resHeaders.indexOf('キャンセル申請'); 
  
  let targetRowIndex = -1;
  let customerId = '';
  let checkInDateStr = '';
  let serviceType = '';
  let planName = '';
  
  for (let i = 1; i < resData.length; i++) {
    if (resData[i][idIndex] === inputId) {
      targetRowIndex = i + 1; 
      customerId = resData[i][refCustIndex];
      checkInDateStr = resData[i][checkInDateIndex];
      serviceType = resData[i][typeIndex];
      planName = resData[i][planIndex];
      
      if (resData[i][statusIndex] === 'キャンセル') {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Already Cancelled'}));
      }
      break;
    }
  }
  
  if (targetRowIndex === -1) {
    saveUnknownCancelToInquiry(inputId, inputEmail, data['your-name'], cancelReason);
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Reservation Not Found'}));
  }
  
  const custSheet = ss.getSheetByName(SHEET_NAME_CUSTOMER);
  const custData = custSheet.getDataRange().getValues();
  const custHeaders = custData[0];
  const custIdIndex = custHeaders.indexOf('CustomerID');
  const emailIndex = custHeaders.indexOf('メールアドレス');
  const lNameIndex = custHeaders.indexOf('姓');
  const fNameIndex = custHeaders.indexOf('名');
  
  let registeredEmail = '';
  let lastName = '';
  let firstName = '';
  
  for (let i = 1; i < custData.length; i++) {
    if (custData[i][custIdIndex] === customerId) {
      registeredEmail = custData[i][emailIndex];
      lastName = custData[i][lNameIndex];
      firstName = custData[i][fNameIndex];
      break;
    }
  }
  
  if (registeredEmail !== inputEmail) {
    const msg = `【要確認】メール不一致 (入力: ${inputEmail})`;
    if (alertIndex !== -1) {
      resSheet.getRange(targetRowIndex, alertIndex + 1).setValue(msg);
    }
    Logger.log(msg);
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Email Mismatch'}));
  }

  const checkInDate = new Date(checkInDateStr);
  const today = new Date();
  checkInDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  const diffTime = checkInDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const currentYear = checkInDate.getFullYear();
  const summerStart = new Date(currentYear, 6, 15); 
  const summerEnd = new Date(currentYear, 7, 31);   
  const isSummer = (checkInDate >= summerStart && checkInDate <= summerEnd);

  let isPolicyApplicable = false;
  let policyMsg = "";

  if (isSummer) {
    isPolicyApplicable = true;
    policyMsg = "夏期期間(7/15-8/31)";
  } else if (diffDays <= 14) {
    isPolicyApplicable = true;
    policyMsg = `宿泊の${diffDays}日前`;
  }

  if (isPolicyApplicable) {
    const alertMsg = `【要確認】ポリシー該当: ${policyMsg}のため自動停止。理由: ${cancelReason}`;
    if (alertIndex !== -1) {
      resSheet.getRange(targetRowIndex, alertIndex + 1).setValue(alertMsg);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', 
      message: 'Cancellation Policy',
      details: `キャンセル料が発生する期間（${policyMsg}）のため、Webからの自動キャンセルはできません。`
    }));
  }
  
  resSheet.getRange(targetRowIndex, statusIndex + 1).setValue('キャンセル');
  if (alertIndex !== -1) resSheet.getRange(targetRowIndex, alertIndex + 1).setValue("");
  
  deleteOccupancyRecords(inputId);
  
  sendCancellationMailFromAppSheet(
    inputId, lastName, firstName, inputEmail, serviceType, checkInDateStr, '', planName, 0
  );

  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Cancelled'}));
}


function parseWebhookData(data) {
  const result = {};
  result.HPメールID = 'WEB_' + Utilities.getUuid(); 
  result.予約ステータス = 'プール'; 
  
  const fullName = data['your-name'] || '';
  const names = fullName.split(/\s+/);
  result.氏名_せい = names[0] || '';
  result.氏名_めい = names.length > 1 ? names.slice(1).join(' ') : '';
  result.ふりがな_せい = result.氏名_せい; 
  result.ふりがな_めい = result.氏名_めい;

  result.Email = data['your-email'] || '';
  result.電話番号 = data['your-tel'] || '';
  
  result.adults = data['num-adult'] ? parseInt(String(data['num-adult'])) : 0;
  result.children = data['num-child'] ? parseInt(String(data['num-child'])) : 0;
  result.toddler_meal = data['num-toddler-meal'] ? parseInt(String(data['num-toddler-meal'])) : 0;
  result.toddler_no_meal = data['num-toddler-no-meal'] ? parseInt(String(data['num-toddler-no-meal'])) : 0;
  
  const rawMeal = data['meal-plan'];
  if (Array.isArray(rawMeal)) {
    result.HP食事プラン = rawMeal.join(', ');
  } else {
    result.HP食事プラン = rawMeal || '';
  }

  const rawDetails = data['details'] || data['memo'];
  let detailText = '';
  if (Array.isArray(rawDetails)) {
    detailText = rawDetails.join('\n');
  } else {
    detailText = rawDetails || '特になし';
  }

  const arrivalTimeSelection = data['arrival-time'];
  let arrivalTimeText = '';
  if (arrivalTimeSelection) {
    arrivalTimeText = Array.isArray(arrivalTimeSelection) ? arrivalTimeSelection.join(', ') : arrivalTimeSelection;
    result.予約詳細 = `【ご到着予定】${arrivalTimeText}\n\n${detailText}`;
  } else {
    result.予約詳細 = detailText;
  }

  result.申込日時 = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');

  if (data['start-hour']) {
     const dateStr = String(data['booking-date']).replace(/-/g, '/');
     const hourStr = String(data['start-hour']);
     const minStr = String(data['start-minute']);
     const timeStr = `${hourStr}:${minStr}`;
     try {
       const checkInDateTime = new Date(`${dateStr}T${timeStr}:00`);
       const checkOutDateTime = new Date(checkInDateTime.getTime());
       checkOutDateTime.setHours(checkOutDateTime.getHours() + 3);
       const timeZone = Session.getScriptTimeZone();
       result.チェックイン日 = Utilities.formatDate(checkInDateTime, timeZone, 'yyyy/MM/dd');
       result.チェックイン時刻 = Utilities.formatDate(checkInDateTime, timeZone, 'HH:mm:ss');
       result.チェックアウト日 = Utilities.formatDate(checkOutDateTime, timeZone, 'yyyy/MM/dd');
       result.チェックアウト時刻 = Utilities.formatDate(checkOutDateTime, timeZone, 'HH:mm:ss');
     } catch(e) {
       result.チェックイン日 = dateStr;
     }
  } else {
     // ★ PHPから来るハイフン日付をここでスラッシュに変換
     result.チェックイン日 = (String(data['checkin-date']) || '').replace(/-/g, '/');
     result.チェックアウト日 = (String(data['checkout-date']) || '').replace(/-/g, '/');
     
     let checkInTime = '15:00:00'; 
     if (arrivalTimeSelection) {
       const atStr = String(arrivalTimeSelection); 
       if (atStr.includes('午前中') || atStr.includes('午後')) checkInTime = '15:00:00';
       else if (atStr.includes('18:00')) checkInTime = '18:00:00';
       else if (atStr.includes('20:00')) checkInTime = '20:00:00';
       else if (atStr.includes('深夜')) checkInTime = '23:30:00';
     }
     result.チェックイン時刻 = checkInTime;
     result.チェックアウト時刻 = '10:00:00'; 
  }
  
  return result;
}

function identifySourceFromWebhook(data) {
  const source = { route: 'フォーム', service: '' };
  if (data['meal-plan']) {
    source.service = '宿泊';
  } else if (data['start-hour']) {
    source.service = 'サウナ';
  } else if (data['rental'] || (data['details'] && !data['meal-plan'])) { 
    source.service = 'キャンプ';
  }
  return source;
}

// ----------------------------------------------------------
// ID不一致キャンセルを問い合わせシートに保存
// ----------------------------------------------------------
function saveUnknownCancelToInquiry(inputId, email, name, reason) {
  try {
    const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_INQUIRY); 
    
    if (!sheet) return;

    const inquiryId = 'INQ_' + Utilities.getUuid().substring(0, 8);
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
    
    const message = `【自動保存】キャンセル申請がありましたが、予約ID不一致のため自動処理されませんでした。\n` +
                    `入力されたID: ${inputId}\n` +
                    `入力された理由: ${reason}`;

    sheet.appendRow([
      inquiryId, timestamp, '', inputId, name || '不明', email, '',
      'キャンセルID不一致', message, '未対応', ''
    ]);
    
    Logger.log(`ID不一致キャンセルを問い合わせに保存: ${inquiryId}`);
    
  } catch (e) {
    Logger.log('ID不一致保存エラー: ' + e.toString());
  }
}