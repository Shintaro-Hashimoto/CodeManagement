// ==========================================================
// Webhook.gs - CF7からのデータ受信 (doPost)
// ==========================================================

function doPost(e) {
  try {
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
    
    if (!extractedData || !reservationSource.service) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid Data'}));
    }
    
    const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_RESERVATION);
    const headers = sheet.getDataRange().getValues()[0];
    
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
// ★ 新機能: Webお問い合わせ処理関数
// ----------------------------------------------------------
function handleWebInquiry(data) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_INQUIRY);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Inquiry Sheet Not Found'}));
  }

  // 1. 顧客IDの取得・生成 (既存の共通関数を利用)
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
    // ★ 修正: 配列文字化け対策
    Array.isArray(data['your-subject']) ? data['your-subject'].join(', ') : (data['your-subject'] || ''),
    data['your-message'],
    '未対応', 
    ''
  ]);
  
  Logger.log(`お問い合わせ保存完了(Webhook): ${inquiryId}`);
  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Inquiry Saved'}));
}

// ----------------------------------------------------------
// Webキャンセル処理
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
  
  // ★ 修正: 人数 (幼児追加・配列文字化け対策)
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