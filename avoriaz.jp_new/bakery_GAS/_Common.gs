// ==================================================
// 1. 共通設定・共通関数 (_Common.gs)
// ==================================================

const SPREADSHEET_ID = '1jF5ldDNywYuqKM4kcT3B3-AMn4LEytTbPT832ZMC9bQ';
const LOG_SS_ID = '1EPC6kqWAkOC1eWeL4QKS4X7SODRTfJrakfa9Qb1Pvu4';
const LOG_SHEET_NAME = 'Email_Logs';

const SHEET_CUSTOMERS = '00_Customers';
const SHEET_ORDERS = '01_Orders';
const SHEET_RECIPIENTS = '02_Recipients';
const SHEET_SENDERS = '03_Senders';

const SEARCH_QUERY = 'subject:"パン工房 MARIKO｜シュトーレン -ご注文確認-" is:unread';

function formatPostalCode(postal) {
  if (!postal) return '';
  const digits = String(postal).replace(/[^\d]/g, '');
  if (digits.length === 7) {
    return digits.substring(0, 3) + '-' + digits.substring(3);
  }
  return postal;
}

function formatTrackingNumber(num) {
  if (!num) return '';
  const digits = String(num).replace(/[^\d]/g, '');
  if (digits.length === 12) {
    return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return num;
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
}

function formatDateYMD(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}

// ★最重要: データの正規化（名寄せ用）
// 全角英数を半角に統一し、スペース・ハイフン・記号を除去・小文字化
function normalizeString(str) {
  if (!str) return '';
  let s = String(str);
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  // スペース、ハイフン、シングルクォートを除去
  s = s.replace(/[\s　\-ー'’]/g, '').toLowerCase();
  return s;
}

/**
 * 顧客IDの取得または作成
 */
function getOrCreateCustomerId(sheet, data) {
  if (!data.name) return '';

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  
  const idxId = headers.indexOf('CustomerID');
  const idxName = headers.indexOf('顧客名');
  const idxPhone = headers.indexOf('顧客電話番号');
  const idxEmail = headers.indexOf('顧客Email');
  const idxLastDate = headers.indexOf('最終注文日');

  const now = new Date();

  // 正規化
  const inputNameNorm = normalizeString(data.name);
  const inputPhoneNorm = normalizeString(data.phone);
  const inputEmailNorm = normalizeString(data.email);

  for (let i = 1; i < values.length; i++) {
    const dbNameNorm = normalizeString(values[i][idxName]);
    const dbPhoneNorm = normalizeString(values[i][idxPhone]);
    const dbEmailNorm = normalizeString(values[i][idxEmail]);
    
    // 3点一致判定
    if (dbNameNorm === inputNameNorm && 
        dbPhoneNorm === inputPhoneNorm && 
        dbEmailNorm === inputEmailNorm) {
      
      // 最終注文日を更新
      if (idxLastDate > -1) {
        sheet.getRange(i + 1, idxLastDate + 1).setValue(now);
      }
      return values[i][idxId];
    }
  }

  // 新規作成
  const newId = 'CST-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  const newRow = new Array(headers.length).fill('');
  
  if (idxId > -1) newRow[idxId] = newId;
  if (idxName > -1) newRow[idxName] = data.name;
  if (idxEmail > -1) newRow[idxEmail] = data.email;
  if (idxPhone > -1) newRow[idxPhone] = "'" + data.phone;
  if (headers.indexOf('初回注文日') > -1) newRow[headers.indexOf('初回注文日')] = now;
  if (idxLastDate > -1) newRow[idxLastDate] = now;

  sheet.appendRow(newRow);
  return newId;
}

// (以下、getOrCreateSenderId, logEmailHistory, authorizeLogSheet, getDataMap, cleanPhone は既存のままでOK)
function getOrCreateSenderId(sheet, data) {
  if (!data.name) return '';
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  const idxId = headers.indexOf('SenderID');
  const idxName = headers.indexOf('送り主名');
  const idxPhone = headers.indexOf('送り主電話番号');
  const idxPostal = headers.indexOf('送り主郵便番号');
  const idxAddress = headers.indexOf('送り主住所');
  const idxBuilding = headers.indexOf('送り主建物名');
  const inputNameNorm = normalizeString(data.name);
  const inputPhoneNorm = normalizeString(data.phone);
  for (let i = 1; i < values.length; i++) {
    const dbNameNorm = normalizeString(values[i][idxName]);
    const dbPhoneNorm = normalizeString(values[i][idxPhone]);
    if (dbNameNorm === inputNameNorm && dbPhoneNorm === inputPhoneNorm) {
      return values[i][idxId];
    }
  }
  const newId = 'SND-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  const newRow = new Array(headers.length).fill('');
  if (idxId > -1) newRow[idxId] = newId;
  if (idxName > -1) newRow[idxName] = data.name;
  if (idxPhone > -1) newRow[idxPhone] = "'" + data.phone;
  if (idxPostal > -1) newRow[idxPostal] = data.postal;
  if (idxAddress > -1) newRow[idxAddress] = data.address;
  if (idxBuilding > -1) newRow[idxBuilding] = data.building ? "'" + data.building : "";
  sheet.appendRow(newRow);
  return newId;
}
function logEmailHistory(orderId, type, to, name, subject, status, errorDetail) {
  try {
    const logSs = SpreadsheetApp.openById(LOG_SS_ID);
    let logSheet = logSs.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = logSs.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(['送信日時', 'OrderID', '送信タイプ', '送信先', '顧客名', '件名', 'ステータス', 'エラー詳細']);
    }
    logSheet.appendRow([new Date(), orderId, type, to, name, subject, status, errorDetail]);
  } catch (e) { console.error('ログ記録失敗: ' + e.toString()); }
}
function authorizeLogSheet() { const logSs = SpreadsheetApp.openById(LOG_SS_ID); console.log("ログ用シートへのアクセス確認: " + logSs.getName()); }
function getDataMap(sheet, keyCol) { const data = sheet.getDataRange().getValues(); const headers = data[0]; const keyIdx = headers.indexOf(keyCol); const map = {}; for(let i=1; i<data.length; i++){ const row = data[i]; const obj = {}; headers.forEach((h, idx) => obj[h] = row[idx]); map[row[keyIdx]] = obj; } return map; }
function cleanPhone(val) { if(!val) return ""; return val.toString().replace(/'/g, ''); }