// ==================================================
// 2. メールトリガー連携 (Email_Trigger.gs)
// 役割: Gmailを定期チェックして管理DBに書き込む
// ★修正: 読み取り精度を最大化し、データ崩れとスキップを防止
// ==================================================

function checkBreadOrders() {
  Logger.log('[Gmail連携] 開始');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const senderSheet = ss.getSheetByName(SHEET_SENDERS);
  
  if (!senderSheet) {
    Logger.log('エラー: シートが見つかりません');
    return;
  }

  const threads = GmailApp.search(SEARCH_QUERY);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      if (message.isUnread()) {
        processEmail(message, ss, senderSheet);
      }
    }
  }
}

function processEmail(message, ss, senderSheet) {
  const body = message.getPlainBody();
  
  const data = {
    orderer: {},
    recipient: {},
    sender: {},
    notes: ''
  };

  // 行ごとに分割して解析
  const lines = body.split(/\r\n|\r|\n/);
  let currentSection = 'orderer'; // orderer, recipient, sender, notes

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // --- セクション判定 ---
    if (line.includes('■お届け先')) {
      currentSection = 'recipient';
      continue;
    } else if (line.includes('■送り主')) {
      currentSection = 'sender';
      continue;
    } else if (line.includes('■ご質問等') || line.includes('■備考')) {
      currentSection = 'notes';
      continue;
    } else if (line.startsWith('--')) {
      currentSection = 'footer';
      continue;
    }

    // --- データ抽出ロジック ---
    if (currentSection === 'notes') {
      data.notes += line + '\n';
      continue;
    }

    if (currentSection === 'footer') continue;

    // 「ラベル：値」の形式を抽出する正規表現
    // ^[-・\s]* : 行頭のハイフン・中黒・スペースを無視
    // ([^：:]+) : ラベル部分（コロン以外）
    // [：:]     : コロン（全角・半角）
    // \s*(.*)   : 値部分
    const match = line.match(/^[-・\s]*([^：:]+)[：:]\s*(.*)$/);
    
    if (match) {
      // ラベルからスペースを除去して正規化 ("お名前" "お届け先名" 等)
      const label = match[1].replace(/[\s　]/g, ''); 
      const value = match[2].trim();

      // --- 注文者セクション ---
      if (currentSection === 'orderer') {
        if (label.includes('注文者名') || label === 'お名前') data.orderer.name = value;
        else if (label.includes('メール')) data.orderer.email = value;
        else if (label.includes('注文数')) data.orderer.count = value;
        else if (label.includes('希望日')) data.orderer.date = value;
      } 
      // --- お届け先セクション ---
      else if (currentSection === 'recipient') {
        if (label.includes('お届け先名') || label === 'お名前') data.recipient.name = value;
        else if (label.includes('郵便番号')) data.recipient.postal = value;
        else if (label.includes('住所')) data.recipient.address = value;
        else if (label.includes('建物')) data.recipient.building = value;
        else if (label.includes('電話')) data.recipient.phone = value;
      } 
      // --- 送り主セクション ---
      else if (currentSection === 'sender') {
        if (label.includes('送り主名') || label === 'お名前') data.sender.name = value;
        else if (label.includes('郵便番号')) data.sender.postal = value;
        else if (label.includes('住所')) data.sender.address = value;
        else if (label.includes('建物')) data.sender.building = value;
        else if (label.includes('電話')) data.sender.phone = value;
      }
    }
  }

  // 必須チェック
  if (!data.orderer.name) {
    Logger.log('スキップ: 注文者名が取得できませんでした。メール形式を確認してください。');
    // 読み取れなかったメールは既読にしない（調査用）
    // message.markRead(); 
    return; 
  }

  // --- DB書き込み ---
  const orderSheet = ss.getSheetByName(SHEET_ORDERS);
  const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);
  const customerSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  
  const now = new Date();
  const orderId = 'ORD-' + Utilities.getUuid().substring(0, 8).toUpperCase();

  // 1. 顧客処理
  // メール注文では注文者電話番号がない場合があるため、お届け先電話番号を代用
  const customerPhone = data.orderer.phone || data.recipient.phone;
  const customerId = getOrCreateCustomerId(customerSheet, {
    name: data.orderer.name,
    email: data.orderer.email,
    phone: customerPhone
  });
  
  // 確実な書き込みのためにFlush
  SpreadsheetApp.flush();

  // 2. 送り主処理
  let senderId = '';
  // 送り主名があり、かつ注文者と違う名前なら「ギフト」とみなす
  // (normalizeStringは_Common.gsにある前提)
  if (data.sender.name && normalizeString(data.sender.name) !== normalizeString(data.orderer.name)) {
    senderId = getOrCreateSenderId(senderSheet, data.sender);
  }

  // 3. Order書き込み
  const oHeaders = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
  const newOrderRow = new Array(oHeaders.length).fill('');
  const setVal = (headerName, val) => {
    const idx = oHeaders.indexOf(headerName);
    if (idx > -1) newOrderRow[idx] = val;
  };

  // 日付補正 (0025年問題対策)
  let deliveryDate = data.orderer.date ? data.orderer.date.replace('0025', '2025').replace(/-/g, '/') : '';
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');

  setVal('OrderID', orderId);
  setVal('表示名', `${dateStr}｜${data.orderer.name}`);
  setVal('注文日時', now);
  setVal('注文ステータス', '受付');
  setVal('ご注文者名', data.orderer.name);
  setVal('ご注文者Email', data.orderer.email);
  setVal('ご注文者電話番号', "'" + customerPhone); 
  setVal('ご注文数 (総計)', parseInt(data.orderer.count) || 0);
  setVal('お届け希望日', deliveryDate);
  setVal('注文目的', senderId ? 'プレゼント用' : 'ご自宅用');
  setVal('備考', data.notes.trim());
  setVal('SenderID (Ref)', senderId);
  setVal('CustomerID (Ref)', customerId);

  // 金額計算 (メール注文は単価5500円固定)
  const unitPrice = 5500;
  const qty = parseInt(data.orderer.count) || 0;
  setVal('商品単価', unitPrice);
  setVal('請求合計金額', unitPrice * qty);

  orderSheet.appendRow(newOrderRow);

  // 4. Recipient書き込み
  const rHeaders = recipientSheet.getRange(1, 1, 1, recipientSheet.getLastColumn()).getValues()[0];
  const newRecipientRow = new Array(rHeaders.length).fill('');
  const setRVal = (headerName, val) => {
    const idx = rHeaders.indexOf(headerName);
    if (idx > -1) newRecipientRow[idx] = val;
  };
  
  const recId = 'REC-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  setRVal('RecipientID', recId);
  setRVal('OrderID (Ref)', orderId);
  
  // お届け先名が空なら注文者名
  const rName = data.recipient.name || data.orderer.name;
  setRVal('お届け先氏名', rName);
  setRVal('お届け先郵便番号', formatPostalCode(data.recipient.postal));
  setRVal('お届け先住所', data.recipient.address);
  
  // 建物名の誤検知防止
  let building = data.recipient.building;
  if (building && (building.includes('電話') || building.match(/\d{2,4}-\d{2,4}-\d{4}/))) {
    building = ''; // 電話番号っぽいものが建物名に入っていたら消す
  }
  setRVal('お届け先建物名', building ? "'" + building : "");
  
  setRVal('お届け先電話番号', "'" + data.recipient.phone);
  setRVal('配送数量', qty);

  recipientSheet.appendRow(newRecipientRow);
  
  // 完了
  message.markRead();
  Logger.log('登録完了: ' + orderId);
}