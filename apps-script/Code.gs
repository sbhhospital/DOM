/**
 * HOSPITAL DOM AUTOMATION SYSTEM - PROFESSIONAL UPGRADE
 * --------------------------------------------------
 */

const CONFIG = {
  WHATSAPP_USER: 'SBH HOSPITAL',
  WHATSAPP_PASS: '123456789',
  WHATSAPP_GROUP_ID: '120363406464175673@g.us', // CEOITBOX Group
  FRONTEND_URL: 'https://sbh-dom.vercel.app',
  REPORT_EMAILS: ['dme@sbhhospital.com', 'namanmishraofficial@gmail.com'],
  REPORT_FOLDER_ID: '15OZUR4M9SS9IqIlDzZOGjrX6RlL85K9P', // Target Drive Folder
  DIRECTOR_NAME: 'DR Ashish Mahobia Sir',
  DIRECTOR_TITLE: 'Director'
};

/**
 * INITIAL SETUP
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsConfig = {
    'Master_Data': ['Emp_ID', 'Name', 'Mobile', 'Department', 'Type'],
    'Marketing_Master': ['Emp_ID', 'Name', 'Mobile', 'Department'],
    'Daily_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Weekly_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Monthly_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Archive_Daily': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Report_Logs': ['Date', 'Report_Type', 'PDF_Link', 'Time_Generated']
  };

  const headerColor = '#21a44a'; // Fluent Green

  for (let sheetName in sheetsConfig) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.clear();
    const headers = sheetsConfig[sheetName];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground(headerColor).setFontColor('white').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * HANDLE ATTENDANCE
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = data.meetingType.includes('Weekly') ? 'Weekly_DOM' : 
                     (data.meetingType.includes('Monthly') ? 'Monthly_DOM' : 'Daily_DOM');
    const sheet = ss.getSheetByName(sheetName);
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "GMT+5:30", "dd-MMM-yyyy (EEE)");
    const timeStr = Utilities.formatDate(now, "GMT+5:30", "hh:mm:ss a"); // AM/PM
    
    const row = [
      dateStr,
      data.empId,
      data.name,
      data.department,
      data.status,
      timeStr,
      "01:00 PM", // Auto Out Time in AM/PM
      data.lateRemark || "-",
      data.location,
      data.leaveReason || "-",
      data.lateRemark ? "LATE" : "ON_TIME"
    ];

    sheet.appendRow(row);
    
    if (data.lateRemark) {
      sheet.getRange(sheet.getLastRow(), 1, 1, row.length).setFontColor("red");
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GENERATE PROFESSIONAL PDF REPORT
 */
function generateProfessionalReport(type = 'Daily DOM') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = type.includes('Weekly') ? 'Weekly_DOM' : 
                         (type.includes('Monthly') ? 'Monthly_DOM' : 'Daily_DOM');
  const sourceSheet = ss.getSheetByName(sourceSheetName);
  const data = sourceSheet.getDataRange().getValues();
  
  const todayDbStr = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy");
  let todayData = data.filter((row, index) => index === 0 || row[0].includes(todayDbStr));
  
  if (todayData.length <= 1 && !type.includes('Weekly')) return;

  // Weekly Special Case: Add Director at top
  if (type.includes('Weekly')) {
    const directorRow = [todayDbStr, "DIR001", CONFIG.DIRECTOR_NAME, CONFIG.DIRECTOR_TITLE, "HEAD", "-", "-", "-", "-", "-", "DIRECTOR"];
    todayData.splice(1, 0, directorRow);
  }

  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy");
  const tempSS = SpreadsheetApp.create(`${type}_Report_${todayStr}`);
  const tempSheet = tempSS.getSheets()[0];
  
  // Professional Formatting
  tempSheet.getRange(1, 1, todayData.length, todayData[0].length).setValues(todayData);
  tempSheet.getRange(1, 1, 1, todayData[0].length).setBackground('#21a44a').setFontColor('white').setFontWeight('bold');
  
  // Late Formatting in PDF
  for (let i = 1; i < todayData.length; i++) {
    if (todayData[i][10] === "LATE") {
      tempSheet.getRange(i + 1, 1, 1, 11).setFontColor("red");
    }
    if (todayData[i][10] === "DIRECTOR") {
      tempSheet.getRange(i + 1, 1, 1, 11).setBackground('#f3f4f6').setFontWeight('bold');
    }
  }

  tempSheet.autoResizeColumns(1, todayData[0].length);
  SpreadsheetApp.flush();
  
  // Save PDF to Drive
  const folder = DriveApp.getFolderById(CONFIG.REPORT_FOLDER_ID);
  const blob = tempSS.getAs('application/pdf').setName(`${type}_${todayStr}.pdf`);
  const file = folder.createFile(blob);
  const pdfLink = file.getUrl();
  
  // Log Link
  const logSheet = ss.getSheetByName('Report_Logs');
  logSheet.appendRow([todayStr, type, pdfLink, Utilities.formatDate(new Date(), "GMT+5:30", "hh:mm a")]);
  
  // Send Emails
  const subject = `🏥 ${type} Attendance Report - ${todayStr}`;
  const body = `Professional attendance report generated.\nView here: ${pdfLink}`;
  CONFIG.REPORT_EMAILS.forEach(email => {
    MailApp.sendEmail(email, subject, body, { attachments: [blob] });
  });

  // Send to WhatsApp Group
  const waMsg = `📊 *${type} REPORT*\nDate: ${todayStr}\n\nDownload Report: ${pdfLink}`;
  const waApiUrl = `https://app.messageautosender.com/message/new?username=${encodeURIComponent(CONFIG.WHATSAPP_USER)}&password=${encodeURIComponent(CONFIG.WHATSAPP_PASS)}&receiverMobileNo=${CONFIG.WHATSAPP_GROUP_ID}&receiverName=CEOITBOX&message=${encodeURIComponent(waMsg)}`;
  
  try {
    UrlFetchApp.fetch(waApiUrl);
    Logger.log("Report sent to WhatsApp Group");
  } catch (e) {
    Logger.log(`Failed to send WA Group report: ${e.message}`);
  }

  // Cleanup
  DriveApp.getFileById(tempSS.getId()).setTrashed(true);
}

/**
 * TRIGGER HELPERS
 */
function triggerDailyReport() { generateProfessionalReport('Daily DOM'); }
function triggerWeeklyReport() { generateProfessionalReport('Weekly Monday Meeting'); }
function triggerMonthlyReport() { generateProfessionalReport('Monthly Meeting'); }

/**
 * STEP 4: REMINDERS (Trigger-ready)
 * Hierarchy: Monthly > Weekly > Daily
 */
function triggerAutomaticReminders() {
  const today = new Date();
  const dayName = Utilities.formatDate(today, "GMT+5:30", "EEEE");
  const date = today.getDate();
  
  if (dayName === "Saturday") return; // Weekend off

  let type = "Daily DOM";
  if (dayName === "Monday") {
    type = (date <= 7) ? "Monthly Meeting (MOM)" : "Weekly Monday Meeting";
  }
  
  sendReminders('Master_Data', type);
}

function sendReminders(sheetName, type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName(sheetName).getDataRange().getValues();
  
  data.slice(1).forEach(row => {
    const [id, name, mobile, dept] = row;
    if (!mobile) return;
    
    const url = `${CONFIG.FRONTEND_URL}?id=${id}&name=${encodeURIComponent(name)}&dept=${encodeURIComponent(dept)}&type=${encodeURIComponent(type)}`;
    const msg = `🏥 *SBH DOM REMINDER*\n\nHello ${name},\nReminder for *${type}*.\n\nPlease mark your attendance here: ${url}`;
    
    const apiUrl = `https://app.messageautosender.com/message/new?username=${encodeURIComponent(CONFIG.WHATSAPP_USER)}&password=${encodeURIComponent(CONFIG.WHATSAPP_PASS)}&receiverMobileNo=${mobile}&receiverName=${encodeURIComponent(name)}&message=${encodeURIComponent(msg)}`;
    
    try { UrlFetchApp.fetch(apiUrl); } catch (e) { Logger.log("WA Fail: " + e.message); }
  });
}

/**
 * STEP 5: PROFESSIONAL STYLIZED PDF GENERATION
 */
function generateSmartReport() {
  const today = new Date();
  const dayName = Utilities.formatDate(today, "GMT+5:30", "EEEE");
  const date = today.getDate();
  
  let type = "Daily DOM";
  if (dayName === "Monday") {
    type = (date <= 7) ? "Monthly Meeting" : "Weekly Monday Meeting";
  }

  generateProfessionalReport(type);
}

function generateProfessionalReport(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceName = type.includes('Monthly') ? 'Monthly_DOM' : (type.includes('Weekly') ? 'Weekly_DOM' : 'Daily_DOM');
  const sourceSheet = ss.getSheetByName(sourceName);
  const data = sourceSheet.getDataRange().getValues();
  
  const todayDbStr = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy");
  let reportData = data.filter((row, index) => index === 0 || row[0].includes(todayDbStr));
  
  // Sort series-wise by Name (Column index 2)
  if (reportData.length > 2) {
    const header = reportData.shift();
    reportData.sort((a, b) => a[2].localeCompare(b[2]));
    reportData.unshift(header);
  }

  // Weekly Special Case: Add Director
  if (type.includes('Weekly')) {
    const directorRow = [todayDbStr, "DIR001", CONFIG.DIRECTOR_NAME, CONFIG.DIRECTOR_TITLE, "PRESENT", "-", "-", "-", "-", "-", "DIRECTOR"];
    reportData.splice(1, 0, directorRow);
  }

  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy hh:mm a");
  const tempSS = SpreadsheetApp.create(`${type}_Report_${todayDbStr}`);
  const tempSheet = tempSS.getSheets()[0];
  
  // Apply Stylized Professional Look
  tempSheet.getRange(1, 1, reportData.length, reportData[0].length).setValues(reportData);
  
  // Header Style
  const headerRange = tempSheet.getRange(1, 1, 1, reportData[0].length);
  headerRange.setBackground('#2d3748').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle').setPaddingLeft(10).setPaddingRight(10);
  tempSheet.setRowHeight(1, 35);

  // Alternating Row Colors
  if (reportData.length > 1) {
    for (let i = 2; i <= reportData.length; i++) {
      if (i % 2 === 0) {
        tempSheet.getRange(i, 1, 1, reportData[0].length).setBackground('#f7fafc');
      }
    }
  }

  // Late Highlighting
  for (let i = 1; i < reportData.length; i++) {
    if (reportData[i][10] === "LATE") {
      tempSheet.getRange(i + 1, 1, 1, 11).setFontColor("#e53e3e").setFontWeight('bold');
    }
  }

  // Page Header
  tempSheet.insertRowsBefore(1, 3);
  tempSheet.getRange("A1:K1").merge().setValue(`SBH HOSPITAL - ${type.toUpperCase()}`).setFontSize(18).setFontWeight('bold').setFontColor('#2d3748').setHorizontalAlignment('center');
  tempSheet.getRange("A2:K2").merge().setValue(`REPORT GENERATED: ${todayStr}`).setFontSize(10).setFontColor('#718096').setHorizontalAlignment('center');
  
  tempSheet.autoResizeColumns(1, 11);
  SpreadsheetApp.flush();
  
  const folder = DriveApp.getFolderById(CONFIG.REPORT_FOLDER_ID);
  const blob = tempSS.getAs('application/pdf').setName(`${type}_${todayDbStr}.pdf`);
  const file = folder.createFile(blob);
  const pdfLink = file.getUrl();
  
  // Log Link
  ss.getSheetByName('Report_Logs').appendRow([todayDbStr, type, pdfLink, Utilities.formatDate(new Date(), "GMT+5:30", "hh:mm a")]);
  
  // Send WA & Email
  const waMsg = `📄 *${type} REPORT*\n\nDate: ${todayDbStr}\nStatus: Generated & Saved\n\nDownload Link: ${pdfLink}`;
  UrlFetchApp.fetch(`https://app.messageautosender.com/message/new?username=${encodeURIComponent(CONFIG.WHATSAPP_USER)}&password=${encodeURIComponent(CONFIG.WHATSAPP_PASS)}&receiverMobileNo=${CONFIG.WHATSAPP_GROUP_ID}&receiverName=CEOITBOX&message=${encodeURIComponent(waMsg)}`);
  
  CONFIG.REPORT_EMAILS.forEach(email => MailApp.sendEmail(email, `🏥 ${type} Report - ${todayDbStr}`, body, { attachments: [blob] }));

  DriveApp.getFileById(tempSS.getId()).setTrashed(true);
}
