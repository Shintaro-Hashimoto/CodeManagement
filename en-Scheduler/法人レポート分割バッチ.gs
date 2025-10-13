/**
 * @system enスケジューラ
 * @fileoverview 法人ごとに履歴を分割し、追加フィールドをID・施設名付きで別シートに展開する
 * @version 7.6
 * @author (あなたの名前)
 * @date 2025-10-13
 * @description 安定版v7.2をベースに、カスタム項目シートへ「施設名」を追加する機能を再実装。構文エラーを完全修正。
 */

// ===========================
// メイン処理
// ===========================

function splitHistoryByCorporation_withFormatting() {
  // ▼ 通知のタイトルを設定 ▼
  const SLACK_MESSAGE_TITLE = "【enスケジューラ：法人レポート分割バッチ】";
  
  const SLACK_CHANNEL_ID = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');

  if (!SLACK_CHANNEL_ID) {
    Logger.log('エラー: スクリプトプロパティに SLACK_CHANNEL_ID が設定されていません。');
    return;
  }

  let processedCount = 0;
  let customFieldRecordCount = 0;
  const updatedCorps = new Set();
  const customFieldSheetsCache = {};

  try {
    const historySheetId = "1_XLImss5Y0kC7ZZKLLK4vjjcImSlc_0wjCDlvouKQUA";
    const corpMapSheetId = "1nukNFft5yE2dyfporzp0UQFgBUXPk83lfNEeWLh0bQA";
    const parentFolderId = "1l5MT7BO4vz4siWF7HMBoXtiGAGyKlwxR";
    const subFolderName = "法人毎の履歴";

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
    const customFieldIndex = header.indexOf("追加フィールド");
    const facilityIndex = header.indexOf("施設名"); // ★追加: 施設名列のインデックスを取得

    if (idColIndex === -1) {
      idColIndex = header.length;
      historySheet.getRange(1, idColIndex + 1).setValue("ID");
      header.push("ID");
    }

    const parentFolder = DriveApp.getFolderById(parentFolderId);
    let outputFolder;
    const subFolders = parentFolder.getFoldersByName(subFolderName);
    if (subFolders.hasNext()) {
        outputFolder = subFolders.next();
    } else {
        outputFolder = parentFolder.createFolder(subFolderName);
        Logger.log(`サブフォルダ「${subFolderName}」を作成しました。`);
    }

    records.forEach((row, i) => {
      const rowNum = i + 2;
      let uuid = historySheet.getRange(rowNum, idColIndex + 1).getValue();
      if (uuid !== "") return;

      uuid = Utilities.getUuid();
      historySheet.getRange(rowNum, idColIndex + 1).setValue(uuid);

      processedCount++;
      const facility = row[facilityIndex]; // ★追加: 行から施設名を取得
      const corpName = facilityToCorp[facility] || "未登録施設";
      updatedCorps.add(corpName);

      // --- 1. 履歴データの処理 ---
      const historyFileName = `法人レポート_${corpName}`;
      const historyTargetSS = getOrCreateSpreadsheetInFolder(historyFileName, outputFolder);
      const historyTargetSheet = getOrCreateSheet(historyTargetSS, "履歴");

      if (historyTargetSheet.getLastRow() === 0) {
        historyTargetSheet.appendRow(header);
      }

      const formattedRow = formatDatesInRow(row, header, displayRecords[i]);
      while (formattedRow.length < header.length) { formattedRow.push(""); }
      formattedRow[idColIndex] = uuid;
      historyTargetSheet.appendRow(formattedRow);

      // --- 2. カスタム項目データ(JSON)の処理 ---
      if (customFieldIndex !== -1 && row[customFieldIndex]) {
        try {
          const customData = JSON.parse(row[customFieldIndex]);
          if (Object.keys(customData).length === 0) return;

          customFieldRecordCount++;

          if (!customFieldSheetsCache[corpName]) {
            const customFileName = `法人レポート_${corpName}_追加フィールド項目`;
            const customSS = getOrCreateSpreadsheetInFolder(customFileName, outputFolder);
            const customSheet = getOrCreateSheet(customSS, "追加フィールド");
            let customHeader = [];
            if (customSheet.getLastRow() > 0) {
              customHeader = customSheet.getRange(1, 1, 1, customSheet.getLastColumn()).getValues()[0];
            } else {
              // ★修正点: ヘッダーに「施設名」を追加
              customHeader = ["ID", "施設名"];
              customSheet.appendRow(customHeader);
            }
            customFieldSheetsCache[corpName] = { sheet: customSheet, header: customHeader };
          }
          
          const cache = customFieldSheetsCache[corpName];
          const customSheet = cache.sheet;
          let customHeader = cache.header;
          
          let headerNeedsUpdate = false;
          // ★修正点: 新しい行の初期データに施設名を追加
          const newRowData = new Array(customHeader.length).fill("");
          newRowData[0] = uuid;
          newRowData[1] = facility;

          for (const question in customData) {
            let answer = customData[question];
            if (Array.isArray(answer)) {
              answer = answer.filter(item => item != null).join(', ');
            }
            
            let questionIndex = customHeader.indexOf(question);
            
            if (questionIndex === -1) {
              questionIndex = customHeader.length;
              customHeader.push(question);
              newRowData.push("");
              headerNeedsUpdate = true;
            }
            newRowData[questionIndex] = answer;
          }
          
          if (headerNeedsUpdate) {
            customSheet.getRange(1, 1, 1, customHeader.length).setValues([customHeader]);
          }
          
          customSheet.appendRow(newRowData);

        } catch(e) {
          Logger.log(`行 ${rowNum} のJSON解析エラー: ${e.message} - データ: ${row[customFieldIndex]}`);
        }
      }
    });

    // --- 処理終了後の通知 ---
    let summaryMessage;
    if (processedCount === 0) {
      summaryMessage = "新たに処理するレコードはありませんでした。";
      Logger.log(summaryMessage);
      postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "情報", summaryMessage);
    } else {
      const updatedFilesList = Array.from(updatedCorps).map(corpName => `✅${corpName}`).join('\n');
      summaryMessage = `処理が完了しました。\n✅新規処理件数: ${processedCount} 件 (うちカスタム項目あり: ${customFieldRecordCount} 件)\n【更新/作成ファイル】\n${updatedFilesList}`;
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
// ユーティリティ関数（変更なし）
// ===========================

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
          { "type": "section", "text": { "type": "mrkdwn", "text": `*${shortTitle}*` } },
          { "type": "section", "fields": [
              { "type": "mrkdwn", "text": `*実行日時:*\n${executionTime}` },
              { "type": "mrkdwn", "text": `*ステータス:*\n${statusText}` }
            ]
          },
          { "type": "divider" },
          { "type": "section", "text": { "type": "mrkdwn", "text": "*詳細:*\n```" + details + "```" } }
        ]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'Authorization': 'Bearer ' + botToken },
    'payload': JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  } catch (e) {
    Logger.log('Slack APIへの通知に失敗しました: ' + e.message);
  }
}

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

