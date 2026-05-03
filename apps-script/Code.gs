/**
 * HOSPITAL DOM AUTOMATION SYSTEM - GOOGLE APPS SCRIPT
 * --------------------------------------------------
 * This script handles:
 * 1. Automatic Sheet Setup (Tabs, Headers, Styling)
 * 2. Attendance Submission from React App
 * 3. Daily/Weekly/Monthly Reminders via WhatsApp
 * 4. Late Marking & Highlighting (Red Color)
 * 5. Data Archiving & PDF Reporting
 */

const CONFIG = {
  WHATSAPP_USER: 'SBH HOSPITAL',
  WHATSAPP_PASS: '123456789',
  FRONTEND_URL: 'https://sbh-dom.vercel.app',
  REPORT_EMAILS: ['director@hospital.com', 'suman@hospital.com'], // Replace with actual emails
};

/**
 * STEP 1: INITIAL SETUP
 * Run this function once to create all sheets and headers.
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define Sheet Structure
  const sheetsConfig = {
    'Master_Data': ['Emp_ID', 'Name', 'Mobile', 'Department', 'Type'],
    'Marketing_Master': ['Emp_ID', 'Name', 'Mobile', 'Department'],
    'Daily_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Weekly_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Monthly_DOM': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Archive_Daily': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Archive_Weekly': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status'],
    'Archive_Monthly': ['Date', 'Emp_ID', 'Name', 'Department', 'Status', 'In_Time', 'Out_Time', 'Late_Remark', 'Location', 'Leave_Reason', 'Late_Status']
  };

  const headerColor = '#4f46e5'; // Indigo
  const textColor = '#ffffff';

  for (let sheetName in sheetsConfig) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear(); // Reset if already exists
    }
    
    const headers = sheetsConfig[sheetName];
    sheet.appendRow(headers);
    
    // Style Header
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground(headerColor)
         .setFontColor(textColor)
         .setFontWeight('bold')
         .setHorizontalAlignment('center')
         .setVerticalAlignment('middle');
    
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  
  SpreadsheetApp.getUi().alert('System Initialized Successfully! All sheets and headers have been created.');
}

/**
 * STEP 2: HANDLE ATTENDANCE SUBMISSION
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Daily_DOM');
    
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "GMT+5:30", "yyyy-MM-dd");
    const currentTimeStr = Utilities.formatDate(now, "GMT+5:30", "HH:mm");
    
    // Late Logic (10:00 AM)
    let lateRemark = data.lateRemark || "";
    let statusColor = "black";
    let lateStatus = "ON_TIME";

    if (lateRemark) {
      statusColor = "red";
      lateStatus = "LATE";
    }

    const row = [
      todayStr,
      data.empId,
      data.name,
      data.department,
      data.status,
      currentTimeStr,
      "13:00", // Auto Out Time
      lateRemark,
      data.location,
      data.leaveReason || "-",
      lateStatus
    ];

    sheet.appendRow(row);
    
    // Formatting for Late Entry
    if (lateStatus === "LATE") {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, row.length).setFontColor("red");
    } else if (data.status === "On Leave") {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, row.length).setFontColor("#d97706"); // Amber for leave
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * STEP 3: CLOSING LOGIC (11:00 AM)
 * Marks absent if not filled.
 */
function closeDailyAttendance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName('Daily_DOM');
  const masterSheet = ss.getSheetByName('Master_Data');
  
  const dailyData = dailySheet.getDataRange().getValues();
  const masterData = masterSheet.getDataRange().getValues();
  
  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd");
  const presentIds = dailyData.filter(r => r[0] === todayStr).map(r => r[1]);

  masterData.slice(1).forEach(row => {
    const [id, name, mobile, dept, type] = row;
    if (type === "Normal" && !presentIds.includes(id)) {
      dailySheet.appendRow([
        todayStr, id, name, dept, "Absent", "-", "-", "No Information", "-", "-", "ABSENT"
      ]);
      const lastRow = dailySheet.getLastRow();
      dailySheet.getRange(lastRow, 1, 1, 11).setFontColor("#94a3b8"); // Muted color
    }
  });
}

/**
 * STEP 6: PDF REPORT GENERATION & SENDING
 * Generates a clean PDF of today's attendance and emails it.
 */
function generateAndSendDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName('Daily_DOM');
  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy");
  const todayDbStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd");
  
  const data = dailySheet.getDataRange().getValues();
  const todayData = data.filter((row, index) => index === 0 || row[0] === todayDbStr);
  
  if (todayData.length <= 1) {
    Logger.log("No data for today. Skipping report.");
    return;
  }

  // Create Temporary Spreadsheet for PDF conversion
  const tempSS = SpreadsheetApp.create(`DOM_Report_${todayStr}`);
  const tempSheet = tempSS.getSheets()[0];
  tempSheet.getRange(1, 1, todayData.length, todayData[0].length).setValues(todayData);
  
  // Styling
  const headerRange = tempSheet.getRange(1, 1, 1, todayData[0].length);
  headerRange.setBackground('#1e293b').setFontColor('white').setFontWeight('bold');
  tempSheet.setFrozenRows(1);
  tempSheet.autoResizeColumns(1, todayData[0].length);
  
  // Highlight Late rows in Red in the PDF
  for (let i = 1; i < todayData.length; i++) {
    if (todayData[i][10] === "LATE") {
      tempSheet.getRange(i + 1, 1, 1, 11).setFontColor("red");
    }
  }

  SpreadsheetApp.flush();
  
  // Get PDF Blob
  const blob = tempSS.getAs('application/pdf').setName(`DOM_Report_${todayStr}.pdf`);
  
  // Send Email to Recipients
  const subject = `🏥 Daily DOM Attendance Report - ${todayStr}`;
  const body = `Hello,\n\nPlease find attached the Daily Operations Management (DOM) attendance report for today, ${todayStr}.\n\nTotal Entries: ${todayData.length - 1}`;
  
  CONFIG.REPORT_EMAILS.forEach(email => {
    MailApp.sendEmail(email, subject, body, {
      attachments: [blob]
    });
  });

  // Cleanup: Delete temp spreadsheet
  DriveApp.getFileById(tempSS.getId()).setTrashed(true);
  Logger.log(`PDF Report sent to: ${CONFIG.REPORT_EMAILS.join(", ")}`);
}

/**
 * STEP 4: REMINDERS (Triggers)
 */
function triggerDailyReminders() {
  const dayName = Utilities.formatDate(new Date(), "GMT+5:30", "EEEE");
  if (dayName === "Saturday") return;
  
  sendRemindersToGroup('Master_Data', 'Daily DOM');
}

function triggerMarketingReminders() {
  const today = new Date();
  const isFirstMonday = today.getDay() === 1 && today.getDate() <= 7;
  if (!isFirstMonday) return;
  
  sendRemindersToGroup('Marketing_Master', 'Weekly/Monthly DOM');
}

function sendRemindersToGroup(sheetName, meetingType) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  data.slice(1).forEach(row => {
    const [id, name, mobile, dept] = row;
    if (!mobile) return;

    const url = `${CONFIG.FRONTEND_URL}?id=${id}&name=${encodeURIComponent(name)}&dept=${encodeURIComponent(dept)}`;
    const msg = `🏥 *SBH DOM Reminder*\n\nHello ${name},\nReminder for ${meetingType} meeting.\n\nMark Attendance: ${url}\n\n*Note:* Links close at 11:00 AM.`;
    
    // Call WhatsApp API
    const apiUrl = `https://app.messageautosender.com/message/new?username=${encodeURIComponent(CONFIG.WHATSAPP_USER)}&password=${encodeURIComponent(CONFIG.WHATSAPP_PASS)}&receiverMobileNo=${mobile}&receiverName=${encodeURIComponent(name)}&message=${encodeURIComponent(msg)}`;
    
    try {
      UrlFetchApp.fetch(apiUrl);
      Logger.log(`Reminder sent to ${name} (${mobile})`);
    } catch (e) {
      Logger.log(`Failed to send to ${mobile}: ${e.message}`);
    }
  });
}

/**
 * STEP 5: ARCHIVING (Midnight)
 */
function archiveAllData() {
  archiveSheet('Daily_DOM', 'Archive_Daily');
  // Add weekly/monthly logic as needed
}

/**
 * STEP 6: TESTING HELPER
 * Run this function to add a test employee and get a test link.
 */
function createTestUser() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('Master_Data');
  
  // Add Test Row: ID, Name, Mobile, Dept, Type
  const testData = ['TEST001', 'Test User', 'YOUR_MOBILE_NUMBER', 'Testing Dept', 'Normal'];
  masterSheet.appendRow(testData);
  
  const id = testData[0];
  const name = encodeURIComponent(testData[1]);
  const dept = encodeURIComponent(testData[3]);
  const testUrl = `${CONFIG.FRONTEND_URL}?id=${id}&name=${name}&dept=${dept}`;
  
  Logger.log(`Test User Added!`);
  Logger.log(`Testing Link: ${testUrl}`);
  SpreadsheetApp.getUi().alert(`Test User added. Check logs (Ctrl+Enter) for the test link.`);
}
