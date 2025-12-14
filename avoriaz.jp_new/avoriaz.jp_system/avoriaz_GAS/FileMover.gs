// ==========================================================
// FileMover.gs - PDFファイル移動・コピー処理
// ==========================================================

// --- フォルダID設定 ---
const SOURCE_FOLDER_ID = '18qRewwSPN22stWMlfITE0JKzxTwK9nLc'; // PDF作成先（マイドライブ）
const DEST_FOLDER_ID   = '1YUWpoCMXZXkP_V1pJwSZa7EiILeQCNiK'; // PDFコピー先（共有ドライブ）
const ARCHIVE_FOLDER_NAME = 'old'; // 移動先のフォルダ名

function copyAndArchivePDFs() {
  try {
    // 1. フォルダの取得
    const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
    const destFolder   = DriveApp.getFolderById(DEST_FOLDER_ID);
    
    // 2. 'old' フォルダの準備（なければ作成）
    let archiveFolder;
    const folderIter = sourceFolder.getFoldersByName(ARCHIVE_FOLDER_NAME);
    if (folderIter.hasNext()) {
      archiveFolder = folderIter.next();
    } else {
      archiveFolder = sourceFolder.createFolder(ARCHIVE_FOLDER_NAME);
      // Logger.log(`'${ARCHIVE_FOLDER_NAME}' フォルダを新規作成しました。`);
    }

    // 3. PDFファイルの取得
    const files = sourceFolder.getFilesByType(MimeType.PDF);
    
    let count = 0;

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      
      // Logger.log(`処理開始: ${fileName}`);

      // A. 共有ドライブへコピー
      file.makeCopy(fileName, destFolder);
      
      // B. 元ファイルを 'old' へ移動
      file.moveTo(archiveFolder);
      
      count++;
    }

    if (count > 0) {
      Logger.log(`PDF移動完了: ${count} 件`);
    }

  } catch (e) {
    Logger.log(`PDF移動エラー: ${e.toString()}`);
  }
}