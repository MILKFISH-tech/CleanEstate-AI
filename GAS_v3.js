/* CleanEstate 會員 + 圖片管理 GAS v3.0 */
/* 相容前端 sheetService.ts，使用繁中「members」分頁 */

var DRIVE_FOLDER_NAME = "CleanEstate_Images";
var CLEANUP_DAYS = 7;
var MEMBERS_SHEET = "members";

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

function getMembersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MEMBERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERS_SHEET);
    sheet.appendRow(["員工ID","密碼雜湊","鹽值","姓名","手機","角色","狀態","建立時間","最後登入時間"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getHeaderMap(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var alias = {
    "員工ID": "id", "ID": "id", "id": "id",
    "姓名": "name", "Name": "name", "name": "name",
    "手機": "phone", "Phone": "phone", "phone": "phone",
    "狀態": "status", "Status": "status", "status": "status",
    "角色": "role", "Role": "role", "role": "role",
    "密碼雜湊": "hash", "鹽值": "salt",
    "建立時間": "created", "最後登入時間": "lastLogin"
  };
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || "").trim();
    if (alias[h]) map[alias[h]] = i;
  }
  map._len = headerRow.length;
  return map;
}

function success(extra) {
  var obj = { status: "success" };
  if (extra) { for (var k in extra) obj[k] = extra[k]; }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var sheet = getMembersSheet();
    var hdr = getHeaderMap(sheet);
    var data = sheet.getDataRange().getValues();
    var users = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var id = String(row[hdr.id] || "").trim();
      if (!id) continue;
      users.push({
        id: id,
        name: String(row[hdr.name] || ""),
        phone: String(row[hdr.phone] || ""),
        status: String(row[hdr.status] || "active"),
        todayUsage: 0
      });
    }
    return success({ data: users });
  } catch (err) {
    return error(err.toString());
  }
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);
    var action = String(payload.action || "");

    if (action === "add_users") {
      var sheet = getMembersSheet();
      var hdr = getHeaderMap(sheet);
      var now = new Date().toISOString();
      var list = payload.users || [];
      for (var u = 0; u < list.length; u++) {
        var newRow = new Array(hdr._len).fill("");
        newRow[hdr.id] = String(list[u].id || "");
        newRow[hdr.name] = String(list[u].name || "");
        newRow[hdr.phone] = String(list[u].phone || "");
        newRow[hdr.status] = "active";
        newRow[hdr.role] = "user";
        if (hdr.created !== undefined) newRow[hdr.created] = now;
        sheet.appendRow(newRow);
      }
      return success();
    }

    if (action === "update_status") {
      var sheet2 = getMembersSheet();
      var hdr2 = getHeaderMap(sheet2);
      var data2 = sheet2.getDataRange().getValues();
      for (var i2 = 1; i2 < data2.length; i2++) {
        if (String(data2[i2][hdr2.id] || "").trim() == payload.id) {
          sheet2.getRange(i2 + 1, hdr2.status + 1).setValue(payload.status);
          break;
        }
      }
      return success();
    }

    if (action === "update_user") {
      var sheet3 = getMembersSheet();
      var hdr3 = getHeaderMap(sheet3);
      var data3 = sheet3.getDataRange().getValues();
      for (var i3 = 1; i3 < data3.length; i3++) {
        if (String(data3[i3][hdr3.id] || "").trim() == payload.id) {
          if (payload.data && payload.data.name) sheet3.getRange(i3 + 1, hdr3.name + 1).setValue(payload.data.name);
          if (payload.data && payload.data.phone) sheet3.getRange(i3 + 1, hdr3.phone + 1).setValue(payload.data.phone);
          break;
        }
      }
      return success();
    }

    if (action === "log_usage") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName("Logs");
      if (!logSheet) { logSheet = ss.insertSheet("Logs"); logSheet.appendRow(["Time","User","Details"]); }
      logSheet.appendRow([new Date(), payload.userId, payload.details]);
      return success();
    }

    if (action === "check_usage") {
      return success({ allowed: true, remaining: 999 });
    }

    if (action === "upload_image_pair") {
      var folder = getOrCreateFolder();
      var auditSheet = getAuditSheet();
      var ts = new Date();
      var recordId = Utilities.getUuid();
      var baseName = (payload.fileName || "image").replace(/\.[^.]+$/, "");

      var origBlob = Utilities.newBlob(Utilities.base64Decode(payload.originalData), payload.originalMime || "image/jpeg", baseName + "_original.jpg");
      var origFile = folder.createFile(origBlob);
      origFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var resultBlob = Utilities.newBlob(Utilities.base64Decode(payload.resultData), payload.resultMime || "image/png", baseName + "_result.png");
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

    if (action === "upload_image") {
      var folder2 = getOrCreateFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.imageData), payload.mimeType || "image/png", payload.fileName || "image.png");
      var file = folder2.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return success({ fileId: file.getId(), fileUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800" });
    }

    if (action === "list_images") {
      var aSheet = getAuditSheet();
      var aData = aSheet.getDataRange().getValues();
      var records = [];
      for (var k = 1; k < aData.length; k++) {
        var r = aData[k];
        records.push({
          id: r[0], timestamp: r[1], userId: r[2], userName: r[3],
          fileName: r[4], spaceType: r[5], mode: r[6],
          originalFileId: r[7], resultFileId: r[8],
          originalUrl: r[9], resultUrl: r[10]
        });
      }
      records.reverse();
      return success({ data: records });
    }

    if (action === "delete_image") {
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

    if (action === "cleanup_images") {
      var days = payload.daysOld || CLEANUP_DAYS;
      var deleted = cleanupOldImages(days);
      return success({ deleted: deleted });
    }

    if (action === "storage_stats") {
      var sFolder = getOrCreateFolder();
      var files = sFolder.getFiles();
      var totalFiles = 0;
      var totalBytes = 0;
      while (files.hasNext()) { var f = files.next(); totalFiles++; totalBytes += f.getSize(); }
      return success({ totalFiles: totalFiles, totalSizeMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100 });
    }

    return error("Unknown action: " + action);

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
  return deleted;
}

function weeklyCleanupTrigger() { cleanupOldImages(CLEANUP_DAYS); }

function setupWeeklyCleanup() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "weeklyCleanupTrigger") ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("weeklyCleanupTrigger").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).create();
}
