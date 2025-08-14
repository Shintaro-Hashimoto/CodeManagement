function savePdfAttachmentsToDrive() {
  const groupEmail = "scan@approg.com";
  const driveFolderId = "0AAWar0_Msoi_Uk9PVA";

  // 1. グループアドレスで受信した未読メールを検索
  const search_query = `to:${groupEmail} subject:"Scan Data from FX-1C7D22481C13" has:attachment filename:pdf is:unread`;

  const threads = GmailApp.search(search_query);

  if (threads.length === 0) {
    Logger.log("該当する未読メールが見つかりませんでした。");
    return;
  }

  const driveFolder = DriveApp.getFolderById(driveFolderId);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      // isUnread()で再度未読か確認すると、より確実になります
      if (message.isUnread()) {
        const attachments = message.getAttachments();
        attachments.forEach(attachment => {
          if (attachment.getContentType() === MimeType.PDF) {
            try {
              // ファイル名にタイムスタンプを付与して重複を回避
              const fileName = `Scan_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss")}_${attachment.getName()}`;
              
              // ★★★ 修正箇所 ★★★
              // 添付ファイルのブロブをコピーし、新しい名前を設定してファイルを作成します。
              driveFolder.createFile(attachment.copyBlob().setName(fileName));
              
              Logger.log(`ファイル '${fileName}' をGoogle Driveに保存しました。`);
              
              // 処理済みのメールを既読にする
              message.markRead();
            } catch (e) {
              Logger.log(`ファイルの保存中にエラーが発生しました: ${e.toString()}`);
            }
          }
        });
      }
    });
  });
}