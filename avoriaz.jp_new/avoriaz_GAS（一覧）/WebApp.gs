// ==========================================================
// WebApp.gs - 予約一覧 & 本日リスト用 (Ver.2.1)
// ==========================================================

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('宿泊管理アプリ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDataForMatrix() {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  
  // ★設定: 宿泊カレンダーの表示期間 (デフォルト)
  const PAST_DAYS = 10;  // 過去10日
  const FUTURE_DAYS = 90; // 未来90日

  // 1. 部屋マスタ
  const roomSheet = ss.getSheetByName(SHEET_NAME_INVENTORY);
  const roomData = roomSheet.getDataRange().getValues();
  const rooms = [];
  for(let i=1; i<roomData.length; i++) {
    if(roomData[i][0]) {
      rooms.push({ id: roomData[i][0], name: roomData[i][1] });
    }
  }

  // 2. 顧客マスタ
  const custSheet = ss.getSheetByName(SHEET_NAME_CUSTOMER);
  const custData = custSheet.getDataRange().getValues();
  const custHeaders = custData[0];
  const cIdIdx = custHeaders.indexOf('CustomerID');
  const lNameIdx = custHeaders.indexOf('姓');
  const fNameIdx = custHeaders.indexOf('名');
  const cGroupIdx = custHeaders.indexOf('団体名');

  const custMap = {};
  for(let i=1; i<custData.length; i++) {
    const cid = custData[i][cIdIdx];
    const lName = custData[i][lNameIdx] || '';
    const fName = custData[i][fNameIdx] || '';
    const group = (cGroupIdx !== -1) ? (custData[i][cGroupIdx] || '') : '';
    
    let fullName = (lName + ' ' + fName).trim();
    if (!fullName) fullName = 'ゲスト';

    custMap[cid] = {
      name: fullName,
      group: group
    };
  }

  // 問い合わせデータ
  const inqSheet = ss.getSheetByName('14_Inquiries');
  const inqData = inqSheet.getDataRange().getValues();
  const inqHeaders = inqData[0];
  const inqResIdIdx = inqHeaders.indexOf('予約ID (Ref)');
  const inqMsgIdx = inqHeaders.indexOf('メッセージ');
  
  const inqMap = {};
  if (inqResIdIdx !== -1 && inqMsgIdx !== -1) {
    for(let i=1; i<inqData.length; i++) {
      const rId = inqData[i][inqResIdIdx];
      const msg = inqData[i][inqMsgIdx];
      if (rId && msg) {
        if (!inqMap[rId]) inqMap[rId] = [];
        inqMap[rId].push(msg);
      }
    }
  }

  // 3. 予約データ
  const resSheet = ss.getSheetByName(SHEET_NAME_RESERVATION);
  const resData = resSheet.getDataRange().getValues();
  const resHeaders = resData[0];
  
  const idx = {
    status: resHeaders.indexOf('予約ステータス'),
    checkIn: resHeaders.indexOf('チェックイン日'),
    checkOut: resHeaders.indexOf('チェックアウト日'),
    room: resHeaders.indexOf('割当施設 (Ref)'),
    custId: resHeaders.indexOf('顧客ID (Ref)'),
    adult: resHeaders.indexOf('大人人数'),
    child: resHeaders.indexOf('子ども人数'),
    toddlerM: resHeaders.indexOf('幼児_食事あり'),
    toddlerN: resHeaders.indexOf('幼児_食事なし'),
    noDinner: resHeaders.indexOf('夕食不要'),
    memo: resHeaders.indexOf('メモ'),
    route: resHeaders.indexOf('予約経路'),
    checkInTime: resHeaders.indexOf('チェックイン時刻'),
    checkOutTime: resHeaders.indexOf('チェックアウト時刻'),
    bookingDetail: resHeaders.indexOf('予約詳細'),
    plan: resHeaders.indexOf('プラン'),
    resIdStr: resHeaders.indexOf('予約ID')
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - PAST_DAYS);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + FUTURE_DAYS);

  const reservations = [];

  for(let i=1; i<resData.length; i++) {
    const row = resData[i];
    const status = row[idx.status];
    
    if (status !== '確定' && status !== 'プール') continue;
    
    const checkIn = new Date(row[idx.checkIn]);
    const checkOut = new Date(row[idx.checkOut]);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) continue;

    // フィルタリング: 表示期間(最大範囲)に含まれるか
    if (checkOut > startDate && checkIn < endDate) {
      const cid = row[idx.custId];
      const ad = Number(row[idx.adult]) || 0;
      const ch = Number(row[idx.child]) || 0;
      const tm = Number(row[idx.toddlerM]) || 0;
      const tn = Number(row[idx.toddlerN]) || 0;
      const pax = ad + ch + tm + tn;

      let dinnerSkip = false;
      if (idx.noDinner !== -1) {
        const val = row[idx.noDinner];
        if (val === true || val === 'TRUE' || val === 'Yes') dinnerSkip = true;
      }

      const custObj = custMap[cid] || { name: 'ゲスト', group: '' };
      const agent = (idx.route !== -1) ? (row[idx.route] || '') : '';

      const formatTime = (val) => {
        if (!val) return '';
        if (val instanceof Date) {
          return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
        }
        let s = String(val);
        let match = s.match(/(\d{1,2}):(\d{2})/);
        return match ? (match[1].padStart(2, '0') + ':' + match[2]) : '';
      };

      const cTimeStr = (idx.checkInTime !== -1) ? formatTime(row[idx.checkInTime]) : '';
      const cOutTimeStr = (idx.checkOutTime !== -1) ? formatTime(row[idx.checkOutTime]) : '';

      const bDetail = (idx.bookingDetail !== -1) ? (row[idx.bookingDetail] || '') : '';
      const planName = (idx.plan !== -1) ? (row[idx.plan] || '') : '';
      
      const currentResId = row[idx.resIdStr];
      let inquiryMsg = '';
      if (currentResId && inqMap[currentResId]) {
        inquiryMsg = inqMap[currentResId].join('\n\n---\n\n'); 
      }

      reservations.push({
        id: (currentResId || i),
        status: status,
        checkIn: Utilities.formatDate(checkIn, Session.getScriptTimeZone(), 'yyyy/MM/dd'),
        checkOut: Utilities.formatDate(checkOut, Session.getScriptTimeZone(), 'yyyy/MM/dd'),
        roomId: row[idx.room],
        custName: custObj.name,
        group: custObj.group, 
        agent: agent,
        pax: pax,
        adults: ad,
        child: ch,
        toddlerM: tm,
        toddlerN: tn,
        dinnerSkip: dinnerSkip,
        memo: (idx.memo !== -1) ? row[idx.memo] : '',
        checkInTime: cTimeStr,
        checkOutTime: cOutTimeStr,
        bookingDetail: bDetail,
        plan: planName,
        inquiries: inquiryMsg
      });
    }
  }

  return {
    rooms: rooms,
    reservations: reservations,
    range: { past: PAST_DAYS, future: FUTURE_DAYS } // この値をフロントへ渡す
  };
}