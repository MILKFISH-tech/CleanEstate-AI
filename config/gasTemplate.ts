// ============================================================
// Google Apps Script 範本程式碼
// 從 AdminDashboard 獨立出來，方便維護
// ============================================================

export const GAS_TEMPLATE_CODE = `/* Google Apps Script 後端程式碼 v2.0 - 含 Google Drive 圖片儲存 & 每週自動清理 */
/* 貼上到擴充功能 > Apps Script，部署後執行一次 setupWeeklyCleanup() 啟用自動清理 */

// ============ 設定區 ============
var DRIVE_FOLDER_NAME = "CleanEstate_Images"; // Google Drive 資料夾名稱
var CLEANUP_DAYS = 7; // 自動清理 N 天前的圖片

// ============ 工具函式 ============
function getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function getAuditSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Audit");
  if (!sheet) {
    sheet = ss.insertSheet("Audit");
    sheet.appendRow(["RecordID","Timestamp","UserID","UserName","FileName","SpaceType","Mode","OriginalFileID","ResultFileID","OriginalURL","ResultURL"]);
  }
  return sheet;
}

function success(extra) {
  var obj = {status: 'success'};
  if (extra) { for (var k in extra) obj[k] = extra[k]; }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: msg})).setMimeType(ContentService.MimeType.JSON);
}

// ============ doGet (用戶列表) ============
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return error('Sheet "Users" not found');
  
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    users.push({ id: row[0], name: row[1], phone: String(row[2]), status: row[3], todayUsage: Number(row[4] || 0) });
  }
  return ContentService.createTextOutput(JSON.stringify({status: 'success', data: users})).setMimeType(ContentService.MimeType.JSON);
}

// ============ doPost (所有操作) ============
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Users");
    
    if (!sheet) {
      sheet = ss.insertSheet("Users");
      sheet.appendRow(["ID", "Name", "Phone", "Status", "Usage"]);
    }
    
    // --- 用戶管理 ---
    if (payload.action === 'add_users') {
      payload.users.forEach(function(u) { sheet.appendRow([u.id, u.name, u.phone, 'active', 0]); });
      return success();
    }
    
    if (payload.action === 'update_status') {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == payload.id) { sheet.getRange(i + 1, 4).setValue(payload.status); break; }
      }
      return success();
    }
    
    if (payload.action === 'update_user') {
      var data2 = sheet.getDataRange().getValues();
      for (var j = 1; j < data2.length; j++) {
        if (data2[j][0] == payload.id) {
          sheet.getRange(j + 1, 2).setValue(payload.data.name);
          sheet.getRange(j + 1, 3).setValue(payload.data.phone);
          break;
        }
      }
      return success();
    }

    if (payload.action === 'log_usage') {
      var logSheet = ss.getSheetByName("Logs");
      if (!logSheet) { logSheet = ss.insertSheet("Logs"); logSheet.appendRow(["Time", "User", "Details"]); }
      logSheet.appendRow([new Date(), payload.userId, payload.details]);
      return success();
    }
    
    // --- 圖片上傳 (原圖+結果圖一起上傳) ---
    if (payload.action === 'upload_image_pair') {
      var folder = getOrCreateFolder();
      var auditSheet = getAuditSheet();
      var ts = new Date();
      var recordId = Utilities.getUuid();
      var baseName = (payload.fileName || "image").replace(/\\\\.[^.]+$/, "");
      
      var origBlob = Utilities.newBlob(Utilities.base64Decode(payload.originalData), payload.originalMime || 'image/jpeg', baseName + "_original.jpg");
      var origFile = folder.createFile(origBlob);
      origFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var resultBlob = Utilities.newBlob(Utilities.base64Decode(payload.resultData), payload.resultMime || 'image/png', baseName + "_result.png");
      var resultFile = folder.createFile(resultBlob);
      resultFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      auditSheet.appendRow([
        recordId, ts, payload.userId, payload.userName, payload.fileName,
        payload.spaceType, payload.mode,
        origFile.getId(), resultFile.getId(),
        "https://drive.google.com/thumbnail?id=" + origFile.getId() + "&sz=w800",
        "https://drive.google.com/thumbnail?id=" + resultFile.getId() + "&sz=w800"
      ]);
      
      return success({
        recordId: recordId,
        originalUrl: "https://drive.google.com/thumbnail?id=" + origFile.getId() + "&sz=w800",
        resultUrl: "https://drive.google.com/thumbnail?id=" + resultFile.getId() + "&sz=w800"
      });
    }
    
    if (payload.action === 'upload_image') {
      var folder2 = getOrCreateFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.imageData), payload.mimeType || 'image/png', payload.fileName || "image.png");
      var file = folder2.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return success({ fileId: file.getId(), fileUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800" });
    }
    
    if (payload.action === 'list_images') {
      var aSheet = getAuditSheet();
      var aData = aSheet.getDataRange().getValues();
      var records = [];
      for (var k = 1; k < aData.length; k++) {
        var r = aData[k];
        records.push({ id: r[0], timestamp: r[1], userId: r[2], userName: r[3], fileName: r[4], spaceType: r[5], mode: r[6], originalFileId: r[7], resultFileId: r[8], originalUrl: r[9], resultUrl: r[10] });
      }
      records.reverse();
      return success({ data: records });
    }
    
    if (payload.action === 'delete_image') {
      var dSheet = getAuditSheet();
      var dData = dSheet.getDataRange().getValues();
      for (var m = 1; m < dData.length; m++) {
        if (dData[m][0] == payload.recordId) {
          try { DriveApp.getFileById(dData[m][7]).setTrashed(true); } catch(e1) {}
          try { DriveApp.getFileById(dData[m][8]).setTrashed(true); } catch(e2) {}
          dSheet.deleteRow(m + 1);
          break;
        }
      }
      return success();
    }
    
    if (payload.action === 'cleanup_images') {
      var days = payload.daysOld || CLEANUP_DAYS;
      var deleted = cleanupOldImages(days);
      return success({ deleted: deleted });
    }
    
    if (payload.action === 'storage_stats') {
      var sFolder = getOrCreateFolder();
      var files = sFolder.getFiles();
      var totalFiles = 0;
      var totalBytes = 0;
      while (files.hasNext()) { var f = files.next(); totalFiles++; totalBytes += f.getSize(); }
      return success({ totalFiles: totalFiles, totalSizeMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100 });
    }
    
    return error("Unknown action: " + payload.action);
  } catch (err) {
    return error(err.toString());
  }
}

function cleanupOldImages(days) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days || CLEANUP_DAYS));
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Audit");
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  var deleted = 0;
  for (var i = 1; i < data.length; i++) {
    var ts = new Date(data[i][1]);
    if (ts < cutoff) {
      try { DriveApp.getFileById(data[i][7]).setTrashed(true); } catch(e1) {}
      try { DriveApp.getFileById(data[i][8]).setTrashed(true); } catch(e2) {}
      rowsToDelete.push(i + 1);
      deleted++;
    }
  }
  for (var j = rowsToDelete.length - 1; j >= 0; j--) { sheet.deleteRow(rowsToDelete[j]); }
  Logger.log("Cleanup complete: " + deleted + " records removed");
  return deleted;
}

function weeklyCleanupTrigger() { cleanupOldImages(CLEANUP_DAYS); }

function setupWeeklyCleanup() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'weeklyCleanupTrigger') { ScriptApp.deleteTrigger(triggers[i]); }
  }
  ScriptApp.newTrigger('weeklyCleanupTrigger').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).create();
  Logger.log("Weekly cleanup trigger registered: Every Monday at 3 AM");
}`;
