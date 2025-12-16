// ==========================================================
// EmailTrigger.gs - メール自動取込 (主に楽天トラベル用)
// ==========================================================

// --- 楽天メールからデータを抽出 ---
function extractDataFromMailBody_Rakuten(body, status) {
  const result = {};
  
  result.楽天メールID = body.match(/予約番号\s*:\s*(RY[a-zA-Z0-9]{8})/)?.[1] || '';
  
  const checkInDateTime = body.match(/チェックイン日時\s*:\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/)?.[1] || '';
  const checkOutDate = body.match(/チェックアウト日時\s*:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  
  const checkInDate = checkInDateTime.split(' ')[0] || '';
  const rawCheckInTime = checkInDateTime.split(' ')[1] || ''; 
  const checkOutDateOnly = checkOutDate || '';
  
  result.チェックイン日 = checkInDate.replace(/-/g, '/'); 
  result.チェックイン時刻 = rawCheckInTime ? rawCheckInTime + ':00' : ''; 
  result.チェックアウト日 = checkOutDateOnly.replace(/-/g, '/'); 
  result.チェックアウト時刻 = '10:00:00'; 
  
  // 人数・プラン
  const rawNinzuuStr = body.match(/人数\s*:\s*(.*?)\n/s)?.[1].trim() || '';
  result.宿泊人数_RAW = rawNinzuuStr; 
  result.楽天部屋タイプ = body.match(/部屋タイプ\s*:\s*(.*?)\n/s)?.[1].trim() || '';
  
  // ★ 修正: プラン自動判定ロジック (夕食不要フラグ連動)
  const rawPlan = body.match(/宿泊プラン\s*:\s*(.*?)\n/s)?.[1].trim() || '';
  result.予約詳細 = rawPlan; // 元のプラン名は「予約詳細」へ保存

  // キーワード判定
  let detectedPlan = 'その他';
  let dinnerSkip = ''; // ブランクで初期化(その他用)

  if (rawPlan.includes('２食') || rawPlan.includes('2食')) {
    detectedPlan = '1泊2食';
    dinnerSkip = false; // 夕食あり
  } else if (rawPlan.includes('朝食') || rawPlan.includes('朝のみ')) {
    detectedPlan = '1泊朝食付';
    dinnerSkip = true;  // 夕食なし
  } else if (rawPlan.includes('素泊') || rawPlan.includes('食事なし') || rawPlan.includes('食事無')) {
    detectedPlan = '食事なし';
    dinnerSkip = true;  // 夕食なし
  }

  result.楽天宿泊プラン = detectedPlan; // システム用プラン名
  result.noDinner = dinnerSkip;         // 夕食不要フラグ
  
  const amountMatch = body.match(/合計\(A\)\s*:\s*(\d+)\s*円/);
  result.最終請求金額 = amountMatch ? parseInt(amountMatch[1], 10) : '';

  // 氏名・連絡先
  const travelerNameMatch = body.match(/宿泊者氏名\s*:\s*(.*?)\n/s); 
  const rawHiraganaName = travelerNameMatch ? travelerNameMatch[1].trim() : '';
  const namesHiragana = rawHiraganaName.split(/\s+/).filter(n => n.length > 0);
  result.ふりがな_せい = namesHiragana[0] || '';
  result.ふりがな_めい = namesHiragana.length > 1 ? namesHiragana.slice(1).join(' ') : '';
  
  const memberNameMatch = body.match(/会員氏名\s*:\s*(.*?)\n/s); 
  const rawKanjiName = memberNameMatch ? memberNameMatch[1].trim() : '';
  const namesKanji = rawKanjiName.split(/\s+/).filter(n => n.length > 0);
  result.氏名_せい = namesKanji[0] || ''; 
  result.氏名_めい = namesKanji.length > 1 ? namesKanji.slice(1).join(' ') : ''; 

  // 楽天は「会員連絡先」を優先
  const memberPhoneMatch = body.match(/会員連絡先\s*:\s*([\d\s-]+)/);
  result.電話番号 = memberPhoneMatch ? memberPhoneMatch[1].trim() : '';

  result.Email = body.match(/会員E-mail\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1].trim() || '';
  
  const raw申込日時 = body.match(/予約受付日時\s*:\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/)?.[1] || '';
  result.申込日時 = raw申込日時.replace(/-/g, '/');
  
  // ★ 修正: 楽天の人数を解析 (幼児対応)
  let adultCount = 0;
  let childCount = 0;
  let toddlerMealCount = 0;
  let toddlerNoMealCount = 0;

  if (rawNinzuuStr) {
    const adultMatch = rawNinzuuStr.match(/大人(\d+)人/); 
    const childMatch = rawNinzuuStr.match(/子供(\d+)名/); 
    // 幼児の簡易マッチング (詳細は楽天メールの形式次第)
    const toddlerMatch = rawNinzuuStr.match(/幼児.*?(\d+)名/);

    if (adultMatch) adultCount = parseInt(adultMatch[1], 10);
    if (childMatch) childCount = parseInt(childMatch[1], 10);
    if (toddlerMatch) toddlerNoMealCount = parseInt(toddlerMatch[1], 10); // 一旦「食事なし」にまとめる
  }
  result.adults = adultCount; 
  result.children = childCount; 
  result.toddler_meal = toddlerMealCount;
  result.toddler_no_meal = toddlerNoMealCount;

  if (!result.楽天メールID || !result.チェックイン日) {
    Logger.log('スキップ: 必須情報不足');
    return null;
  }
  
  result.予約ステータス = status;
  return result;
}

// --- HPフォームメールはスキップ (Webhook対応済み) ---
function extractDataFromMailBody_HP(body, status, reservationSource) { 
  // Webhook化に伴いスキップ
  return {};
}

// --- メイン実行関数 ---
function processEmail(message) {
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_RESERVATION);

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let reservationSource = { route: '', service: '' };
  let extractedData = null;
  let bookingId = null;
  let status = '';
  
  if (subject.includes('楽天トラベル')) {
    reservationSource.route = '楽天トラベル';
    if (subject.includes('予約通知')) status = 'プール'; 
    else if (subject.includes('キャンセル通知')) status = 'キャンセル';
    else { message.markRead(); return; }
    
    extractedData = extractDataFromMailBody_Rakuten(body, status);
    bookingId = extractedData ? extractedData.楽天メールID : null;

  } else if (subject.includes('AVORIAZ【HP予約_')) {
    Logger.log('HP予約メール検出(スキップ): ' + subject);
    message.markRead(); 
    return; 

  } else if (subject.includes('AVORIAZ【HPお問い合わせ】')) {
    Logger.log('HPお問い合わせメール検出(スキップ): ' + subject);
    message.markRead(); 
    return;

  } else {
    message.markRead();
    return; 
  }
  
  if (!extractedData || !bookingId) {
    message.markRead();
    return;
  }

  // 重複チェック (楽天ID)
  let foundRow = -1;
  const rakutenIdIndex = headers.indexOf('楽天メールID');
  const statusIndex = headers.indexOf('予約ステータス');
  const idIndex = headers.indexOf('予約ID');
  
  if (reservationSource.route === '楽天トラベル' && rakutenIdIndex !== -1) {
    for (let k = 1; k < data.length; k++) {
      if (data[k][rakutenIdIndex] === bookingId) {
        foundRow = k + 1;
        break;
      }
    }
  }

  // 登録または更新
  if (status === 'キャンセル' && foundRow !== -1) {
    sheet.getRange(foundRow, statusIndex + 1).setValue('キャンセル');
    const reservationId = data[foundRow - 1][idIndex];
    if (reservationId) deleteOccupancyRecords(reservationId);
    
    // ★ 追加: キャンセル時の操作ログ保存
    try {
      const logSheet = ss.getSheetByName('99_Operation_Log');
      if (logSheet) {
        const logId = 'LOG_' + Utilities.getUuid().substring(0, 8);
        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
        logSheet.appendRow([
          logId,
          timestamp,
          reservationId,
          'System (Rakuten)',
          'キャンセル通知受信: ステータス変更(確定→キャンセル)'
        ]);
      }
    } catch(e) {
      Logger.log('ログ保存エラー: ' + e.toString());
    }

    Logger.log('楽天キャンセル処理完了: ' + bookingId);
    
  } else if (status === 'プール' && foundRow === -1) { 
    const newRow = createNewReservationRow(headers, extractedData, reservationSource);
    if (newRow.length > 0) {
      sheet.appendRow(newRow);
      Logger.log('新規予約追加完了: ' + bookingId);
    }
  }
  
  message.markRead();
}

function checkReservations() {
  Logger.log('GAS実行開始: メールチェック');
  try {
    const threads = GmailApp.search(SEARCH_QUERY);
    for (let i = 0; i < threads.length; i++) {
      const messages = threads[i].getMessages();
      for (let j = 0; j < messages.length; j++) {
        processEmail(messages[j]);
      }
    }
  } catch(e) {
    Logger.log('エラー: ' + e.toString());
  }
}