// ==================================================
// 4. ヤマトB2連携用 CSV生成＆ドライブ保存 (B2_Export.gs)
// 役割: 指定日の注文データを「04_B2_CSV_Upload」に書き込み、
//       さらにCSVファイル化してGoogleドライブに保存する
// ★修正: 品名・荷扱い(1,2)・記事の内容を変更し、列を追加
// ==================================================

// ★設定済み: 保存先フォルダID
const B2_FOLDER_ID = '1JxUwesr0EIFclcKfev6eIvkISBaHDgBU';

// 出力先シート名
const SHEET_B2_EXPORT = '04_B2_CSV_Upload';

const SHOP_INFO = {
  phone: '0268-74-3360', 
  name: 'パン工房 MARIKO',
  postal: '386-2204',
  address: '長野県上田市菅平高原1223-146',
  building: 'ロッジ アボリア'
};

// ★修正: 固定値設定
const B2_FIXED_VALUES = {
  slipType: '0',
  itemName: 'シュトーレン',              // 品名１
  handling1: '下積厳禁',                 // 荷扱い１
  handling2: 'ナマモノ',                 // 荷扱い２
  article: '直射日光・高温多湿を避けて保存', // 記事
  billingCode: '0268742716',           // ご請求先顧客コード
  billingClass: '01'                   // ご請求先分類コード
};

function createAndSaveB2CSV(targetDateStr, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName(SHEET_ORDERS);
  const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);
  const senderSheet = ss.getSheetByName(SHEET_SENDERS);
  
  const exportSheet = ss.getSheetByName(SHEET_B2_EXPORT);
  if (exportSheet) exportSheet.clear(); 

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0,0,0,0);

  const orders = getDataMap(orderSheet, 'OrderID');
  const senders = getDataMap(senderSheet, 'SenderID');
  const recipients = recipientSheet.getDataRange().getValues();
  const rHeaders = recipients[0];

  // ★修正: CSVヘッダー (「取扱い２」を追加)
  const csvHeader = [
    'お客様管理番号', '出荷予定日', '送り状種類', 'お届け先電話番号', 'お届け先郵便番号', 
    'お届け先住所', 'お届け先建物名', 'お届け先会社・部門１', 'お届け先会社・部門２', 'お届け先名', 
    'お届け先名(ｶﾅ)', 'ご依頼主電話番号', 'ご依頼主郵便番号', 'ご依頼主住所', 'ご依頼主建物名', 
    'ご依頼主名', 'ご依頼主名(ｶﾅ)', 
    '品名１', '取扱い１', '取扱い２', '記事', // ★ここを変更
    'お届け予定日',
    'ご請求先顧客コード', 'ご請求先分類コード'
  ];
  
  let sheetData = [csvHeader];
  let csvRows = [];
  let count = 0;

  for (let i = 1; i < recipients.length; i++) {
    const rRow = recipients[i];
    const orderId = rRow[rHeaders.indexOf('OrderID (Ref)')];
    const order = orders[orderId];

    if (!order) continue;
    
    if (order['注文ステータス'] === 'キャンセル') continue;

    const orderDate = new Date(order['お届け希望日']);
    orderDate.setHours(0,0,0,0);
    
    const orderDateStr = Utilities.formatDate(orderDate, 'Asia/Tokyo', 'yyyy/MM/dd');
    const targetDateStrYMD = Utilities.formatDate(targetDate, 'Asia/Tokyo', 'yyyy/MM/dd');

    if (orderDateStr !== targetDateStrYMD) {
      continue; 
    }

    let senderData = SHOP_INFO;
    if (order['注文目的'] === 'プレゼント用' && order['SenderID (Ref)']) {
      const s = senders[order['SenderID (Ref)']];
      if (s) {
        senderData = {
          phone: s['送り主電話番号'],
          postal: s['送り主郵便番号'],
          address: s['送り主住所'],
          building: s['送り主建物名'],
          name: s['送り主名']
        };
      }
    }

    const shipDate = new Date(targetDate); 
    shipDate.setDate(shipDate.getDate() - 2);
    
    let companyName = '';
    let departmentName = '';
    const compIdx = rHeaders.indexOf('お届け先会社名');
    const deptIdx = rHeaders.indexOf('お届け先部署名');
    if (compIdx > -1) companyName = rRow[compIdx] || '';
    if (deptIdx > -1) departmentName = rRow[deptIdx] || '';

    const row = [
      rRow[rHeaders.indexOf('RecipientID')],
      formatDateYMD(shipDate),
      B2_FIXED_VALUES.slipType,
      cleanPhone(rRow[rHeaders.indexOf('お届け先電話番号')]),
      rRow[rHeaders.indexOf('お届け先郵便番号')],
      rRow[rHeaders.indexOf('お届け先住所')],
      rRow[rHeaders.indexOf('お届け先建物名')],
      companyName,
      departmentName,
      rRow[rHeaders.indexOf('お届け先氏名')],
      '', 
      cleanPhone(senderData.phone),
      senderData.postal,
      senderData.address,
      senderData.building,
      senderData.name,
      '', 
      B2_FIXED_VALUES.itemName,  // 品名１
      B2_FIXED_VALUES.handling1, // 取扱い１ (下積厳禁)
      B2_FIXED_VALUES.handling2, // 取扱い２ (ナマモノ) ★追加
      B2_FIXED_VALUES.article,   // 記事
      formatDateYMD(targetDate),
      B2_FIXED_VALUES.billingCode,
      B2_FIXED_VALUES.billingClass
    ];
    
    sheetData.push(row);
    csvRows.push(row.map(v => `"${v}"`).join(','));
    count++;
  }

  if (count === 0) {
    if (userEmail) {
       GmailApp.sendEmail(userEmail, '【B2連携】対象データなし', `指定日 (${targetDateStr}) の発送データはありませんでした。`, { name: 'AppSheet System' });
    }
    return;
  }

  if (exportSheet) {
    const range = exportSheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setNumberFormat('@'); 
    range.setValues(sheetData);
  }

  const csvString = csvHeader.join(',') + '\n' + csvRows.join('\n');
  const fileName = `${formatDateYMD(targetDate).replace(/\//g, '-')}_発送分.csv`;
  const blob = Utilities.newBlob(csvString, 'text/csv', fileName);

  const folder = DriveApp.getFolderById(B2_FOLDER_ID);
  const file = folder.createFile(blob);
  
  if (userEmail) {
    const subject = `【B2連携】CSV作成完了 (${count}件)`;
    const body = `
B2連携用CSVファイルをGoogleドライブに保存し、
管理用シート「04_B2_CSV_Upload」にもデータを出力しました。

■対象日: ${targetDateStr} (お届け希望日)
■件数: ${count} 件
■保存先フォルダ: ${folder.getName()}
■ファイル名: ${fileName}

▼ファイルのダウンロードはこちら
${file.getUrl()}
`;
    GmailApp.sendEmail(userEmail, subject, body, { name: 'AppSheet System' });
  }
}

function formatDateYMD(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}

function getDataMap(sheet, keyCol) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIdx = headers.indexOf(keyCol);
  const map = {};
  for(let i=1; i<data.length; i++){
    const row = data[i];
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx]);
    map[row[keyIdx]] = obj;
  }
  return map;
}

function cleanPhone(val) {
  if(!val) return "";
  return val.toString().replace(/'/g, ''); 
}