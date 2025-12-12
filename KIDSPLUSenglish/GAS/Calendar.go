/**
 * ===================================================================
 * Googleカレンダー連携機能 (法人 & マスター & 講師 同時同期版)
 * ===================================================================
 */

// ★★★ マスターカレンダーID ★★★
const MASTER_CALENDAR_ID = "c_3899a395a62dfa0e33d68ba02a330895e62c55e35e772c97f6c30694718601f4@group.calendar.google.com";

/**
 * 1. 未登録の予約を検知してカレンダーに同期する関数
 */
function syncNewReservations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const yoyakuSheet = ss.getSheetByName("参加予約");
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const timetableSheet = ss.getSheetByName("時間割マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");

  const yoyakuData = yoyakuSheet.getDataRange().getValues();
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const timetableData = sheetToObjects(timetableSheet);
  const koushiData = sheetToObjects(koushiSheet);

  const tasks = {};

  // 1行目はヘッダーなのでスキップ
  for (let i = 1; i < yoyakuData.length; i++) {
    const row = yoyakuData[i];
    const status = row[3]; // D列:ステータス
    
    // ID列の取得 (I列, J列, ★K列)
    const currentEventId = row[8];       // I列: 法人Cal
    const currentMasterEventId = row[9]; // J列: マスターCal
    const currentInstructorEventId = row[10]; // ★K列: 講師Cal (新規追加)

    // 「予約済」かつ、どれか1つでもIDが欠けていれば同期処理を試みる
    if (status === "予約済" && (!currentEventId || !currentMasterEventId || !currentInstructorEventId)) {
      
      const reservationId = row[0];
      const facilityId = row[2];
      const lessonDate = new Date(row[5]);
      const timeName = row[6];
      const koushiId = row[7];
      const className = row[4];

      const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(facilityId));
      if (!shisetsu) continue;
      const houjin = houjinData.find(h => String(h.法人ID) === String(shisetsu.法人ID));
      const timeInfo = timetableData.find(t => t.時間名 === timeName);
      if (!timeInfo) continue;
      
      // 講師情報の取得
      const koushi = koushiData.find(k => String(k.講師ID) === String(koushiId));

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

      // --- タスク生成処理 ---

      // A. 法人カレンダー
      if (!currentEventId && houjin && houjin.連携カレンダーID) {
        addTask(tasks, houjin.連携カレンダーID, startTime, endTime, koushiId, item, 'corp');
      }

      // B. マスターカレンダー
      if (!currentMasterEventId && MASTER_CALENDAR_ID) {
        addTask(tasks, MASTER_CALENDAR_ID, startTime, endTime, koushiId, item, 'master');
      }

      // C. ★講師カレンダー (ここを追加)
      if (!currentInstructorEventId && koushi) {
        // カレンダーIDがあれば使用、なければメールアドレスを使用
        const instructorCalId = koushi["カレンダーID"] || koushi["担当者メールアドレス"]; // カラム名は実際のマスタに合わせてください
        
        if (instructorCalId) {
          addTask(tasks, instructorCalId, startTime, endTime, koushiId, item, 'instructor');
        }
      }
    }
  }

  // --- タスク実行 (カレンダー書き込み) ---
  Object.values(tasks).forEach(task => {
    try {
      const cal = CalendarApp.getCalendarById(task.calId);
      if (!cal) return;

      // コンテンツ生成 (講師用カレンダーの場合は英語タイトルにする)
      const isEnglish = (task.type === 'instructor');
      const content = generateEventContent(task.items, koushiData, isEnglish);
      
      const event = cal.createEvent(content.title, task.start, task.end, {
        description: content.description,
        location: content.location
      });
      const newEventId = event.getId();
      Logger.log(`Event Created: ${content.title} (${task.calId})`);

      // スプレッドシートへIDを書き戻し
      task.items.forEach(item => {
        if (task.type === 'corp') {
          yoyakuSheet.getRange(item.rowIndex, 9).setValue(newEventId); // I列
        } else if (task.type === 'master') {
          yoyakuSheet.getRange(item.rowIndex, 10).setValue(newEventId); // J列
        } else if (task.type === 'instructor') {
          yoyakuSheet.getRange(item.rowIndex, 11).setValue(newEventId); // ★K列
        }
      });

    } catch (e) {
      Logger.log(`Sync Error (${task.calId}): ${e.toString()}`);
    }
  });
}

// タスク追加用ヘルパー
function addTask(tasks, calId, start, end, koushiId, item, type) {
  // キーに calId を含めることで、同じ講師でもカレンダーが違えば別タスクにする
  const key = `${calId}_${start.getTime()}_${koushiId}`;
  if (!tasks[key]) {
    tasks[key] = {
      calId: calId,
      start: start,
      end: end,
      items: [],
      type: type // corp, master, instructor
    };
  }
  tasks[key].items.push(item);
}


/**
 * 2. 予約キャンセル時にカレンダーから削除(または更新)する関数
 */
function deleteEventFromCalendars(eventId, masterEventId, instructorEventId, facilityId, cancelledReservationId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shisetsuSheet = ss.getSheetByName("施設マスタ");
  const houjinSheet = ss.getSheetByName("法人マスタ");
  const koushiSheet = ss.getSheetByName("講師マスタ");
  
  const shisetsuData = sheetToObjects(shisetsuSheet);
  const houjinData = sheetToObjects(houjinSheet);
  const koushiData = sheetToObjects(koushiSheet); // 講師情報も必要

  // A. 法人カレンダー処理
  if (eventId) {
    const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(facilityId));
    if (shisetsu) {
      const houjin = houjinData.find(h => String(h.法人ID) === String(shisetsu.法人ID));
      if (houjin && houjin.連携カレンダーID) {
        updateOrDeleteEvent(houjin.連携カレンダーID, eventId, cancelledReservationId, 'corp', koushiData);
      }
    }
  }

  // B. マスターカレンダー処理
  if (masterEventId && MASTER_CALENDAR_ID) {
    updateOrDeleteEvent(MASTER_CALENDAR_ID, masterEventId, cancelledReservationId, 'master', koushiData);
  }

  // C. ★講師カレンダー処理
  if (instructorEventId) {
    // 予約データから講師IDを特定する必要があるが、ここでは引数にないので
    // 削除対象のイベントIDを持っている講師を探すか、呼び出し元で講師IDを渡す必要がある。
    // ※今回は「IDを知っているカレンダーから消す」ため、予約データ全体からこのイベントIDを持つ行を探すロジックを updateOrDeleteEvent に委ねる
    // (ただし講師IDが不明だとカレンダーIDが特定できないため、本来は引数に講師IDも欲しいところ)
    
    // 簡易対応: updateOrDeleteEvent内で予約データから講師IDを特定してカレンダーIDを取得するロジックへ
    updateOrDeleteEvent(null, instructorEventId, cancelledReservationId, 'instructor', koushiData);
  }
}

/**
 * 内部関数: カレンダーイベントを更新するか削除するか判断して実行
 */
function updateOrDeleteEvent(calId, eventId, cancelledReservationId, type, koushiData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yoyakuSheet = ss.getSheetByName("参加予約");
    const data = yoyakuSheet.getDataRange().getValues();
    
    const activeReservations = [];
    
    const shisetsuSheet = ss.getSheetByName("施設マスタ");
    const houjinSheet = ss.getSheetByName("法人マスタ");
    
    const shisetsuData = sheetToObjects(shisetsuSheet);
    const houjinData = sheetToObjects(houjinSheet);

    let targetTeacherId = null; // 講師カレンダー特定用

    // データ探索
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rId = row[0];
      const status = row[3];
      const eId1 = row[8]; // I列
      const eId2 = row[9]; // J列
      const eId3 = row[10]; // ★K列

      // 該当のイベントIDを含んでいるか？
      const isTargetEvent = (eId1 === eventId || eId2 === eventId || eId3 === eventId);

      // 講師カレンダーID特定のため、キャンセル対象行も含めて講師IDを取得しておく
      if (isTargetEvent && !targetTeacherId) {
        targetTeacherId = row[7];
      }

      // 生きている予約を集める (キャンセル対象以外)
      if (rId !== cancelledReservationId && status === "予約済" && isTargetEvent) {
        const shisetsu = shisetsuData.find(s => String(s.施設ID) === String(row[2]));
        if (shisetsu) {
          activeReservations.push({
            reservationId: rId,
            shisetsu: shisetsu,
            houjin: houjinData.find(h => String(h.法人ID) === String(shisetsu.法人ID)),
            koushiId: row[7],
            timeName: row[6],
            className: row[4]
          });
        }
      }
    }

    // ★講師カレンダーの場合、calIdがnullで渡ってくることがあるので特定する
    if (type === 'instructor' && !calId && targetTeacherId) {
      const koushi = koushiData.find(k => String(k.講師ID) === String(targetTeacherId));
      if (koushi) {
        calId = koushi["カレンダーID"] || koushi["担当者メールアドレス"];
      }
    }

    if (!calId) return; // カレンダー特定できなければ終了

    const cal = CalendarApp.getCalendarById(calId);
    if (!cal) return;
    
    const event = cal.getEventById(eventId);
    if (!event) return;

    if (activeReservations.length === 0) {
      // 予約が0件になったら削除
      event.deleteEvent();
      Logger.log(`Calendar Deleted: ${eventId} (${type})`);
    } else {
      // まだ予約が残っているなら更新 (タイトル・説明文の再生成)
      const isEnglish = (type === 'instructor');
      const content = generateEventContent(activeReservations, koushiData, isEnglish);
      
      event.setTitle(content.title);
      event.setDescription(content.description);
      Logger.log(`Calendar Updated: ${eventId} (${type})`);
    }

  } catch (e) {
    Logger.log(`Update/Delete Error: ${e.toString()}`);
  }
}

/**
 * 共通関数: タイトル・説明文の生成
 * @param {boolean} isEnglish - 英語表記にするかどうか
 */
function generateEventContent(items, koushiData, isEnglish) {
  // 参加している法人名 or 施設名を抽出
  const uniqueNames = [...new Set(items.map(i => {
    if (isEnglish) return getEnglishTitle(i.shisetsu.施設区分, i.shisetsu.施設名); // 施設名も英語化したい場合はロジックが必要だが、今回は区分のみ英語化
    return i.houjin ? i.houjin.法人名 : i.shisetsu.施設名;
  }))];
  
  const koushi = koushiData.find(k => String(k.講師ID) === String(items[0].koushiId));
  const koushiName = koushi ? koushi.講師名 : "未定";
  
  // Meet URL決定
  const firstItem = items[0];
  let meetUrl = "";
  if (firstItem.shisetsu.個別MeetID) {
    meetUrl = "https://meet.google.com/" + firstItem.shisetsu.個別MeetID;
  } else if (firstItem.houjin && firstItem.houjin.法人共通MeetID) {
    meetUrl = "https://meet.google.com/" + firstItem.houjin.法人共通MeetID;
  }
  const meetingCode = meetUrl.replace("https://meet.google.com/", "").trim();

  // --- タイトル生成 ---
  let title = "";
  if (isEnglish) {
    // 講師用: 英語表記 (例: Nursery (Year1, 2) / After School (Lower))
    // ※複数施設が混ざっている場合は列挙
    const titles = items.map(item => getEnglishTitle(item.shisetsu.施設区分, item.className));
    const uniqueTitles = [...new Set(titles)]; // 重複排除
    title = uniqueTitles.join(' / ');
  } else {
    // 法人/マスター用: 日本語表記 (例: 【保育園】クオリスキッズ...)
    const kubun = items[0].shisetsu.施設区分 || 'レッスン';
    const names = uniqueNames.join('・');
    title = `【${kubun}】${names}`;
  }

  // --- 説明文生成 ---
  let description = `■講師: ${koushiName}\n■時間: ${items[0].timeName}\n■会議コード: ${meetingCode}\n■Meet URL: ${meetUrl}\n\n[参加施設]`;
  
  items.forEach(item => {
    description += `\n------------------\n`;
    description += `施設: ${item.shisetsu.施設名}\n`;
    description += `クラス: ${item.className || '-'}`;
  });

  return {
    title: title,
    description: description,
    location: meetUrl
  };
}

/**
 * 英語タイトル変換ロジック
 */
function getEnglishTitle(facilityType, className) {
  // 1. 施設区分
  let prefix = "";
  if (facilityType === "保育園") prefix = "Nursery";
  else if (facilityType === "学童") prefix = "After School";
  else prefix = facilityType;

  // 2. クラス名変換
  if (!className) return prefix;

  let engClass = className;
  engClass = engClass.replace(/低学年/g, "Lower");
  engClass = engClass.replace(/高学年/g, "Upper");
  engClass = engClass.replace(/(\d+)歳児クラス/g, "Year$1");
  engClass = engClass.replace(/(\d+)歳児/g, "Year$1");
  engClass = engClass.replace(/0歳児/g, "Year0"); // 0歳の特例

  return `${prefix} (${engClass})`;
}

// ヘルパー: シートデータをオブジェクト配列に変換
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const result = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    result.push(obj);
  }
  return result;
}