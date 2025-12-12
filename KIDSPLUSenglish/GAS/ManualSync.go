/**
 * ===================================================================
 * 手動実行用: 未来の予約を一括同期・強制更新する (ManualSync.gs)
 * ===================================================================
 */

/**
 * ★手動実行ボタン★
 * 今日以降の「予約済」データを全てチェックし、
 * カレンダーに存在すれば「更新」、なければ「新規作成」します。
 * (法人・マスター・講師カレンダー 全対応版)
 */
function syncFutureReservationsManual() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  
  // マスタ類読み込み
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");

  const yoyakuData = yoyakuSheet.getDataRange().getValues();
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const timetableData = sheetToObjects(timetableSheet);
  const koushiData = sheetToObjects(koushiSheet);

  // 日付フィルタ用 (今日 00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // タスクまとめ用マップ
  const tasks = {};
  let updateCount = 0;
  let createCount = 0;

  Logger.log("--- 手動同期（強制更新）を開始します ---");

  // 1. データ走査 & タスク作成
  for (let i = 1; i < yoyakuData.length; i++) {
    const row = yoyakuData[i];
    const status = row[3];
    const lessonDate = new Date(row[5]);
    
    // ★フィルタ: 「今日以降」かつ「予約済」のみ対象
    if (lessonDate < today || status !== "予約済") continue;

    const currentEventId = row[8];       // I列: 法人
    const currentMasterEventId = row[9]; // J列: マスター
    const currentInstructorEventId = row[10]; // ★K列: 講師

    const reservationId = row[0];
    const facilityId = row[2];
    const timeName = row[6];
    const koushiId = row[7];
    const className = row[4];

    const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(facilityId));
    if (!shisetsu) continue;
    const houjin = houjinData.find(h => String(h.法人ID) === String(shisetsu.法人ID));
    const timeInfo = timetableData.find(t => t.時間名 === timeName);
    if (!timeInfo) continue;
    
    // 講師情報取得
    const koushi = koushiData.find(k => String(k.講師ID) === String(koushiId));

    // 日時計算
    const startTime = new Date(lessonDate);
    const endTime = new Date(lessonDate);
    const tStart = new Date(timeInfo.開始時間);
    const tEnd = new Date(timeInfo.終了時間);
    startTime.setHours(tStart.getHours(), tStart.getMinutes(), 0);
    endTime.setHours(tEnd.getHours(), tEnd.getMinutes(), 0);

    const item = {
      rowIndex: i + 1,
      reservationId: reservationId,
      shisetsu: shisetsu,
      houjin: houjin,
      koushiId: koushiId,
      timeName: timeName,
      className: className,
      currentEventId: currentEventId,
      currentMasterEventId: currentMasterEventId,
      currentInstructorEventId: currentInstructorEventId
    };

    // A. 法人カレンダー用タスク
    if (houjin && houjin.連携カレンダーID) {
      addManualTask(tasks, houjin.連携カレンダーID, startTime, endTime, koushiId, item, 'corp');
    }

    // B. マスターカレンダー用タスク
    if (typeof MASTER_CALENDAR_ID !== 'undefined' && MASTER_CALENDAR_ID) {
      addManualTask(tasks, MASTER_CALENDAR_ID, startTime, endTime, koushiId, item, 'master');
    }

    // C. ★講師カレンダー用タスク (ここを追加)
    if (koushi) {
      const instructorCalId = koushi["カレンダーID"] || koushi["担当者メールアドレス"];
      if (instructorCalId) {
        addManualTask(tasks, instructorCalId, startTime, endTime, koushiId, item, 'instructor');
      }
    }
  }

  // 2. カレンダー登録・更新実行
  // (Calendar.gs にある generateEventContent が必要です)
  if (typeof generateEventContent !== 'function') {
    Logger.log("エラー: Calendar.gs が見つからないか、generateEventContent 関数がありません。");
    return;
  }

  const taskKeys = Object.keys(tasks);
  if (taskKeys.length === 0) {
    Logger.log("対象の予約はありませんでした。");
    return;
  }

  taskKeys.forEach(key => {
    const task = tasks[key];
    try {
      const cal = CalendarApp.getCalendarById(task.calId);
      if (cal) {
        // タイトル・詳細文の生成 (講師用は英語タイトル)
        const isEnglish = (task.type === 'instructor');
        const content = generateEventContent(task.items, koushiData, isEnglish);
        
        // 既存IDを探す
        let existingEventId = "";
        task.items.forEach(item => {
          let id = "";
          if (task.type === 'corp') id = item.currentEventId;
          else if (task.type === 'master') id = item.currentMasterEventId;
          else if (task.type === 'instructor') id = item.currentInstructorEventId; // ★

          if (id && !existingEventId) existingEventId = id;
        });

        let event = null;
        if (existingEventId) {
          try {
            event = cal.getEventById(existingEventId);
          } catch (e) {
            // IDはあるがカレンダーに見つからない場合
          }
        }

        if (event) {
          // --- 更新モード ---
          event.setTitle(content.title);
          event.setDescription(content.description);
          if (content.location) event.setLocation(content.location);
          
          updateCount++;
          Logger.log(`[${task.type}] 更新: ${content.title}`);
          
        } else {
          // --- 新規作成モード ---
          event = cal.createEvent(content.title, task.start, task.end, {
            description: content.description,
            location: content.location
          });
          const newEventId = event.getId();
          
          createCount++;
          Logger.log(`[${task.type}] 新規作成: ${content.title}`);

          // IDをシートに書き込む
          task.items.forEach(item => {
            if (task.type === 'corp') {
              yoyakuSheet.getRange(item.rowIndex, 9).setValue(newEventId);
            } else if (task.type === 'master') {
              yoyakuSheet.getRange(item.rowIndex, 10).setValue(newEventId);
            } else if (task.type === 'instructor') {
              yoyakuSheet.getRange(item.rowIndex, 11).setValue(newEventId); // ★K列
            }
          });
        }
        
        // API制限回避
        Utilities.sleep(150);
      }
    } catch (e) {
      Logger.log(`エラー: ${e.toString()}`);
    }
  });

  Logger.log(`--- 処理終了: 更新 ${updateCount}件 / 新規作成 ${createCount}件 ---`);
}

// タスク追加ヘルパー (キー生成ロジックの共通化)
function addManualTask(tasks, calId, start, end, koushiId, item, type) {
  const key = `${calId}_${start.getTime()}_${koushiId}`;
  if (!tasks[key]) {
    tasks[key] = {
      calId: calId,
      start: start,
      end: end,
      items: [],
      type: type 
    };
  }
  tasks[key].items.push(item);
}