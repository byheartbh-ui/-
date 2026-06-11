/**
 * 減肥大賽後台資料庫 - Google Apps Script
 * 
 * 使用教學：
 * 1. 在您的 Google 雲端硬碟建立一個全新的「Google 試算表」。
 * 2. 點擊頂部選單的「擴充功能」 -> 「Apps Script」。
 * 3. 清除原有的程式碼，將此檔案的所有內容複製並貼到編輯器中。
 * 4. 點擊儲存（磁碟圖示 \uD83D\uDCBE），將專案重新命名為「減肥大賽資料庫」。
 * 5. 點擊右上角的「部署」 -> 「新增部署」。
 * 6. 點擊齒輪圖示選取「網頁應用程式 (Web App)」。
 * 7. 設定選項：
 *    - 說明：減肥大賽同步端點
 *    - 強制執行身分：您的 Google 帳戶 (Me)
 *    - 誰有存取權：任何人 (Anyone) <--- 非常重要，否則外部網頁無法連線！
 * 8. 點擊「部署」。系統會要求授權，請完成 Google 授權流程（點選進階 -> 前往減肥大賽-未驗證 -> 允許）。
 * 9. 部署成功後，會得到一串「網頁應用程式 URL」（長度很長，以 https://script.google.com/macros/s/... 開頭）。
 * 10. 將這個 URL 複製下來，貼到本網頁後台管理系統中的「試算表同步設定」中即可！
 */

function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    // 嘗試取得鎖定，避免併發寫入時發生衝突
    lock.waitLock(15000);
    
    var data = getDataFromSheets();
    var resultStr = JSON.stringify(data);
    
    return ContentService.createTextOutput(resultStr)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "無效的 POST 請求數據" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    
    if (action === "save") {
      saveDataToSheets(requestData.contestants, requestData.logs);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "試算表資料更新成功！" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "未知的 action 操作指令" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 獲取或建立分頁，若不存在會自動並初始化欄位標題與格式
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // 設定標題樣式
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#F3F4F6"); // 灰底
    range.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // 自動調整藍寬
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  return sheet;
}

// 從試算表載入本機資料
function getDataFromSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var contestantSheet = getOrCreateSheet("Contestants", ["id", "name", "password", "initialWeight", "initialBodyFat", "initialMuscle"]);
  var logsSheet = getOrCreateSheet("WeightLogs", ["id", "contestantId", "date", "weight", "bodyFat", "muscle", "createdAt"]);
  
  var contestants = [];
  var contestantRange = contestantSheet.getDataRange();
  var contestantRows = contestantRange.getValues();
  for (var i = 1; i < contestantRows.length; i++) {
    if (contestantRows[i][0] !== "") {
      contestants.push({
        id: String(contestantRows[i][0]),
        name: String(contestantRows[i][1]),
        password: String(contestantRows[i][2]),
        initialWeight: Number(contestantRows[i][3]),
        initialBodyFat: Number(contestantRows[i][4]),
        initialMuscle: Number(contestantRows[i][5])
      });
    }
  }
  
  var logs = [];
  var logsRange = logsSheet.getDataRange();
  var logRows = logsRange.getValues();
  for (var j = 1; j < logRows.length; j++) {
    if (logRows[j][0] !== "") {
      logs.push({
        id: String(logRows[j][0]),
        contestantId: String(logRows[j][1]),
        date: String(logRows[j][2]),
        weight: Number(logRows[j][3]),
        bodyFat: Number(logRows[j][4]),
        muscle: Number(logRows[j][5]),
        createdAt: String(logRows[j][6])
      });
    }
  }
  
  return { contestants: contestants, logs: logs };
}

// 將最新的完整參賽者和測量記錄複寫回試算表中同步
function saveDataToSheets(contestants, logs) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var contestantSheet = getOrCreateSheet("Contestants", ["id", "name", "password", "initialWeight", "initialBodyFat", "initialMuscle"]);
  var logsSheet = getOrCreateSheet("WeightLogs", ["id", "contestantId", "date", "weight", "bodyFat", "muscle", "createdAt"]);
  
  // 1. 清理舊資料（保留標題首列）
  if (contestantSheet.getLastRow() > 1) {
    contestantSheet.getRange(2, 1, contestantSheet.getLastRow() - 1, 6).clear();
  }
  if (logsSheet.getLastRow() > 1) {
    logsSheet.getRange(2, 1, logsSheet.getLastRow() - 1, 7).clear();
  }
  
  // 2. 寫入新的參賽者數據
  if (contestants && contestants.length > 0) {
    var contestantValues = contestants.map(function(c) {
      return [
        c.id, 
        c.name, 
        c.password, 
        Number(c.initialWeight), 
        Number(c.initialBodyFat), 
        Number(c.initialMuscle)
      ];
    });
    contestantSheet.getRange(2, 1, contestantValues.length, 6).setValues(contestantValues);
  }
  
  // 3. 寫入新的體重與體組成紀錄
  if (logs && logs.length > 0) {
    var logValues = logs.map(function(l) {
      return [
        l.id, 
        l.contestantId, 
        l.date, 
        Number(l.weight), 
        Number(l.bodyFat), 
        Number(l.muscle), 
        l.createdAt
      ];
    });
    logsSheet.getRange(2, 1, logValues.length, 7).setValues(logValues);
  }
}
