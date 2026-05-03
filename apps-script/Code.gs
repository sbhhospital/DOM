/**
 * HOSPITAL DOM AUTOMATION SYSTEM - PROFESSIONAL UPGRADE
 * --------------------------------------------------
 */

const CONFIG = {
  WHATSAPP_USER: 'SBH HOSPITAL',
  WHATSAPP_PASS: '123456789',
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

  // Cleanup
  DriveApp.getFileById(tempSS.getId()).setTrashed(true);
}

/**
 * TRIGGER HELPERS
 */
function triggerDailyReport() { generateProfessionalReport('Daily DOM'); }
function triggerWeeklyReport() { generateProfessionalReport('Weekly Monday Meeting'); }
function triggerMonthlyReport() { generateProfessionalReport('Monthly Meeting'); }

function triggerDailyReminders() {
  const dayName = Utilities.formatDate(new Date(), "GMT+5:30", "EEEE");
  if (dayName === "Saturday") return;
  sendReminders('Master_Data', 'Daily DOM');
}

function sendReminders(sheetName, type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName(sheetName).getDataRange().getValues();
  data.slice(1).forEach(row => {
    const [id, name, mobile, dept] = row;
    if (!mobile) return;
    const url = `${CONFIG.FRONTEND_URL}?id=${id}&name=${encodeURIComponent(name)}&dept=${encodeURIComponent(dept)}&type=${encodeURIComponent(type)}`;
    const msg = `🏥 *SBH DOM REMINDER*\n\nHello ${name},\nReminder for *${type}*.\n\nLink: ${url}`;
    const apiUrl = `https://app.messageautosender.com/message/new?username=${encodeURIComponent(CONFIG.WHATSAPP_USER)}&password=${encodeURIComponent(CONFIG.WHATSAPP_PASS)}&receiverMobileNo=${mobile}&receiverName=${encodeURIComponent(name)}&message=${encodeURIComponent(msg)}`;
    try { UrlFetchApp.fetch(apiUrl); } catch (e) {}
  });
}
