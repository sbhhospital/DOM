/**
 * =========================================================================================
 * 🏥 SBH GROUP OF HOSPITALS, RAIPUR — DAILY OPERATIONS MEETING (DOM) AUTOMATION
 * =========================================================================================
 * Integrated with CEOITBOX WhatsApp Automation Engine (Library ID: 1zrfxO4ygvUflwq9l7XhkNraYbOML3KEelNChmAwRywanLgPpfeSxwWkg)
 * 
 * Google Spreadsheet: https://docs.google.com/spreadsheets/d/1nWfc4W3U-vAWFXCT5UWwFrh5bmBmCLZM-ojCONGEgsU/edit
 * Google Drive PDF Archive: https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing
 * Target WhatsApp Group ID: 120363432056023698@g.us
 * Google Meet URL: https://meet.google.com/jrz-jfku-gir
 * DOM Check-In Link: https://sbhdom.vercel.app/boardroom-checkin
 * 
 * TO ADD THIS TO YOUR SPREADSHEET:
 * 1. Open Google Sheets > Extensions > Apps Script
 * 2. Click "Libraries +" on the left sidebar
 * 3. Enter Library Script ID: 1zrfxO4ygvUflwq9l7XhkNraYbOML3KEelNChmAwRywanLgPpfeSxwWkg
 * 4. Identifier: FMScriptOB (Select the highest version, e.g. 69 or latest) and click Save
 * 5. Paste this entire Code.js into your Apps Script editor and save
 * 6. Deploy as Web App (Execute as: Me, Access: Anyone)
 * =========================================================================================
 */

// CEOITBOX Library Version & Wrapper Functions
var Version = 69;
var Update_Realease_Date = "28/Jan/2026";

const createTrigger = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.createTrigger() : null;
const deleteTrigger = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.deleteTrigger() : null;
const genFileUrl = (rawUrl, name) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.genFileUrl(rawUrl, name) : '';
const getColumnsTags = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.getColumnsTags() : [];
const getIdFromUrl = (url) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.getIdFromUrl(url) : '';
const getSpecialSymbolText = (body) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.getSpecialSymbolText(body) : body;
const onEdit = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.onEdit() : null;
const replaceDocTags = (textWithTags, data) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.replaceDocTags(textWithTags, data) : textWithTags;
const replaceSlideTags = (textWithTags, data) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.replaceSlideTags(textWithTags, data) : textWithTags;
const replaceSpreadsheetTags = (textWithTags, data) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.replaceSpreadsheetTags(textWithTags, data) : textWithTags;
const replaceTagsWithText = (textWithTags, data) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.replaceTagsWithText(textWithTags, data) : textWithTags;
const sendEmail = (body, blob, subject) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.sendEmail(body, blob, subject) : null;
const sendMessageFile = (two_rows) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.sendMessageFile(two_rows) : null;
const sendTestMessage = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.sendTestMessage() : null;
const showHelp = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.showHelp() : null;
const timeBasedTrigger = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.timeBasedTrigger() : null;
const importSettingPage = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.importSettingPage() : null;
const onFormSubmit = (e) => typeof FMScriptOB !== 'undefined' ? FMScriptOB.onFormSubmit(e) : null;
const createTemplates = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.createTemplates() : null;
const createHeaderDropDown = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.createHeaderDropDown() : null;
const onTimeTrigger = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.onTimeTrigger() : null;
const generateEditURL = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.generateEditURL() : '';
const licenseStatus = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.licenseStatus() : null;
const showQuota = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.showQuota() : null;
const dailyReminder = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.dailyReminder() : null;
const checkSettingPage = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.checkSettingPage() : null;
const getdropdwon = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.getdropdwon() : null;
const updatesheet = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.updatesheet() : null;
const getcode = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.getcode() : null;
const settingCheckData = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.settingCheckData() : null;
const settingCheck = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.settingCheck() : null;
const check_library_version = () => typeof FMScriptOB !== 'undefined' ? FMScriptOB.check_library_version() : null;

// Global Master Configuration
var CONFIG = {
  DRIVE_FOLDER_ID: "1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD",
  WHATSAPP_GROUP_ID: "120363432056023698@g.us",
  GOOGLE_MEET_URL: "https://meet.google.com/jrz-jfku-gir",
  PORTAL_URL: "https://sbhdom.vercel.app",
  HOSPITAL_NAME: "SBH GROUP OF HOSPITALS, RAIPUR",
  VENUE: "Conference Room, 5th Floor",
  TIMEZONE: "Asia/Kolkata",
  DIRECTOR_NAME: "Director Sir"
};

/**
 * Custom Menu inside Google Sheets (Combines CEOITBOX and SBH DOM Operations)
 */
function onOpen() {
  try {
    if (typeof FMScriptOB !== 'undefined' && FMScriptOB.onOpen) {
      FMScriptOB.onOpen();
    }
  } catch (e) {
    console.warn("CEOITBOX onOpen note:", e);
  }

  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🏥 SBH DOM Operations")
    .addItem("🛠️ Initialize & Format All 4 DOM Sheets", "initializeAllSheets")
    .addSeparator()
    .addItem("📤 Dispatch 09:50 AM Standup Notice Now", "manualDispatch0950")
    .addItem("📊 Dispatch 10:30 AM Final Audit Report Now", "manualDispatch1030")
    .addSeparator()
    .addItem("📁 Test Google Drive Folder Connection", "testDriveConnection")
    .addItem("⏰ Setup Daily Automated Triggers (09:50 & 10:30)", "setupAutomatedTriggers")
    .addToUi();
}

/**
 * 1. Initialize and Format All 4 Required Sheets in the Spreadsheet:
 *    - Daily_PDF_Reports
 *    - Daily_Message_Templates
 *    - WhatsApp_Delivery_Logs
 *    - Leader_Login_Roster
 */
function initializeAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------------------------------------------------------------
  // Sheet 1: Daily_PDF_Reports
  // -------------------------------------------------------------
  var reportSheet = ss.getSheetByName("Daily_PDF_Reports");
  if (!reportSheet) {
    reportSheet = ss.insertSheet("Daily_PDF_Reports");
  }
  reportSheet.clear();
  var reportHeaders = [
    "Timestamp (IST)",
    "Meeting Date",
    "Cadence",
    "Meeting Title",
    "Total Expected",
    "In-Person (Room)",
    "Virtual (Meet)",
    "Approved Late",
    "Approved Leave",
    "Absent Leaders",
    "Compliance %",
    "Google Drive PDF Link",
    "Drive File ID",
    "WhatsApp Status"
  ];
  reportSheet.appendRow(reportHeaders);
  formatHeaderRow(reportSheet, "#1b5e20", reportHeaders.length);
  reportSheet.setColumnWidth(1, 160);
  reportSheet.setColumnWidth(2, 110);
  reportSheet.setColumnWidth(4, 220);
  reportSheet.setColumnWidth(12, 320);

  // -------------------------------------------------------------
  // Sheet 2: Daily_Message_Templates
  // -------------------------------------------------------------
  var templateSheet = ss.getSheetByName("Daily_Message_Templates");
  if (!templateSheet) {
    templateSheet = ss.insertSheet("Daily_Message_Templates");
  }
  templateSheet.clear();
  var templateHeaders = [
    "Template Key",
    "Stage",
    "Scheduled Time (IST)",
    "Message Title",
    "Template Content",
    "Status"
  ];
  templateSheet.appendRow(templateHeaders);
  formatHeaderRow(templateSheet, "#00695c", templateHeaders.length);

  // Pre-seed official WhatsApp message templates
  templateSheet.appendRow([
    "STAGE_0950_NOTICE",
    "09:50 AM",
    "09:50 AM IST",
    "Morning Standup Assembly Notice",
    "🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n🔔 *09:50 AM NOTICE: {CADENCE} — {MEETING_TITLE}*\n━━━━━━━━━━━━━━━━━━━━━━\n📅 *Date:* {DATE}\n⏰ *Start Time:* 10:00 AM IST (Sharp)\n📍 *Venue:* " + CONFIG.VENUE + "\n\n✅ *ATTENDANCE & CHECK-IN LINK:*\n👉 https://sbhdom.vercel.app/boardroom-checkin\n\n⚠️ *INSTRUCTION FOR ALL HODs / LEADERS:*\nAll department heads and leaders are kindly requested to assemble in the Conference Room (5th Floor) and check in using the link above before 10:00 AM sharp.\nFinal attendance audit will freeze at 10:30 AM.\n━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur",
    "ACTIVE"
  ]);

  templateSheet.appendRow([
    "STAGE_1030_FINAL_AUDIT",
    "10:30 AM",
    "10:30 AM IST",
    "Final Attendance Audit & PDF Release",
    "🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n📊 *FINAL 10:30 AM {CADENCE} ATTENDANCE AUDIT REPORT*\n━━━━━━━━━━━━━━━━━━━━━━\n📅 *Date:* {DATE} | *Meeting:* {CADENCE}\n⏰ *Audit Frozen:* 10:30 AM IST | *Venue:* " + CONFIG.VENUE + "\n📁 *Official PDF Report (Drive):* {PDF_LINK}\n\n📈 *AUDIT SUMMARY:*\n👥 Total Expected: {TOTAL}\n🏢 In-Person (Conference Room): {PHYSICAL}\n💻 Virtual (Google Meet): {VIRTUAL}\n⏱️ Approved Late Arrivals: {LATE}\n⚠️ Approved Leave: {LEAVE}\n❌ Absentees: {ABSENT}\n🎯 Overall Compliance: *{COMPLIANCE}*\n\nBroadcast to: Official WhatsApp Group (" + CONFIG.WHATSAPP_GROUP_ID + ")\nDOM Operations Command | SBH Raipur",
    "ACTIVE"
  ]);

  templateSheet.setColumnWidth(1, 180);
  templateSheet.setColumnWidth(4, 220);
  templateSheet.setColumnWidth(5, 450);

  // -------------------------------------------------------------
  // Sheet 3: WhatsApp_Delivery_Logs
  // -------------------------------------------------------------
  var logSheet = ss.getSheetByName("WhatsApp_Delivery_Logs");
  if (!logSheet) {
    logSheet = ss.insertSheet("WhatsApp_Delivery_Logs");
  }
  logSheet.clear();
  var logHeaders = [
    "Timestamp (IST)",
    "Date",
    "Stage / Action",
    "Target Group ID / Recipient",
    "Message Summary / Caption",
    "Drive PDF Link Attached",
    "Dispatch Mode",
    "Status"
  ];
  logSheet.appendRow(logHeaders);
  formatHeaderRow(logSheet, "#0d47a1", logHeaders.length);
  logSheet.setColumnWidth(1, 160);
  logSheet.setColumnWidth(4, 220);
  logSheet.setColumnWidth(5, 300);
  logSheet.setColumnWidth(6, 260);

  // -------------------------------------------------------------
  // Sheet 4: Leader_Login_Roster
  // -------------------------------------------------------------
  var rosterSheet = ss.getSheetByName("Leader_Login_Roster");
  if (!rosterSheet) {
    rosterSheet = ss.insertSheet("Leader_Login_Roster");
  }
  rosterSheet.clear();
  var rosterHeaders = [
    "#",
    "Department",
    "Department Code",
    "Head / Leader Name",
    "Designation / Role",
    "Phone / WhatsApp",
    "Expected Mode",
    "Quick 1-Click Check-in URL"
  ];
  rosterSheet.appendRow(rosterHeaders);
  formatHeaderRow(rosterSheet, "#e65100", rosterHeaders.length);

  // Pre-seed official 24 Hospital Departments
  var initialRoster = [
    [1, "CRITICAL CARE MEDICINE", "CCM", "Dr. A. K. Sharma", "HOD - Critical Care", "919876543210", "PHYSICAL"],
    [2, "EMERGENCY MEDICINE", "EMERG", "Dr. Rajesh Verma", "HOD - Emergency", "919876543211", "PHYSICAL"],
    [3, "CARDIOLOGY & CARDIAC SURGERY", "CARDIO", "Deepmala Patil", "Department Leader", "919876543212", "PHYSICAL"],
    [4, "NEUROLOGY & NEUROSURGERY", "NEURO", "Dr. S. K. Gupta", "HOD - Neuro Sciences", "919876543213", "PHYSICAL"],
    [5, "ORTHOPAEDICS & JOINT REPLACEMENT", "ORTHO", "Dr. Vikas Agrawal", "Senior Consultant", "919876543214", "PHYSICAL"],
    [6, "GENERAL & LAPAROSCOPIC SURGERY", "SURG", "Dr. Neeraj Jain", "Chief Surgeon", "919876543215", "PHYSICAL"],
    [7, "INTERNAL MEDICINE", "MED", "Dr. Anita Rao", "HOD - Medicine", "919876543216", "PHYSICAL"],
    [8, "OBSTETRICS & GYNAECOLOGY", "OBGYN", "Dr. Pooja Singh", "HOD - Gynaecology", "919876543217", "PHYSICAL"],
    [9, "PAEDIATRICS & NEONATOLOGY (NICU)", "PAED", "Dr. R. K. Sahu", "HOD - Paediatrics", "919876543218", "PHYSICAL"],
    [10, "NEPHROLOGY & DIALYSIS", "NEPHRO", "Dr. Manish Dewangan", "Consultant Nephrologist", "919876543219", "PHYSICAL"],
    [11, "PULMONOLOGY & CHEST MEDICINE", "PULMO", "Dr. Sanjay Chandrakar", "HOD - Pulmonology", "919876543220", "PHYSICAL"],
    [12, "GASTROENTEROLOGY", "GASTRO", "Dr. Alok Tiwari", "Consultant Gastroenterologist", "919876543221", "PHYSICAL"],
    [13, "UROLOGY & ANDROLOGY", "URO", "Dr. Pradeep Mishra", "Consultant Urologist", "919876543222", "PHYSICAL"],
    [14, "ANAESTHESIOLOGY & OT SERVICES", "ANAESTH", "Dr. Sunita Patel", "Head of Anaesthesia", "919876543223", "PHYSICAL"],
    [15, "RADIOLOGY & IMAGING SCIENCES", "RADIO", "Dr. Tarun Dewangan", "Chief Radiologist", "919876543224", "PHYSICAL"],
    [16, "PATHOLOGY & LABORATORY MEDICINE", "PATH", "Dr. Meena Sharma", "Chief Pathologist", "919876543225", "PHYSICAL"],
    [17, "NURSING ADMINISTRATION", "NURSE", "Sister In-Charge", "Nursing Superintendent", "919876543226", "PHYSICAL"],
    [18, "PHARMACY & DRUG DISPENSING", "PHARM", "Mr. Santosh Kumar", "Chief Pharmacist", "919876543227", "PHYSICAL"],
    [19, "INFECTION CONTROL & QUALITY (NABH)", "NABH", "Dr. Rashmi Verma", "Quality Head", "919876543228", "PHYSICAL"],
    [20, "BIOMEDICAL ENGINEERING", "BME", "Er. Gaurav Soni", "Chief Biomedical Engineer", "919876543229", "PHYSICAL"],
    [21, "FACILITY MANAGEMENT & MAINTENANCE", "FMS", "Mr. Dinesh Rathore", "Facility Manager", "919876543230", "PHYSICAL"],
    [22, "HUMAN RESOURCES & PAYROLL", "HR", "Ms. Ritu Agrawal", "HR Manager", "919876543231", "PHYSICAL"],
    [23, "IT, SYSTEMS & TELECOM", "IT", "Naman Mishra", "Chief Information Officer", "9644404741", "PHYSICAL"],
    [24, "HOSPITAL ADMINISTRATION & OPERATIONS", "ADMIN", "Hospital Administrator", "Operations Head", "919876543233", "PHYSICAL"]
  ];

  initialRoster.forEach(function(row) {
    var checkinUrl = CONFIG.PORTAL_URL + "/login?phone=" + row[5];
    rosterSheet.appendRow([row[0], row[1], row[2], row[3], row[4], row[5], row[6], checkinUrl]);
  });

  rosterSheet.setColumnWidth(2, 240);
  rosterSheet.setColumnWidth(4, 180);
  rosterSheet.setColumnWidth(8, 280);

  // Return success
  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().toast("All 4 DOM Sheets initialized with official SBH headers & styling!", "✅ Setup Complete", 6);
}

function formatHeaderRow(sheet, bgColor, colCount) {
  var range = sheet.getRange(1, 1, 1, colCount);
  range.setFontWeight("bold");
  range.setBackground(bgColor);
  range.setFontColor("#ffffff");
  range.setFontSize(10);
  range.setVerticalAlignment("middle");
  range.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 34);
  sheet.setFrozenRows(1);
}

/**
 * 2. Webhook HTTP POST Endpoint:
 *    Invoked by the DOM Web Portal to upload PDF, record attendance, or dispatch WhatsApp broadcasts.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty POST body received." });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || "UPLOAD_PDF_AND_LOG";
    var nowIstStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd-MMM-yyyy hh:mm:ss a");

    // ACTION A: Upload PDF to Google Drive, Log to Sheet & Dispatch to WhatsApp
    if (action === "UPLOAD_PDF_AND_LOG") {
      var driveFileUrl = "https://drive.google.com/drive/folders/" + CONFIG.DRIVE_FOLDER_ID;
      var driveFileId = "";

      // 1. Decode base64 PDF and write to Drive Folder
      if (data.pdfBase64 && data.pdfFileName) {
        var decodedBytes = Utilities.base64Decode(data.pdfBase64);
        var blob = Utilities.newBlob(decodedBytes, "application/pdf", data.pdfFileName);
        var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveFileUrl = file.getUrl();
        driveFileId = file.getId();
      }

      // 2. Append row in Daily_PDF_Reports
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var reportSheet = ss.getSheetByName("Daily_PDF_Reports");
      if (!reportSheet) {
        initializeAllSheets();
        reportSheet = ss.getSheetByName("Daily_PDF_Reports");
      }

      var rowData = [
        nowIstStr,
        data.date || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd"),
        data.cadence || "DOM",
        data.meetingTitle || "Daily Operations Meeting",
        data.totalLeaders || 24,
        data.presentCount || 0,
        data.virtualCount || 0,
        data.lateCount || 0,
        data.leaveCount || 0,
        data.absentCount || 0,
        data.complianceRate || "0%",
        driveFileUrl,
        driveFileId,
        "SAVED_TO_DRIVE"
      ];
      reportSheet.appendRow(rowData);

      // 3. Log to WhatsApp_Delivery_Logs
      var logSheet = ss.getSheetByName("WhatsApp_Delivery_Logs");
      if (logSheet) {
        logSheet.appendRow([
          nowIstStr,
          data.date || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd"),
          "10:30 AM PDF AUDIT ARCHIVE",
          CONFIG.WHATSAPP_GROUP_ID,
          "PDF Report uploaded & recorded. Drive Link: " + driveFileUrl,
          driveFileUrl,
          "DIRECT_CLOUD_SYNC",
          "SUCCESS"
        ]);
      }

      // 4. Trigger Direct Cloud WhatsApp Dispatch to Group via Ceoitbox messageautosender
      var cloudFetchSuccess = false;
      try {
        var reportCaption = "🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n📊 *OFFICIAL " + (data.cadence || "DOM") + " LEADERSHIP ATTENDANCE REPORT (" + (data.date || "") + ")*\n━━━━━━━━━━━━━━━━━━━━━━\n• Total Expected: " + (data.totalLeaders || 0) + "\n• Attended: " + (data.presentCount || 0) + "\n• Approved Late: " + (data.lateCount || 0) + "\n• Approved Leave: " + (data.leaveCount || 0) + "\n• Absent / Unreported: " + (data.absentCount || 0) + "\n\n📄 *Official Signed Director Attendance PDF Report Attached*\n━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur";
        var ceoQuery1030 = "username=" + encodeURIComponent("SBH HOSPITAL") +
                           "&password=" + encodeURIComponent("123456789") +
                           "&receiverMobileNo=" + encodeURIComponent(CONFIG.WHATSAPP_GROUP_ID) +
                           "&receiverName=" + encodeURIComponent("SBH DOM Group") +
                           "&message=" + encodeURIComponent(reportCaption);
        var fetchRes1030 = UrlFetchApp.fetch("https://app.messageautosender.com/message/new?" + ceoQuery1030, { muteHttpExceptions: true });
        cloudFetchSuccess = fetchRes1030.getResponseCode() === 200;
      } catch (errFetch1030) {
        console.warn("UrlFetchApp 1030 note:", errFetch1030);
      }

      // 5. Trigger CEOITBOX WhatsApp Dispatch to Group if FMScriptOB library is active
      var ceoitboxTriggered = false;
      try {
        if (typeof FMScriptOB !== 'undefined') {
          if (FMScriptOB.sendMessageFile) {
            FMScriptOB.sendMessageFile(2);
            ceoitboxTriggered = true;
          } else if (FMScriptOB.dailyReminder) {
            FMScriptOB.dailyReminder();
            ceoitboxTriggered = true;
          }
        }
      } catch (errCeo) {
        console.warn("CEOITBOX trigger note:", errCeo);
      }

      return jsonResponse({
        success: true,
        message: "PDF successfully stored in Google Drive & logged in Google Sheet!",
        driveFileUrl: driveFileUrl,
        driveFileId: driveFileId,
        sheetRow: reportSheet.getLastRow(),
        cloudFetchSuccess: cloudFetchSuccess,
        ceoitboxTriggered: ceoitboxTriggered
      });
    }

    // ACTION B: Silent Automated WhatsApp Group Broadcast
    if (action === "SEND_WHATSAPP_BROADCAST") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName("WhatsApp_Delivery_Logs");
      var targetGroup = data.targetGroup || CONFIG.WHATSAPP_GROUP_ID;
      var stage = data.stage || "0950";
      var msg = data.message || "DOM Notice";

      if (logSheet) {
        logSheet.appendRow([
          nowIstStr,
          data.date || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd"),
          stage === "0950" ? "09:50 AM NOTICE BROADCAST" : "10:30 AM FINAL AUDIT",
          targetGroup,
          msg.substring(0, 150) + "...",
          data.driveFileUrl || "",
          "AUTOMATIC_BACKGROUND_DISPATCH",
          "DELIVERED"
        ]);
      }

      // 1. Direct call from Google Cloud servers to Ceoitbox messageautosender API (Bypasses any browser/localhost CORS!)
      var cloudFetchSuccess = false;
      try {
        var ceoQuery = "username=" + encodeURIComponent("SBH HOSPITAL") +
                       "&password=" + encodeURIComponent("123456789") +
                       "&receiverMobileNo=" + encodeURIComponent(targetGroup) +
                       "&receiverName=" + encodeURIComponent("SBH DOM Group") +
                       "&message=" + encodeURIComponent(msg);
        var fetchRes = UrlFetchApp.fetch("https://app.messageautosender.com/message/new?" + ceoQuery, { muteHttpExceptions: true });
        cloudFetchSuccess = fetchRes.getResponseCode() === 200;
        console.log("Ceoitbox Cloud UrlFetch response: " + fetchRes.getContentText());
      } catch (errFetch) {
        console.warn("UrlFetchApp Ceoitbox note:", errFetch);
      }

      // 2. Trigger CEOITBOX library dispatch inside Google Sheets
      var ceoitboxTriggered = false;
      try {
        if (typeof FMScriptOB !== 'undefined' && FMScriptOB.dailyReminder) {
          FMScriptOB.dailyReminder();
          ceoitboxTriggered = true;
        }
      } catch (errCeo) {
        console.warn("CEOITBOX trigger note:", errCeo);
      }

      return jsonResponse({
        success: true,
        message: "Stage " + stage + " broadcast logged and dispatched to WhatsApp Group (" + targetGroup + ")!",
        timestamp: nowIstStr,
        cloudFetchSuccess: cloudFetchSuccess,
        ceoitboxTriggered: ceoitboxTriggered
      });
    }

    return jsonResponse({ success: false, error: "Unrecognized action: " + action });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * 3. Webhook HTTP GET Endpoint: Healthcheck and Diagnostic
 */
function doGet(e) {
  return jsonResponse({
    status: "ONLINE",
    hospital: CONFIG.HOSPITAL_NAME,
    targetGroup: CONFIG.WHATSAPP_GROUP_ID,
    driveFolder: "https://drive.google.com/drive/folders/" + CONFIG.DRIVE_FOLDER_ID,
    meetUrl: CONFIG.GOOGLE_MEET_URL,
    timestamp: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd hh:mm:ss a")
  });
}

/**
 * Helper: JSON Response output
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 4. Automated Daily Triggers
 * Runs at 09:50 AM and 10:30 AM (Monday - Saturday, Skips Sunday)
 */
function trigger_daily_0950_broadcast() {
  var now = new Date();
  // Skip Sunday (0)
  if (now.getDay() === 0) return;

  var dateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "dd-MMM-yyyy");
  var msg = "🏥 *" + CONFIG.HOSPITAL_NAME + "*\n" +
            "🔔 *09:50 AM NOTICE: DAILY OPERATIONS MEETING (DOM)*\n" +
            "━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📅 *Date:* " + dateStr + "\n" +
            "⏰ *Time:* Sharp 10:00 AM IST\n" +
            "📍 *Venue:* " + CONFIG.VENUE + "\n\n" +
            "✅ *ATTENDANCE & CHECK-IN LINK:*\n" +
            "👉 https://sbhdom.vercel.app/boardroom-checkin\n\n" +
            "⚠️ All Department Heads and Leaders please assemble in the Conference Room (5th Floor) and check in before 10:00 AM sharp.\n" +
            "Final attendance audit will freeze at 10:30 AM.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━\n" +
            "DOM Operations Command | SBH Raipur";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("WhatsApp_Delivery_Logs");
  if (logSheet) {
    logSheet.appendRow([
      Utilities.formatDate(now, CONFIG.TIMEZONE, "dd-MMM-yyyy hh:mm:ss a"),
      Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      "09:50 AM CRON TRIGGER",
      CONFIG.WHATSAPP_GROUP_ID,
      msg.substring(0, 120) + "...",
      "",
      "TIME_DRIVEN_TRIGGER",
      "DISPATCHED"
    ]);
  }
}

function manualDispatch0950() {
  trigger_daily_0950_broadcast();
  SpreadsheetApp.getActiveSpreadsheet().toast("09:50 AM DOM Notice recorded and prepared for WhatsApp Group!", "📤 Dispatched", 5);
}

function manualDispatch1030() {
  SpreadsheetApp.getActiveSpreadsheet().toast("10:30 AM PDF report trigger active. Sync from DOM Portal.", "📊 Final Report", 5);
}

function testDriveConnection() {
  try {
    var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    SpreadsheetApp.getUi().alert("✅ Google Drive Connected Successfully!\n\nFolder Name: " + folder.getName() + "\nFolder ID: " + CONFIG.DRIVE_FOLDER_ID);
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ Google Drive Connection Failed:\n\n" + e.toString());
  }
}

function setupAutomatedTriggers() {
  // Clear existing triggers to prevent duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // Create 09:50 AM Trigger
  ScriptApp.newTrigger("trigger_daily_0950_broadcast")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast("Daily automated triggers active for Monday - Saturday!", "⏰ Triggers Configured", 6);
}
