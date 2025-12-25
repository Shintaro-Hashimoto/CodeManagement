// ==========================================================
// Utils.gs - 共通関数 (DB操作・ログ保存) 【フラグ判定追加版】
// ==========================================================

// --- 顧客情報の検索と作成を行う関数 ---
function getOrCreateCustomerId(extractedData, reservationSource) { 
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const customerSheet = ss.getSheetByName(SHEET_NAME_CUSTOMER);

  if (!customerSheet) {
    Logger.log('エラー: 顧客マスタシートが見つかりません。');
    return '';
  }

  const data = customerSheet.getDataRange().getValues();
  const headers = data[0];
  
  const customerIdIndex = headers.indexOf('CustomerID'); 
  const familyNameKanjiIndex = headers.indexOf('姓');
  const givenNameKanjiIndex = headers.indexOf('名');
  const familyNameHiraIndex = headers.indexOf('ふりがな_せい'); 
  const givenNameHiraIndex = headers.indexOf('ふりがな_めい'); 
  const emailIndex = headers.indexOf('メールアドレス');
  const phoneIndex = headers.indexOf('電話番号');
  const registrationDateIndex = headers.indexOf('登録日');
  // ★ 追加: 削除フラグの列インデックス取得
  const deleteFlagIndex = headers.indexOf('削除フラグ'); 
  
  // 団体名がある場合はここに追加 (headers.indexOf('団体名'))

  // 重複チェック用データ
  const incomingFamilyName = extractedData.氏名_せい;
  const incomingPhone = extractedData.電話番号;
  const incomingEmail = extractedData.Email;

  // 1. 既存顧客の検索
  if (reservationSource.route === '楽天トラベル') {
    // 楽天の場合: 姓 + 会員連絡先 (2項目チェック)
    if (!incomingFamilyName || !incomingPhone) {
      Logger.log('楽天予約: 重複チェックに必要な情報（姓、会員連絡先）が不足。新規登録を試みます。');
    } else {
      for (let i = 1; i < data.length; i++) {
        if (data[i][familyNameKanjiIndex] === incomingFamilyName && 
            data[i][phoneIndex] === incomingPhone) {
          Logger.log('既存顧客IDを検出 (楽天/2項目): ' + data[i][customerIdIndex]);
          return String(data[i][customerIdIndex]).trim();
        }
      }
    }
  } else {
    // フォーム(Webhook/Mail)の場合: 姓 + 電話番号 + Email (3項目チェック)
    if (!incomingFamilyName || !incomingPhone || !incomingEmail) {
      Logger.log('フォーム予約: 重複チェックに必要な情報（姓、電話番号、Email）が不足。新規登録を試みます。');
    } else {
      for (let i = 1; i < data.length; i++) {
        if (data[i][familyNameKanjiIndex] === incomingFamilyName && 
            data[i][phoneIndex] === incomingPhone && 
            data[i][emailIndex] === incomingEmail) {
          Logger.log('既存顧客IDを検出 (フォーム/3項目): ' + data[i][customerIdIndex]);
          return String(data[i][customerIdIndex]).trim();
        }
      }
    }
  }

  // 2. 既存顧客がいなければ、新規レコードを作成
  Logger.log('新規顧客を作成します。');
  
  const newRow = new Array(headers.length).fill('');
  
  const uuid = Utilities.getUuid();
  const newCustomerId = 'CUS_' + uuid.substring(0, 7); 
  const currentTimestamp = new Date(); 
  
  if (customerIdIndex !== -1) newRow[customerIdIndex] = newCustomerId;
  
  if (familyNameKanjiIndex !== -1) newRow[familyNameKanjiIndex] = extractedData.氏名_せい;
  if (givenNameKanjiIndex !== -1) newRow[givenNameKanjiIndex] = extractedData.氏名_めい;
  if (familyNameHiraIndex !== -1) newRow[familyNameHiraIndex] = extractedData.ふりがな_せい;
  if (givenNameHiraIndex !== -1) newRow[givenNameHiraIndex] = extractedData.ふりがな_めい;
  if (emailIndex !== -1 && extractedData.Email) newRow[emailIndex] = extractedData.Email;
  if (phoneIndex !== -1 && extractedData.電話番号) newRow[phoneIndex] = extractedData.電話番号;
  if (registrationDateIndex !== -1) newRow[registrationDateIndex] = currentTimestamp;

  // ★ 追加: 削除フラグにFALSEを設定 (論理削除対応)
  if (deleteFlagIndex !== -1) {
    newRow[deleteFlagIndex] = false; 
  }

  customerSheet.appendRow(newRow);
  SpreadsheetApp.flush(); // 即時書き込みを強制
  return newCustomerId.trim();
}

// --- 抽出データをシートの列順に合わせた配列にする関数 ---
function createNewReservationRow(headers, extractedData, reservationSource) {
  const newRow = new Array(headers.length).fill('');
  
  // 予約IDを短縮ハッシュ形式に変更 (念のためtrim)
  const uuid = Utilities.getUuid();
  newRow[headers.indexOf('予約ID')] = ('G' + uuid.substring(0, 7)).trim();
  
  const customerId = getOrCreateCustomerId(extractedData, reservationSource); 
  newRow[headers.indexOf('顧客ID (Ref)')] = String(customerId).trim();
  
  // 予約経路と申込種別
  newRow[headers.indexOf('予約経路')] = reservationSource.route; 
  newRow[headers.indexOf('申込種別')] = reservationSource.service; 
  
  if (headers.indexOf('申込日時') !== -1) {
    newRow[headers.indexOf('申込日時')] = extractedData.申込日時;
  }
  
  // 日付・時間
  newRow[headers.indexOf('チェックイン日')] = extractedData.チェックイン日 || ''; 
  newRow[headers.indexOf('チェックアウト日')] = extractedData.チェックアウト日 || '';

  // ★ 修正: チェックイン時刻を変数に確保（夕食判定用）
  const checkInTime = extractedData.チェックイン時刻 || '';
  newRow[headers.indexOf('チェックイン時刻')] = checkInTime;

  newRow[headers.indexOf('チェックアウト時刻')] = extractedData.チェックアウト時刻 || ''; 
  
  // 人数 (★幼児対応)
  newRow[headers.indexOf('大人人数')] = extractedData.adults || ''; 
  newRow[headers.indexOf('子ども人数')] = extractedData.children || '';
  
  // ★ 追加: 幼児人数の書き込み
  const toddlerMealIndex = headers.indexOf('幼児_食事あり');
  if (toddlerMealIndex !== -1) {
    newRow[toddlerMealIndex] = extractedData.toddler_meal || '';
  }
  const toddlerNoMealIndex = headers.indexOf('幼児_食事なし');
  if (toddlerNoMealIndex !== -1) {
    newRow[toddlerNoMealIndex] = extractedData.toddler_no_meal || '';
  }
  
  newRow[headers.indexOf('宿泊人数')] = extractedData.宿泊人数_RAW || ''; 
  
  // デフォルト値設定 (メール送信済フラグ)
  if (headers.indexOf('メール送信済') !== -1) {
    newRow[headers.indexOf('メール送信済')] = false; 
  }

  // ★ 追加: メール送信しないフラグ (デフォルトFALSE)
  if (headers.indexOf('メール送信しない') !== -1) {
    newRow[headers.indexOf('メール送信しない')] = false; 
  }

  // 申込種別の補完
  if (reservationSource.route === '楽天トラベル') {
    newRow[headers.indexOf('申込種別')] = '宿泊'; 
  }
  
  newRow[headers.indexOf('割当施設 (Ref)')] = ''; 
  newRow[headers.indexOf('予約ステータス')] = extractedData.予約ステータス; 
  
  // 楽天固有情報
  if (reservationSource.route === '楽天トラベル') {
    newRow[headers.indexOf('楽天メールID')] = extractedData.楽天メールID;
    newRow[headers.indexOf('最終請求金額')] = extractedData.最終請求金額;
    newRow[headers.indexOf('楽天部屋タイプ')] = extractedData.楽天部屋タイプ;
  } 
  
  // 予約詳細への書き込み (楽天も含む)
  if (headers.indexOf('予約詳細') !== -1 && extractedData.予約詳細) {
    newRow[headers.indexOf('予約詳細')] = extractedData.予約詳細;
  }

  // プラン情報 (J列) - ★ 修正: プラン名を変数に確保（夕食判定用）
  const planIndex = headers.indexOf('プラン'); 
  let planName = ''; // 変数定義
  if (planIndex !== -1) {
    if (reservationSource.route === '楽天トラベル') {
      planName = extractedData.楽天宿泊プラン || ''; 
    } else if (reservationSource.route === 'フォーム') {
      planName = extractedData.HP食事プラン || '';
    }
    newRow[planIndex] = planName;
  }

  // ★ 修正: 夕食不要フラグの自動判定
  if (headers.indexOf('夕食不要') !== -1) {
    let isNoDinner = false;

    // 1. 時間判定 (18:00:00以降ならTRUE)
    if (checkInTime >= '18:00:00') {
      isNoDinner = true;
    }

    // 2. プラン判定 (朝食のみの場合TRUE)
    if (planName.includes('朝食') && !planName.includes('2食')) {
      isNoDinner = true;
    }
    
    // 3. 楽天データの優先
    if (reservationSource.route === '楽天トラベル' && extractedData.noDinner !== undefined && extractedData.noDinner !== '') {
      isNoDinner = extractedData.noDinner;
    }

    newRow[headers.indexOf('夕食不要')] = isNoDinner;
  }
  
  // 配列生成
  const finalRow = headers.map(header => {
    const value = newRow[headers.indexOf(header)];
    return value !== undefined ? value : '';
  });
  
  return finalRow;
}

// --- 実績レコードの削除関数 (キャンセル用) ---
function deleteOccupancyRecords(reservationId) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_OCCUPANCY);
  
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const refIdIndex = headers.indexOf('予約ID (Ref)');
  
  if (refIdIndex === -1) return;

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][refIdIndex]).trim() === String(reservationId).trim()) {
      sheet.deleteRow(i + 1); 
    }
  }
  Logger.log('実績レコード削除完了: 予約ID ' + reservationId);
}

// --- メール送信履歴の保存関数 ---
function saveEmailLog(reservationId, type, toEmail, customerName, subject, status, errorMessage) {
  try {
    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME_MAIL_LOG);
    
    if (!sheet) {
      Logger.log('エラー: 送信履歴シートが見つかりません');
      return;
    }

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
    
    sheet.appendRow([
      timestamp,
      reservationId,
      type,
      toEmail,
      customerName,
      subject,
      status,
      errorMessage || ''
    ]);
    
  } catch (e) {
    Logger.log('ログ保存エラー: ' + e.toString());
  }
}