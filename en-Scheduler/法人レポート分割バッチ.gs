/**
 * @system enスケジューラ
 * @fileoverview 法人ごとに履歴を分割してスプレッドシートに出力し、Slack API経由で結果を通知する
 * @version 5.5
 * @author (あなたの名前)
 * @date 2025-09-02
 * @description 出力先をサブフォルダ「法人毎の履歴」に変更
 */

// ===========================
// メイン処理
// ===========================

function splitHistoryByCorporation_withFormatting() {
  // ▼ 通知のタイトルを設定 ▼
  const SLACK_MESSAGE_TITLE = "【enスケジューラ：法人レポート分割バッチ】";
  
  // スクリプトプロパティからチャンネルIDを取得
  const SLACK_CHANNEL_ID = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');

  if (!SLACK_CHANNEL_ID) {
    Logger.log('エラー: スクリプトプロパティに SLACK_CHANNEL_ID が設定されていません。');
    return;
  }

  let processedCount = 0;
  const updatedCorps = new Set();

  try {
    const historySheetId = "1_XLImss5Y0kC7ZZKLLK4vjjcImSlc_0wjCDlvouKQUA";
    const corpMapSheetId = "1nukNFft5yE2dyfporzp0UQFgBUXPk83lfNEeWLh0bQA";
    // ★修正点①: 親フォルダのIDと、目的のサブフォルダ名を設定
    const parentFolderId = "1l5MT7BO4vz4siWF7HMBoXtiGAGyKlwxR"; // 親フォルダ「ログデータ」のID
    const subFolderName = "法人毎の履歴"; // 保存したいサブフォルダ名

    const historySS = SpreadsheetApp.openById(historySheetId);
    const corpMapSS = SpreadsheetApp.openById(corpMapSheetId);
    const historySheet = historySS.getSheetByName("履歴");
    const corpMapSheet = corpMapSS.getSheetByName("シート1");
    if (!historySheet || !corpMapSheet) {
      throw new Error("履歴または法人グループシートが見つかりません。");
    }

    const corpMapData = corpMapSheet.getRange(2, 1, corpMapSheet.getLastRow() - 1, 2).getValues();
    const facilityToCorp = {};
    corpMapData.forEach(row => { facilityToCorp[row[1]] = row[0]; });

    const allData = historySheet.getDataRange().getValues();
    const displayData = historySheet.getDataRange().getDisplayValues();
    const header = allData[0];
    const records = allData.slice(1);
    const displayRecords = displayData.slice(1);

    let idColIndex = header.indexOf("ID");
    if (idColIndex === -1) {
      idColIndex = header.length;
      historySheet.getRange(1, idColIndex + 1).setValue("ID");
      header.push("ID");
    }

    // ★修正点②: 親フォルダの中からサブフォルダを取得、なければ作成
    const parentFolder = DriveApp.getFolderById(parentFolderId);
    let outputFolder;
    const subFolders = parentFolder.getFoldersByName(subFolderName);
    if (subFolders.hasNext()) {
        outputFolder = subFolders.next(); // 既存のサブフォルダを使用
    } else {
        outputFolder = parentFolder.createFolder(subFolderName); // サブフォルダを新規作成
        Logger.log(`サブフォルダ「${subFolderName}」を作成しました。`);
    }

    records.forEach((row, i) => {
      const rowNum = i + 2;
      const idValue = historySheet.getRange(rowNum, idColIndex + 1).getValue();
      if (idValue !== "") return;

      processedCount++;
      const facilityIndex = header.indexOf("施設名");
      const facility = row[facilityIndex];
      const corpName = facilityToCorp[facility] || "未登録施設";
      updatedCorps.add(corpName);

      const fileName = `法人レポート_${corpName}`;
      // ★修正点③: 取得したサブフォルダを保存先として渡す
      const targetSS = getOrCreateSpreadsheetInFolder(fileName, outputFolder);
      const targetSheet = getOrCreateSheet(targetSS, "履歴");

      if (targetSheet.getLastRow() === 0) {
        targetSheet.appendRow(header);
      }

      const uuid = Utilities.getUuid();
      const formattedRow = formatDatesInRow(row, header, displayRecords[i]);
      while (formattedRow.length < header.length) {
        formattedRow.push("");
      }
      formattedRow[idColIndex] = uuid;
      targetSheet.appendRow(formattedRow);
      historySheet.getRange(rowNum, idColIndex + 1).setValue(uuid);
    });

    // --- 処理終了後の通知 ---
    let summaryMessage;
    if (processedCount === 0) {
      summaryMessage = "新たに処理するレコードはありませんでした。";
      Logger.log(summaryMessage);
      postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "情報", summaryMessage);
    } else {
      const updatedFilesList = Array.from(updatedCorps).map(corpName => `✅${corpName}`).join('\n');
      summaryMessage = `処理が完了しました。\n✅新規処理件数: ${processedCount} 件\n【更新/作成ファイル】\n${updatedFilesList}`;
      Logger.log(summaryMessage);
      postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "正常終了", summaryMessage);
    }

  } catch (e) {
    const errorMessage = `処理中に致命的なエラーが発生しました。\nエラー内容: ${e.message}\nスタックトレース: ${e.stack}`;
    Logger.log(errorMessage);
    postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "実行エラー", errorMessage);
  }
}

// ===========================
// ユーティリティ関数
// ===========================

/**
 * Block KitとAttachmentsを組み合わせたハイブリッド形式で通知を送信する
 * @param {string} channelId - 投稿先のチャンネルID
 * @param {string} title - 通知のタイトル
 * @param {string} status - 実行ステータス
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
    case "情報": statusText = "Information"; color = "#439fe0"; break;
    default: statusText = "Unknown"; color = "#808080"; break;
  }

  const shortTitle = title.substring(title.indexOf('：') + 1, title.length - 1);

  const payload = {
    "channel": channelId,
    "text": `${title} 実行結果`,
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
    'contentType': 'application/json',
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

/**
 * 日付整形ユーティリティ関数
 */
function formatDatesInRow(row, header, displayRow) {
  if (!Array.isArray(row) || !Array.isArray(displayRow)) {
    throw new Error("formatDatesInRow: 無効な行データが渡されました。");
  }
  const formatted = row.slice();
  for (let i = 0; i < header.length; i++) {
    const colName = header[i];
    if (["予約日", "お子様の生年月日", "入園希望時期"].includes(colName)) {
      if (row[i] instanceof Date) {
        formatted[i] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
    }
    if (colName === "登録時日時") {
      formatted[i] = displayRow[i];
    }
  }
  return formatted;
}

/**
 * ファイル／シート操作系ユーティリティ関数
 */
function getOrCreateSpreadsheetInFolder(fileName, folder) {
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    const newSS = SpreadsheetApp.create(fileName);
    const file = DriveApp.getFileById(newSS.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    return newSS;
  }
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;
  const allSheets = ss.getSheets();
  if (allSheets.length === 1 && allSheets[0].getName() === "シート1") {
    allSheets[0].setName(sheetName);
    return allSheets[0];
  }
  return ss.insertSheet(sheetName);
}

