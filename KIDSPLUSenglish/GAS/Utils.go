// AppSheetのUNIQUEID()に近い8文字のIDを生成
function getShortId() {
  return Utilities.getUuid().split('-')[0];
}

// レッスン枠の検索
function findLessonSlot(lessonData, date, koushiID, jikanmei, dIdx, kIdx, jIdx, idIdx) {
  const dStr = date.toLocaleDateString();
  for (let i = 0; i < lessonData.length; i++) {
    const row = lessonData[i];
    if (row[dIdx] && new Date(row[dIdx]).toLocaleDateString() === dStr && row[kIdx] === koushiID && row[jIdx] === jikanmei) {
      return row[idIdx];
    }
  }
  return null;
}

// 行データの検索
function findRowData(sheet, id, searchColIndex) {
  var data = sheet.getDataRange().getValues();
  var headers = data.shift() || [];
  searchColIndex = searchColIndex - 1;

  for (var i = 0; i < data.length; i++) {
    if (data[i][searchColIndex] && data[i][searchColIndex].toString() == id.toString()) {
      var rowData = {};
      for (var j = 0; j < headers.length; j++) {
        rowData[headers[j]] = data[i][j];
      }
      return rowData;
    }
  }
  return null;
}

// 曜日変換 (文字 -> 数値)
function youbiToNumber(youbiStr) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days.indexOf(youbiStr);
}

// 曜日変換 (数値 -> 文字)
function youbiToNumber_reverse(dayIndex) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[dayIndex] || "";
}

// シートデータをオブジェクト配列に変換
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || [];
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}