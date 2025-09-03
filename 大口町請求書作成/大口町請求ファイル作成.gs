/**
 * @OnlyCurrentDoc
 * 共有ドライブ内の複数施設フォルダを巡回し、指定年月の延長料金を自動計算して、
 * 請求一覧と登降園データのExcelファイルをそれぞれ保存するGoogle Apps Script。
 * 月ぎめプランと土曜日の特別ルールを考慮した計算ロジックを搭載。
 */

// ▼▼▼ 設定項目 ▼▼▼
const DATA_FOLDER_ID = '1Xo0X8p2Ra4gPDG0sNw12bZyPszjr6OmS';
const OUTPUT_PARENT_FOLDER_ID = '17DaEtWXNpALKhn7a93u9coJ3T4C1_aPR';
const NURSERY_FOLDER_NAMES = [
  '大口町西保育園',
  '大口町南保育園',
  '大口町北保育園',
  '大口町中保育園'
];
const LOG_SHEET_NAME = '実行ログ';
const PLAN_SHEET_ID = '1A60-WXve2NCHfcP17TFRYIVpwmKlREsuqSraPTFzA-E'; // 月ぎめ延長料金プラン一覧のスプレッドシートID
// ▲▲▲ 設定項目 ▲▲▲

/**
 * スプレッドシートを開いた時にカスタムメニューを追加します。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('延長料金計算')
    .addItem('全施設の計算を実行', 'startProcess')
    .addToUi();
}

/**
 * 処理開始のトリガーとなる関数。ユーザーに対象年月を問い合わせます。
 */
function startProcess() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '処理対象年月を入力',
    '例: 2025年7月分の場合 → 202507',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const yearMonth = response.getResponseText().trim();
    if (!/^\d{6}$/.test(yearMonth)) {
      ui.alert('入力エラー', '年月は6桁の数字（YYYYMM形式）で入力してください。', ui.ButtonSet.OK);
      return;
    }
    processAllNurseries(yearMonth);
  }
}

/**
 * ログを出力し、画面にトースト通知を表示するヘルパー関数
 */
function logProgress(logSheet, nurseryName, status, detail) {
  const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss');
  logSheet.appendRow([timestamp, nurseryName, status, detail]);
  SpreadsheetApp.getActiveSpreadsheet().toast(detail, `【${nurseryName}】${status}`, 5);
}

/**
 * 全ての保育園フォルダに対して処理を実行します。
 */
function processAllNurseries(yearMonth) {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  let logSheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet(LOG_SHEET_NAME, 0);
  }
  logSheet.clear();
  logSheet.appendRow(['実行日時', '対象園', 'ステータス', '詳細']);
  logSheet.setColumnWidths(1, 4, 150);

  try {
    logProgress(logSheet, '全体', '開始', `処理を開始します (対象: ${yearMonth})`);
    
    Drive.Files.list({ q: `'${DATA_FOLDER_ID}' in parents`, maxResults: 1, supportsAllDrives: true, includeItemsFromAllDrives: true });
    
    const dataFolder = DriveApp.getFolderById(DATA_FOLDER_ID);
    const outputParentFolder = DriveApp.getFolderById(OUTPUT_PARENT_FOLDER_ID);
    
    const outputFolderName = `${yearMonth}月分【提出】`;
    const folders = outputParentFolder.getFoldersByName(outputFolderName);
    const outputFolder = folders.hasNext() ? folders.next() : outputParentFolder.createFolder(outputFolderName);
    logProgress(logSheet, '全体', '準備完了', `出力先フォルダ「${outputFolderName}」を確認しました。`);

    // 月ぎめプラン情報を読み込む
    logProgress(logSheet, '全体', '準備中', '月ぎめプラン情報を読み込んでいます...');
    const planMap = loadMonthlyPlan();
    logProgress(logSheet, '全体', '準備完了', '月ぎめプラン情報の読み込みが完了しました。');

    const results = [];
    
    NURSERY_FOLDER_NAMES.forEach(nurseryName => {
      try {
        logProgress(logSheet, nurseryName, '処理中', `「${nurseryName}」フォルダを検索中...`);
        const nurseryFolders = dataFolder.getFoldersByName(nurseryName);
        if (!nurseryFolders.hasNext()) {
          throw new Error(`データフォルダ内に「${nurseryName}」が見つかりません。`);
        }
        const nurseryFolder = nurseryFolders.next();
        
        processSingleNursery(nurseryFolder, yearMonth, outputFolder, logSheet, planMap);

        logProgress(logSheet, nurseryName, '成功', '関連ファイルの作成が完了しました。');
        results.push(`【${nurseryName}】... ✔ 成功`);
        
      } catch (e) {
        Logger.log(`エラー [${nurseryName}]: ${e.message} \n ${e.stack}`);
        let errorMessage = e.message;
        if (errorMessage.includes('見つかりません')) {
            errorMessage += ' ファイル名や保存場所が正しいか確認してください。';
        } else if (errorMessage.includes('権限')) {
            errorMessage = 'ファイルを開く権限がありません。再承認してください。';
        }
        logProgress(logSheet, nurseryName, '❌ 失敗', errorMessage);
        results.push(`【${nurseryName}】... ❌ 失敗: ${errorMessage}`);
      }
    });
    
    logProgress(logSheet, '全体', '完了', '全ての処理が完了しました。');
    const finalMessage = `処理が完了しました。\n\n${results.join('\n')}\n\n詳細は「${LOG_SHEET_NAME}」シートを確認してください。`;
    ui.alert('処理完了', finalMessage, ui.ButtonSet.OK);

  } catch (e) {
    Logger.log(`致命的なエラー: ${e.message} \n ${e.stack}`);
    logProgress(logSheet, '全体', '❌ 致命的なエラー', e.message);
    ui.alert('エラー', '処理を開始できませんでした。フォルダIDの設定やアクセス権を再確認してください。', ui.ButtonSet.OK);
  }
}

/**
 * 月ぎめプラン一覧シートから情報を読み込み、Map形式で返します。
 * @returns {Map<string, object>}
 */
function loadMonthlyPlan() {
  const planSpreadsheet = SpreadsheetApp.openById(PLAN_SHEET_ID);
  const sheet = planSpreadsheet.getSheets()[0];
  const data = sheet.getDataRange().getDisplayValues();
  data.shift(); // ヘッダーを削除

  const planMap = new Map();
  data.forEach(row => {
    const facilityName = row[0]; // A列: 施設名
    const planName = row[1];     // B列: 名称
    const startTime = row[7];    // H列: 開始時間
    const endTime = row[8];      // I列: 終了時間
    if (facilityName && planName) {
      const key = `${facilityName}_${planName.trim()}`;
      planMap.set(key, { startTime, endTime });
    }
  });
  return planMap;
}

/**
 * Excelファイルを一時的なGoogleスプレッドシートに変換します。
 */
function convertExcelToSheet(excelFile) {
    try {
        const resource = {
            title: `[一時ファイル] ${excelFile.getName()}`,
            mimeType: 'application/vnd.google-apps.spreadsheet'
        };
        const convertedFile = Drive.Files.copy(resource, excelFile.getId(), { supportsAllDrives: true });
        return {
            spreadsheet: SpreadsheetApp.openById(convertedFile.id),
            tempFileId: convertedFile.id
        };
    } catch (e) {
        throw new Error(`ファイル変換に失敗しました: ${excelFile.getName()} - ${e.message}`);
    }
}

/**
 * ヘッダー行から列名と列インデックスのマップを作成します。（請求一覧用）
 */
function getHeaderMap(headerRow) {
    const headerMap = new Map();
    headerRow.forEach((header, index) => {
        if (header) {
            headerMap.set(header.toString().trim(), index);
        }
    });
    return headerMap;
}


/**
 * 一つの保育園フォルダ内のファイルを処理します。
 */
function processSingleNursery(nurseryFolder, yearMonth, outputFolder, logSheet, planMap) {
    const nurseryName = nurseryFolder.getName();
    const year = yearMonth.substring(0, 4);
    const month = yearMonth.substring(4, 6);

    logProgress(logSheet, nurseryName, '処理中', '請求一覧と登降園データを探しています...');
    const billingFileNamePattern = `請求一覧表_すべて_${year}年${month}月`;
    
    let attendanceNurseryName;
    if (nurseryName.includes('中')) {
        attendanceNurseryName = nurseryName.replace('町', ''); 
    } else {
        attendanceNurseryName = nurseryName.replace('町', '町立');
    }
    const attendanceFileNamePattern = `出席・登降園時間_${yearMonth}_${attendanceNurseryName}`;
    
    const billingFile = findFileByPrefix(nurseryFolder, billingFileNamePattern);
    const attendanceFile = findFileByPrefix(nurseryFolder, attendanceFileNamePattern);

    if (!billingFile) throw new Error(`「${nurseryFolder.getName()}」内で請求一覧ファイルが見つかりません (検索名: ${billingFileNamePattern})`);
    if (!attendanceFile) throw new Error(`「${nurseryFolder.getName()}」内で登降園情報ファイルが見つかりません (検索名: ${attendanceFileNamePattern})`);
    
    let tempFileIds = [];
    let tempBillingSSId = null;
    let tempAttendanceSSId = null;

    try {
        logProgress(logSheet, nurseryName, '処理中', `ファイル変換中: ${billingFile.getName()}`);
        const billingConversion = convertExcelToSheet(billingFile);
        tempFileIds.push(billingConversion.tempFileId);
        const billingSpreadsheet = billingConversion.spreadsheet;
        
        logProgress(logSheet, nurseryName, '処理中', `ファイル変換中: ${attendanceFile.getName()}`);
        const attendanceConversion = convertExcelToSheet(attendanceFile);
        tempFileIds.push(attendanceConversion.tempFileId);
        const attendanceSpreadsheet = attendanceConversion.spreadsheet;
        
        logProgress(logSheet, nurseryName, '処理中', '変換完了。計算を開始します...');
        
        const billingSheet = billingSpreadsheet.getSheets()[0];
        const attendanceSheet = attendanceSpreadsheet.getSheets()[0];
        const billingDataWithHeader = billingSheet.getDataRange().getValues();
        const attendanceDataWithHeader = attendanceSheet.getDataRange().getDisplayValues();

        const billingHeaderRow = billingDataWithHeader.shift();
        const billingHeaderMap = getHeaderMap(billingHeaderRow);
        const billingData = billingDataWithHeader;
        
        const attendanceHeaderRow = attendanceDataWithHeader.shift(); 
        const attendanceData = attendanceDataWithHeader;
        
        const billingCodeCol = billingHeaderMap.get('園児コード');
        const overtimeFeeCol = billingHeaderMap.get('延長料金');
        
        const attendanceCodeCol = 0; // A列
        const dateCol = 3;           // D列
        const statusCol = 4;         // E列
        const checkinTimeCol = 5;    // F列
        const checkoutTimeCol = 6;   // G列

        if (billingCodeCol === undefined || overtimeFeeCol === undefined) {
            throw new Error('請求一覧に「園児コード」または「延長料金」の列が見つかりませんでした。');
        }

        const studentInfoMap = new Map();
        billingData.forEach(row => {
          const code = row[billingCodeCol];
          if(code){
            const fullCode = code.toString().trim();
            const numericCode = fullCode.split(/\s+/)[0];
            if(numericCode) {
              const studentData = parseChildCode(fullCode);
              studentData.plans = [];
              for (let i = 9; i < billingHeaderRow.length; i++) { 
                  if (typeof row[i] === 'number' && row[i] > 0) {
                      const planNameWithSuffix = billingHeaderRow[i].trim();
                      const planName = planNameWithSuffix.replace('（月ぎめ）', '');
                      const planKey = `${nurseryName}_${planName}`;
                      if (planMap.has(planKey)) {
                          studentData.plans.push(planMap.get(planKey));
                      }
                  }
              }
              studentInfoMap.set(numericCode, studentData);
            }
          }
        });
        
        const calculationResult = calculateMonthlyFees(attendanceData, studentInfoMap, {
          codeCol: attendanceCodeCol, dateCol: dateCol, statusCol: statusCol, checkinTimeCol: checkinTimeCol, checkoutTimeCol: checkoutTimeCol,
        }, nurseryName);
        const totalFees = calculationResult.totalFees;
        const overtimeRows = calculationResult.overtimeRows;

        // --- 請求一覧の作成 ---
        const newBillingData = [billingHeaderRow];
        billingData.forEach(row => {
          const newRow = [...row]; 
          const originalFee = row[overtimeFeeCol];

          if (typeof originalFee === 'number') {
            const fullCode = row[billingCodeCol] ? row[billingCodeCol].toString().trim() : '';
            const numericCode = fullCode ? fullCode.split(/\s+/)[0] : '';
            const newFee = totalFees.get(numericCode) || 0;
            newRow[overtimeFeeCol] = newFee;
          }
          
          newBillingData.push(newRow);
        });

        logProgress(logSheet, nurseryName, '処理中', '計算完了。請求一覧Excelファイルを作成しています...');
        const tempBillingSheet = SpreadsheetApp.create(`[一時出力]${nurseryName}_請求`);
        tempBillingSSId = tempBillingSheet.getId();
        tempBillingSheet.getSheets()[0].getRange(1, 1, newBillingData.length, newBillingData[0].length).setValues(newBillingData);
        SpreadsheetApp.flush();

        const billingUrl = `https://docs.google.com/spreadsheets/d/${tempBillingSSId}/export?format=xlsx`;
        const token = ScriptApp.getOAuthToken();
        const billingResponse = UrlFetchApp.fetch(billingUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        
        const billingBlob = billingResponse.getBlob();
        const outputBillingFileName = `${nurseryName}_請求一覧_${year}年${month}月.xlsx`;
        billingBlob.setName(outputBillingFileName);

        const existingBillingFiles = outputFolder.getFilesByName(outputBillingFileName);
        while (existingBillingFiles.hasNext()) {
          existingBillingFiles.next().setTrashed(true);
        }
        outputFolder.createFile(billingBlob);

        // --- 登降園データの作成 ---
        if (overtimeRows.length > 0) {
            logProgress(logSheet, nurseryName, '処理中', '延長記録を抽出し、登降園データExcelを作成しています...');
            const newAttendanceData = [attendanceHeaderRow, ...overtimeRows];
            
            const tempAttendanceSheet = SpreadsheetApp.create(`[一時出力]${nurseryName}_登降園`);
            tempAttendanceSSId = tempAttendanceSheet.getId();
            tempAttendanceSheet.getSheets()[0].getRange(1, 1, newAttendanceData.length, newAttendanceData[0].length).setValues(newAttendanceData);
            SpreadsheetApp.flush();

            const attendanceUrl = `https://docs.google.com/spreadsheets/d/${tempAttendanceSSId}/export?format=xlsx`;
            const attendanceResponse = UrlFetchApp.fetch(attendanceUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            
            const attendanceBlob = attendanceResponse.getBlob();
            const outputAttendanceFileName = `${nurseryName}_登降園データ_${year}年${month}月.xlsx`;
            attendanceBlob.setName(outputAttendanceFileName);

            const existingAttendanceFiles = outputFolder.getFilesByName(outputAttendanceFileName);
            while (existingAttendanceFiles.hasNext()) {
              existingAttendanceFiles.next().setTrashed(true);
            }
            outputFolder.createFile(attendanceBlob);
        }

    } finally {
        logProgress(logSheet, nurseryName, '処理中', '一時ファイルを削除しています...');
        tempFileIds.forEach(id => {
            try { DriveApp.getFileById(id).setTrashed(true); } 
            catch (err) { Logger.log(`一時ファイル(ID:${id})の削除に失敗: ${err.message}`);}
        });
        if (tempBillingSSId) {
            try { DriveApp.getFileById(tempBillingSSId).setTrashed(true); }
            catch (err) { Logger.log(`一時出力ファイル(ID:${tempBillingSSId})の削除に失敗: ${err.message}`);}
        }
        if (tempAttendanceSSId) {
            try { DriveApp.getFileById(tempAttendanceSSId).setTrashed(true); }
            catch (err) { Logger.log(`一時出力ファイル(ID:${tempAttendanceSSId})の削除に失敗: ${err.message}`);}
        }
    }
}

function findFileByPrefix(folder, prefix) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(prefix)) { return file; }
  }
  return null;
}

function calculateMonthlyFees(attendanceData, studentInfoMap, cols, nurseryName) {
  const totalFees = new Map();
  const overtimeRows = [];
  
  attendanceData.forEach(row => {
    try {
      const status = row[cols.statusCol];
      const dateString = row[cols.dateCol]; 
      const checkinTimeString = row[cols.checkinTimeCol];
      const checkoutTimeString = row[cols.checkoutTimeCol];

      if (status !== '降園' || !dateString || !dateString.includes('/')) {
        return;
      }
      
      const fullStudentCode = row[cols.codeCol] ? row[cols.codeCol].toString().trim() : null;
      if (!fullStudentCode) return;

      const numericCode = fullStudentCode.split(/\s+/)[0];
      if (!numericCode) return;

      const studentInfo = studentInfoMap.get(numericCode);
      if (!studentInfo || studentInfo.burdenRate === 0) return;
      
      let dailyFee = 0;
      const datePart = dateString.split('(')[0];
      const isSaturday = dateString.includes('(土)');

      // --- 朝延長の計算 (短時間のみ) ---
      if (studentInfo.classification === '短時間' && checkinTimeString && checkinTimeString.includes(':')) {
        const checkinTime = new Date(`${datePart} ${checkinTimeString}`);
        const baseMorningLimit = new Date(checkinTime);
        baseMorningLimit.setHours(8, 30, 0, 0);
        
        if (checkinTime.getTime() < baseMorningLimit.getTime()) {
          const isCovered = studentInfo.plans.some(plan => {
            const planStart = new Date(`${datePart} ${plan.startTime}`);
            return checkinTime.getTime() >= planStart.getTime();
          });

          if (!isCovered) {
            const morningOvertimeMillis = baseMorningLimit.getTime() - checkinTime.getTime();
            const morningOvertimeMinutes = morningOvertimeMillis / (1000 * 60);
            const morningNumBlocks = Math.ceil(morningOvertimeMinutes / 30);
            dailyFee += morningNumBlocks * 250;
          }
        }
      }

      // --- 夕方延長の計算 ---
      if (checkoutTimeString && checkoutTimeString.includes(':')) {
        const checkoutTime = new Date(`${datePart} ${checkoutTimeString}`);
        
        const baseEveningLimit = new Date(checkoutTime);
        if (studentInfo.classification === '短時間') {
          baseEveningLimit.setHours(16, 30, 0, 0);
        } else {
          baseEveningLimit.setHours(18, 30, 0, 0);
        }

        if (checkoutTime.getTime() > baseEveningLimit.getTime()) {
          let coveredTime = baseEveningLimit.getTime();
          studentInfo.plans.forEach(plan => {
              const planEnd = new Date(`${datePart} ${plan.endTime}`);
              if (planEnd.getTime() > coveredTime) {
                  coveredTime = planEnd.getTime();
              }
          });
          
          if (checkoutTime.getTime() > coveredTime) {
            let eveningFee = 0;
            let currentTime = new Date(coveredTime);

            while (currentTime < checkoutTime) {
                let blockFee = 250;
                let effectiveBurdenRate = studentInfo.burdenRate;

                // 【修正点】土曜日と平日のルールを切り分け
                if (isSaturday) {
                    if (studentInfo.classification === '標準') {
                        effectiveBurdenRate = 1;
                    } else { // 短時間
                        const rule1730Time = new Date(currentTime);
                        rule1730Time.setHours(17, 30, 0, 0);
                        if (currentTime.getTime() >= rule1730Time.getTime()) {
                            effectiveBurdenRate = 1;
                        }
                    }
                } else { // 平日
                    if (nurseryName === '大口町中保育園') {
                        const rule1900Time = new Date(currentTime);
                        rule1900Time.setHours(19, 0, 0, 0);
                        if (currentTime.getTime() >= rule1900Time.getTime()) {
                            effectiveBurdenRate = 1;
                        }
                    } else { // 他の3施設
                        const rule1830Time = new Date(currentTime);
                        rule1830Time.setHours(18, 30, 0, 0);
                        if (currentTime.getTime() >= rule1830Time.getTime()) {
                            effectiveBurdenRate = 1;
                        }
                    }
                }
                
                blockFee *= effectiveBurdenRate;
                eveningFee += blockFee;
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
            dailyFee += Math.min(eveningFee, 500);
          }
        }
      }
      
      if (dailyFee > 0) {
        const currentTotal = totalFees.get(numericCode) || 0;
        totalFees.set(numericCode, currentTotal + dailyFee);
        overtimeRows.push(row);
      }

    } catch(e) {
      Logger.log(`計算エラー発生行: ${row.join(", ")} | エラー: ${e.message}`);
    }
  });
  
  for (let [code, fee] of totalFees.entries()) {
    const roundedFee = Math.floor(fee / 10) * 10;
    totalFees.set(code, roundedFee);
  }
  return { totalFees, overtimeRows };
}

function parseChildCode(codeString) {
  try {
    const trimmedCode = codeString.trim();
    const parts = trimmedCode.split(/\s+/);
    const infoPart = parts[parts.length - 1];
    
    const burdenRateMatch = infoPart.match(/(\d+(\.\d+)?)$/);
    if (!burdenRateMatch) {
      return { classification: '標準', burdenRate: 1.0 };
    }
    const burdenRate = parseFloat(burdenRateMatch[1]);
    
    let classification = '標準';
    if (infoPart.includes('短時間')) {
      classification = '短時間';
    }
    
    return { classification, burdenRate };
  } catch (e) {
    Logger.log(`園児コードの解析に失敗: "${codeString}" - ${e.message}`);
    return { classification: '標準', burdenRate: 1.0 };
  }
}

