// ==================================================
// 6. ヤマトB2実績CSV取込 (B2_Import.gs) - Final Ver.2
// 役割: 「発送データフォルダ」と「運賃データフォルダ」を巡回し、DB更新＆メール送信
//       ★修正: 伝票番号を 0000-0000-0000 形式で保存
// ==================================================

// ★設定: フォルダID
const FOLDER_ID_SHIPPING = '1DE8jwxs1b7zoGPuWs0nJO0nuY5hbAop2'; // 02.発送データ
const FOLDER_ID_FREIGHT  = '1eut2UwxT4_hSYTF0NR2FMgIKOudnGsp-'; // 03.運賃データ

// --- 発送データCSV (Status & Tracking No) ---
const COL_SHIP_RECIPIENT_ID = 0; // 1列目: お客様管理番号
const COL_SHIP_TRACKING_NO  = 3; // 4列目: 伝票番号 (ハイフンなし12桁)

// --- 運賃データCSV (Cost) ---
const COL_COST_TRACKING_NO  = 4;  // 5列目: 原票No. (ハイフンあり12桁)
const COL_COST_AMOUNT       = 11; // 12列目: 運賃


/**
 * メイン関数
 */
function checkB2ImportFiles() {
  processFolderFiles(FOLDER_ID_SHIPPING, '発送データ');
  processFolderFiles(FOLDER_ID_FREIGHT, '運賃データ');
}

/**
 * フォルダ処理共通関数
 */
function processFolderFiles(folderId, typeLabel) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  let processedFolder;
  const oldFolders = folder.getFoldersByName("old");
  if (oldFolders.hasNext()) {
    processedFolder = oldFolders.next();
  } else {
    processedFolder = folder.createFolder("old");
  }

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    
    if (file.getMimeType() === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      Logger.log(`[${typeLabel}] ファイル検出: ${fileName}`);
      
      try {
        const result = processB2CsvAuto(file);
        
        if (result) {
          file.moveTo(processedFolder);
          Logger.log(`処理完了 -> ${folder.getName()}/old へ移動`);
        } else {
          Logger.log('スキップ: 対象外またはデータなし');
        }
      } catch (e) {
        Logger.log('エラー発生: ' + e.toString());
      }
    }
  }
}

// 文字コード自動判別
function processB2CsvAuto(file) {
  let csvData;
  let encoding = 'Shift_JIS';

  const checkHeader = (data) => {
    if (!data || data.length < 1) return null;
    const header = data[0];
    if (header.length > 3 && (header[0].includes('お客様管理番号') || header[3].includes('伝票番号'))) return 'SHIPPING';
    if (header.length > 11 && (header[4].includes('原票No') || header[11].includes('運賃') || header[11].includes('料金'))) return 'FREIGHT';
    return null;
  };

  try {
    const dataBlob = file.getBlob().getDataAsString(encoding);
    csvData = Utilities.parseCsv(dataBlob);
  } catch (e) {}

  let type = checkHeader(csvData);

  if (!type) {
    Logger.log('Shift_JISで判定不能。UTF-8でリトライします。');
    encoding = 'UTF-8';
    try {
      const dataBlob = file.getBlob().getDataAsString(encoding);
      csvData = Utilities.parseCsv(dataBlob);
      type = checkHeader(csvData);
    } catch (e) {}
  }

  if (type === 'SHIPPING') {
    Logger.log(`判定結果: 発送データCSV (${encoding})`);
    return processShippingData(csvData);
  } else if (type === 'FREIGHT') {
    Logger.log(`判定結果: 運賃データCSV (${encoding})`);
    return processFreightData(csvData);
  }

  Logger.log(`判定不能: ヘッダー不一致 (${encoding})`);
  return false;
}

// ==================================================
// A. 発送データの処理 (★修正: 伝票番号フォーマット適用)
// ==================================================
function processShippingData(csvData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName(SHEET_ORDERS);
  const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);
  
  const updatedOrderIds = new Set();

  // DBデータ取得
  const rValues = recipientSheet.getDataRange().getValues();
  const rHeaders = rValues[0];
  const rIdMap = {};
  for (let i = 1; i < rValues.length; i++) {
    rIdMap[rValues[i][rHeaders.indexOf('RecipientID')]] = i + 1;
  }
  
  const rTrackingIdx = rHeaders.indexOf('伝票番号');
  const rOrderIdx = rHeaders.indexOf('OrderID (Ref)');

  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    if (row.length < 4) continue;

    const recId = String(row[COL_SHIP_RECIPIENT_ID]).trim(); 
    let rawTrackingNo = row[COL_SHIP_TRACKING_NO];

    if (rIdMap[recId]) {
      const sheetRow = rIdMap[recId];
      
      // ★修正: フォーマット関数を通して保存 (0000-0000-0000)
      const formattedTrackingNo = formatTrackingNumber(rawTrackingNo);
      recipientSheet.getRange(sheetRow, rTrackingIdx + 1).setValue("'" + formattedTrackingNo);
      
      const orderId = rValues[sheetRow - 1][rOrderIdx];
      if (orderId) updatedOrderIds.add(orderId);
    }
  }

  if (updatedOrderIds.size > 0) {
    updateOrdersAndNotify(orderSheet, Array.from(updatedOrderIds));
  }
  return true;
}

// ==================================================
// B. 運賃データの処理 (★修正: 伝票番号フォーマット適用)
// ==================================================
function processFreightData(csvData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName(SHEET_ORDERS);
  const recipientSheet = ss.getSheetByName(SHEET_RECIPIENTS);

  const rValues = recipientSheet.getDataRange().getValues();
  const rHeaders = rValues[0];
  
  const rTrackingIdx = rHeaders.indexOf('伝票番号');
  const rOrderIdx = rHeaders.indexOf('OrderID (Ref)');
  
  const trackingToOrderMap = {};
  for (let i = 1; i < rValues.length; i++) {
    // DB上の伝票番号からハイフンを除去して照合キーにする
    let tNo = String(rValues[i][rTrackingIdx]).replace(/[-ー']/g, ''); 
    if (tNo) {
      trackingToOrderMap[tNo] = rValues[i][rOrderIdx];
    }
  }

  const orderShippingCosts = {};
  
  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    if (row.length < 12) continue;

    let rawTrackingNo = row[COL_COST_TRACKING_NO]; 
    const cost = parseInt(row[COL_COST_AMOUNT]) || 0;

    // CSVの伝票番号からもハイフンを除去して照合
    const cleanTrackingNo = String(rawTrackingNo).replace(/[-ー]/g, '');

    if (trackingToOrderMap[cleanTrackingNo]) {
      const orderId = trackingToOrderMap[cleanTrackingNo];
      if (!orderShippingCosts[orderId]) orderShippingCosts[orderId] = 0;
      orderShippingCosts[orderId] += cost;
    }
  }

  const oIds = Object.keys(orderShippingCosts);
  if (oIds.length > 0) {
    updateOrderCosts(orderSheet, orderShippingCosts);
  }
  return true;
}

// ==================================================
// 共通: ステータス更新 & メール送信
// ==================================================
function updateOrdersAndNotify(orderSheet, orderIds) {
  const oValues = orderSheet.getDataRange().getValues();
  const oHeaders = oValues[0];
  const oIdIdx = oHeaders.indexOf('OrderID');
  const oStatusIdx = oHeaders.indexOf('注文ステータス');
  const oDateIdx = oHeaders.indexOf('発送完了日');
  const oMailSentIdx = oHeaders.indexOf('発送メール送信済');
  const today = new Date();
  const oIdMap = {};
  for (let i = 1; i < oValues.length; i++) {
    oIdMap[oValues[i][oIdIdx]] = i + 1;
  }

  for (const orderId of orderIds) {
    if (oIdMap[orderId]) {
      const rowNum = oIdMap[orderId];
      const isSent = oValues[rowNum - 1][oMailSentIdx];
      
      if (isSent === true) continue;

      orderSheet.getRange(rowNum, oStatusIdx + 1).setValue('発送済');
      orderSheet.getRange(rowNum, oDateIdx + 1).setValue(today);
      orderSheet.getRange(rowNum, oMailSentIdx + 1).setValue(true);

      SpreadsheetApp.flush();
      sendShippingNotification(orderId); 
      Utilities.sleep(1000);
    }
  }
}

// ==================================================
// 共通: 送料・合計金額更新
// ==================================================
function updateOrderCosts(orderSheet, orderShippingCosts) {
  const oValues = orderSheet.getDataRange().getValues();
  const oHeaders = oValues[0];
  const oIdIdx = oHeaders.indexOf('OrderID');
  const oShippingIdx = oHeaders.indexOf('送料');
  const oTotalIdx = oHeaders.indexOf('請求合計金額');
  const oPriceIdx = oHeaders.indexOf('商品単価');
  const oQtyIdx = oHeaders.indexOf('ご注文数 (総計)');
  const oIdMap = {};
  for (let i = 1; i < oValues.length; i++) {
    oIdMap[oValues[i][oIdIdx]] = i + 1;
  }
  
  const orderIds = Object.keys(orderShippingCosts);
  for (const orderId of orderIds) {
    if (oIdMap[orderId]) {
      const rowNum = oIdMap[orderId];
      const shippingCost = orderShippingCosts[orderId];
      if (oShippingIdx > -1) orderSheet.getRange(rowNum, oShippingIdx + 1).setValue(shippingCost);
      if (oTotalIdx > -1 && oPriceIdx > -1 && oQtyIdx > -1) {
        const unitPrice = oValues[rowNum - 1][oPriceIdx] || 5500;
        const qty = oValues[rowNum - 1][oQtyIdx] || 0;
        const total = (unitPrice * qty) + shippingCost;
        orderSheet.getRange(rowNum, oTotalIdx + 1).setValue(total);
      }
    }
  }
}