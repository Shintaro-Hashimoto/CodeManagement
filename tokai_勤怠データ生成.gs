/**
 * @system 東海市勤怠データ自動仕分け
 * @fileoverview Google Drive上のCSVをExcelに変換し、実行結果をSlack API経由で通知するスクリプト。
 * @version 38.0 - Final with Diagnostic Check
 * @@description 前提条件をチェックする診断機能を含む最終バージョン。
 *
 */

// =========================================================================
// STEP 1: まず、この診断関数を実行してください
// =========================================================================

/**
 * Slack通知の前提条件（プロパティ読み取りと外部通信）が正常に動作するかを確認する診断関数。
 */
function checkSlackPrerequisites() {
  Logger.log("--- 診断関数 checkSlackPrerequisites を開始します ---");
  let botToken, channelId;
  let success = true;

  // 1. スクリプトプロパティの読み取りテスト
  try {
    botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
    channelId = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');
    if (!botToken || !channelId) {
      throw new Error("SLACK_BOT_TOKEN または SLACK_CHANNEL_ID が設定されていません。");
    }
    Logger.log("✅ スクリプトプロパティの読み取りに成功しました。");
  } catch (e) {
    Logger.log("❌ スクリプトプロパティの読み取り中にエラーが発生しました: " + e.message);
    success = false;
  }

  // 2. Slack APIへの通信テスト
  if (success) {
    try {
      const payload = {
        "channel": channelId,
        "text": "【東海市：勤怠データ生成バッチ】診断チェック\n> ✅ Slack APIへの通信テストに成功しました。"
      };
      const options = {
        'method': 'post',
        'contentType': 'application/json; charset=utf-8',
        'headers': { 'Authorization': 'Bearer ' + botToken },
        'payload': JSON.stringify(payload)
      };
      const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
      Logger.log("✅ Slack APIへの通信テストに成功しました。Response: " + response.getContentText());
    } catch (e) {
      Logger.log("❌ Slack APIへの通信中にエラーが発生しました: " + e.message);
      success = false;
    }
  }

  if (success) {
    Logger.log("--- ✅ 診断は正常に完了しました。runBatchAndNotifyByApi を実行してください。 ---");
  } else {
    Logger.log("--- ❌ 診断でエラーが検出されました。上記のエラーメッセージを確認してください。 ---");
  }
}


// =========================================================================
// STEP 2: 診断が成功した場合のみ、このメイン関数を実行してください
// =========================================================================

/**
 * Slack APIを使って実行結果を通知する
 * @param {boolean} isSuccess - 処理が成功したかどうか
 * @param {string[]} logs - 実行ログの配列
 */
function sendSlackApiReport(isSuccess, logs) {
  const SLACK_MESSAGE_TITLE = "【東海市：勤怠データ生成バッチ】";
  const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  const channelId = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');

  if (!botToken || !channelId) {
    Logger.log('SlackのボットトークンまたはチャンネルIDが設定されていません。');
    return;
  }

  const executionTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let resultText;
  let color;

  if (isSuccess) {
    resultText = "処理が正常に完了しました。";
    color = "#36a64f"; // 緑
  } else {
    resultText = "処理中にエラーが発生しました。";
    color = "#e01e5a"; // 赤
  }

  const logArray = Array.isArray(logs) ? logs : ['ログがありません。'];
  let logText = logArray.join('\n');
  if (logText.length > 2800) {
    logText = logText.substring(0, 2800) + "\n...(ログが長すぎるため省略)...";
  }

  const payload = {
    "channel": channelId,
    "text": SLACK_MESSAGE_TITLE + " 実行結果通知",
    "attachments": [
      {
        "color": color,
        "fields": [
          { "title": "実行日時", "value": executionTime, "short": true },
          { "title": "ステータス", "value": resultText, "short": true }
        ],
        "text": "```" + logText + "```",
        "mrkdwn_in": ["text"]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json; charset=utf-8',
    'headers': { 'Authorization': 'Bearer ' + botToken },
    'payload': JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  } catch (e) {
    Logger.log('Slack APIへの通知に失敗しました: ' + e.message);
  }
}

/**
 * メインの実行関数。この関数をトリガーに設定する。
 */
function runBatchAndNotifyByApi() {
  const logLines = [];
  const customLogger = function(message) {
    Logger.log(message);
    logLines.push(message);
  };

  customLogger("--- バッチ処理が開始されました ---");

  try {
    executeMainLogic(customLogger);
    sendSlackApiReport(true, logLines);
  } catch (e) {
    let errorDetails = [];
    try {
      errorDetails.push('★★★ スクリプト全体で予期せぬエラーが発生しました ★★★');
      errorDetails.push('Name: ' + (e.name || 'N/A'));
      errorDetails.push('Message: ' + (e.message || 'N/A'));
      errorDetails.push('File: ' + (e.fileName || 'N/A'));
      errorDetails.push('Line: ' + (e.lineNumber || 'N/A'));
      errorDetails.push('Stack: ' + (e.stack || 'N/A'));
    } catch (parsingError) {
      errorDetails = ['エラーオブジェクトの解析中に、さらに別のエラーが発生しました。'];
    }
    customLogger(errorDetails.join('\n'));
    sendSlackApiReport(false, errorDetails);
  }
}

/**
 * 実際のファイル処理を行う関数
 * @param {function} customLogger - ログ出力用の関数
 */
function executeMainLogic(customLogger) {
  customLogger("--- ファイル処理を開始します ---");
  
  const allFolderId = '133QiGIso-9TefLQmRRIY9OYvB5Q9wlwQ';
  const outputBaseFolderId = '1YNSnnrt6q1z6LlcVTzHPrDC8HmTrXCrP';
  const masterSheetId = '1idayHBP0dF1Ri7UoLQajdj4nBga9it7mvFIHM8cWquw';

  const today = new Date();
  const thisMonthYMD = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy-MM') + '-01';
  const dtFolderName = 'dt=' + thisMonthYMD;
  const expectedCsvFileName = 'attendance_and_departure_' + thisMonthYMD + '.csv';

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const ymdForOutput = Utilities.formatDate(lastMonth, 'Asia/Tokyo', 'yyyy-MM-dd');
  const outputFolderName = Utilities.formatDate(lastMonth, 'Asia/Tokyo', 'yyyy年M月分');
  const outputFolder = getOrCreateSubfolder(DriveApp.getFolderById(outputBaseFolderId), outputFolderName);

  customLogger('出力先フォルダ: ' + outputFolder.getName());

  const masterData = getFacilityMaster(masterSheetId);
  const allFolder = DriveApp.getFolderById(allFolderId);

  const allCityTokaiFolders = allFolder.getFoldersByName('all-city-tokai');
  if (allCityTokaiFolders.hasNext()) {
    const facilityFolder = allCityTokaiFolders.next();
    const logPrefix = '全体(all-city-tokai)';
    const xlsxFileName = '全体_' + ymdForOutput + '.xlsx';

    if (fileExists(outputFolder, xlsxFileName)) {
      customLogger('⏭ スキップ（既に存在）: ' + xlsxFileName);
    } else {
      findAndProcessCsv(facilityFolder, dtFolderName, expectedCsvFileName, xlsxFileName, outputFolder, logPrefix, customLogger);
    }
  }

  const facilityFolders = allFolder.getFolders();
  while (facilityFolders.hasNext()) {
    const facilityFolder = facilityFolders.next();
    const match = facilityFolder.getName().match(/^city-tokai(\d+)$/);
    if (!match) continue;

    const facilityNo = match[1];
    const facilityName = masterData[facilityNo];
    const logPrefix = facilityNo + '.' + facilityName;

    if (!facilityName) {
      customLogger('❌ 施設No ' + facilityNo + ' がマスタに存在しません');
      continue;
    }

    const xlsxFileName = logPrefix + '_' + ymdForOutput + '.xlsx';
    if (fileExists(outputFolder, xlsxFileName)) {
      customLogger('⏭ スキップ（既に存在）: ' + xlsxFileName);
      continue;
    }
    
    findAndProcessCsv(facilityFolder, dtFolderName, expectedCsvFileName, xlsxFileName, outputFolder, logPrefix, customLogger);
  }
}

function findAndProcessCsv(facilityFolder, dtFolderName, expectedCsvFileName, xlsxFileName, outputFolder, logPrefix, customLogger) {
    const subfolders = facilityFolder.getFoldersByName(dtFolderName);
    if (subfolders.hasNext()) {
      const csvFolder = subfolders.next();
      const csvFiles = csvFolder.getFilesByName(expectedCsvFileName);
      if (csvFiles.hasNext()) {
        const csvFile = csvFiles.next();
        processSingleFile(csvFile, xlsxFileName, outputFolder, logPrefix, expectedCsvFileName, customLogger);
      } else {
        customLogger('⚠ CSV未発見: ' + logPrefix);
      }
    } else {
      customLogger('⚠ データフォルダ未発見: ' + logPrefix);
    }
}

function processSingleFile(csvFile, xlsxFileName, outputFolder, logPrefix, expectedCsvFileName, customLogger) {
  try {
    const csvBlob = csvFile.getBlob();
    let csvData = Utilities.parseCsv(csvBlob.getDataAsString('utf-8'));

    if (csvData.length === 0) {
      customLogger('[デバッグ] ' + logPrefix + ': UTF-8でデータが0行でした。Shift_JISで再試行します。');
      csvData = Utilities.parseCsv(csvBlob.getDataAsString('sjis'));
    }

    if (csvData.length === 0 || !csvData[0] || csvData[0].length === 0) {
      customLogger('⚠ 空CSVファイル、またはパース失敗: ' + logPrefix);
      return;
    }

    customLogger('📄 ' + expectedCsvFileName + ' → 読み取り行数: ' + csvData.length + ' (' + logPrefix + ')');

    const tempSpreadsheet = SpreadsheetApp.create('TEMP_' + logPrefix + '_' + new Date().getTime());
    const sheet = tempSpreadsheet.getSheets()[0];
    sheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);

    SpreadsheetApp.flush();

    const tempFileId = tempSpreadsheet.getId();
    const url = 'https://www.googleapis.com/drive/v3/files/' + tempFileId + '/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });

    const blob = response.getBlob().setName(xlsxFileName);
    outputFolder.createFile(blob);
    customLogger('✅ ' + xlsxFileName + ' を保存しました');

    DriveApp.getFileById(tempFileId).setTrashed(true);

  } catch (e) {
    customLogger('❌ エラー: ' + logPrefix + ' → ' + e.message);
    throw e;
  }
}

function getFacilityMaster(sheetId) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const no = data[i][0];
    const name = data[i][1];
    if (no && name) {
      map[no.toString()] = name.toString().trim();
    }
  }
  return map;
}

function fileExists(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  return files.hasNext();
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  const folders = parentFolder.getFoldersByName(subfolderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(subfolderName);
}
