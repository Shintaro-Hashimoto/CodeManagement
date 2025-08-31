/**
 * Google Drive上のCSVをExcelに変換し、実行結果をSlack API経_new_format由で通知するスクリプト。
 * Slack通知の形式をBlock Kitベースの新しいフォーマットに更新。
 *
 * @version 39.0 - Final with New Slack Format
 */

// ===========================
// メイン処理
// ===========================

/**
 * メインの実行関数。この関数をトリガーに設定する。
 */
function runAndNotifyInNewFormat() {
  // ▼ 通知のタイトルを設定 ▼
  const SLACK_MESSAGE_TITLE = "【東海市：勤怠データ生成バッチ】";
  
  // スクリプトプロパティからチャンネルIDを取得
  const SLACK_CHANNEL_ID = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');
  if (!SLACK_CHANNEL_ID) {
    Logger.log('エラー: スクリプトプロパティに SLACK_CHANNEL_ID が設定されていません。');
    return;
  }

  const logLines = [];
  const customLogger = function(message) {
    Logger.log(message);
    logLines.push(message);
  };

  customLogger("--- バッチ処理が開始されました ---");

  try {
    executeMainLogic(customLogger);
    postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "正常終了", logLines.join('\n'));
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
    const errorMessage = errorDetails.join('\n');
    customLogger(errorMessage);
    postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "実行エラー", errorMessage);
  }
}


/**
 * 実際のファイル処理を行う関数（ロジックは変更なし）
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


// ===========================
// ユーティリティ関数
// ===========================

/**
 * 【NEW】Block KitとAttachmentsを組み合わせたハイブリッド形式で通知を送信する
 * @param {string} channelId - 投稿先のチャンネルID
 * @param {string} title - 通知のタイトル
 * @param {string} status - 実行ステータス ("正常終了", "実行エラー", "情報")
 * @param {string} details - 詳細メッセージ
 */
function postHybridMessage(channelId, title, status, details) {
  const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!botToken) {
    Logger.log('Slackのボットトークンが設定されていません。');
    return;
  }
  const executionTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let statusText, color;
  switch (status) {
    case "正常終了": statusText = "Success"; color = "#36a64f"; break;
    case "実行エラー": statusText = "Failure"; color = "#e01e5a"; break;
_message
    case "情報": statusText = "Information"; color = "#439fe0"; break;
    default: statusText = "Unknown"; color = "#808080"; break;
  }

  const shortTitle = title.substring(title.indexOf('：') + 1, title.length - 1);

  const payload = {
    "channel": channelId,
    "text": `${title} 実行結果`, // 通知のフォールバックテキスト
    "attachments": [
      {
        "color": color,
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `*${shortTitle}*`
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": `*実行日時:*\n${executionTime}`
              },
              {
                "type": "mrkdwn",
                "text": `*ステータス:*\n${statusText}`
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*詳細:*\n```" + details + "```"
            }
          }
        ]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json; charset=utf-8',
    'headers': {
      'Authorization': 'Bearer ' + botToken
    },
    'payload': JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  } catch (e) {
    Logger.log('Slack APIへの通知に失敗しました: ' + e.message);
  }
}


// --- 以下、ファイル処理関連のヘルパー関数（ロジックは変更なし） ---

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
    const response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token } });
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
    if (no && name) { map[no.toString()] = name.toString().trim(); }
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
