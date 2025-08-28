/**
 * @system enスケジューラ
 * @fileoverview 指定されたフォルダのCSVファイルをスプレッドシートにインポートし、Slack API経由で結果を通知する
 * @version 5.3
 * @author (あなたの名前)
 * @date 2025-08-28
 * @description Slack通知のテキストを法人レポート分割バッチと統一
 */

// ===========================
// メイン処理
// ===========================

function importCsvAndArchive() {
  // ▼ 通知のタイトルを設定 ▼
  const SLACK_MESSAGE_TITLE = "【enスケジューラ：CSVファイル取込】";

  // ▼ スクリプトプロパティからチャンネルIDを取得 ▼
  const SLACK_CHANNEL_ID = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID');

  if (!SLACK_CHANNEL_ID) {
    Logger.log('エラー: スクリプトプロパティに SLACK_CHANNEL_ID が設定されていません。');
    return;
  }

  const logMessages = [];

  try {
    const spreadsheetId = "1_XLImss5Y0kC7ZZKLLK4vjjcImSlc_0wjCDlvouKQUA";
    const folderId = "1MyyQ-ya296tLAgtTM8v67yQ3N_RyxEEm";
    const sheetName = "履歴";

    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("シートが見つかりません: " + sheetName);
    }

    const parentFolder = DriveApp.getFolderById(folderId);
    let archiveFolder;
    const folders = parentFolder.getFoldersByName("old");
    if (folders.hasNext()) {
      archiveFolder = folders.next();
    } else {
      archiveFolder = parentFolder.createFolder("old");
    }

    const filesIterator = parentFolder.getFilesByType(MimeType.CSV);
    const fileList = [];
    while (filesIterator.hasNext()) {
      fileList.push(filesIterator.next());
    }

    if (fileList.length === 0) {
      const noFilesMsg = "処理対象のCSVファイルがありませんでした。";
      Logger.log(noFilesMsg);
      postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "情報", noFilesMsg);
      return;
    }

    fileList.sort((a, b) => a.getName().localeCompare(b.getName()));

    fileList.forEach(file => {
      const fileName = file.getName();
      try {
        const csvData = Utilities.parseCsv(file.getBlob().getDataAsString("utf-8"));
        if (csvData.length <= 1) {
          const log = `⚠️ ${fileName} はヘッダーのみのためスキップしました。`;
          logMessages.push(log);
          Logger.log(log);
          return;
        }
        const dataRows = csvData.slice(1);
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
        file.moveTo(archiveFolder);
        const log = `✅ ${fileName} を取り込み（${dataRows.length} 行）`;
        logMessages.push(log);
        Logger.log(log);
      } catch (e) {
        const log = `❌ ${fileName} の処理エラー：${e.message}`;
        logMessages.push(log);
        Logger.log(log);
      }
    });

    const summaryMessage = `処理が完了しました。\n\n${logMessages.join('\n')}`;
    Logger.log(summaryMessage);
    postHybridMessage(SLACK_CHANNEL_ID, SLACK_MESSAGE_TITLE, "正常終了", summaryMessage);

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
