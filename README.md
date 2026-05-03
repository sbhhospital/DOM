# SBH Hospital - Professional DOM Automation

This project is a comprehensive hospital attendance and reporting automation system.

## 🚀 Key Features

### 1. Smart Reminder Hierarchy
The system automatically determines which meeting is active based on the date:
- **Monthly Meeting (MOM)**: Triggered on the **First Monday** of every month. (Replaces Daily/Weekly reminders).
- **Weekly Monday Meeting**: Triggered on **any other Monday**. (Replaces Daily reminders).
- **Daily DOM**: Triggered on all other days (Tuesday-Friday, Sunday).

### 2. Stylized Professional Reporting
- **Custom PDFs**: Reports are generated with professional headers, alternating row colors, and bold late-marking.
- **Drive Integration**: All PDFs are saved in a dedicated Drive folder.
- **Report Logs**: A dedicated log sheet tracks every generated PDF link by date and type.
- **AM/PM Formatting**: All timestamps are formatted in standard 12-hour AM/PM format.

### 3. Fluent UI Frontend
- **Green & Orange Theme**: Modern, high-contrast UI optimized for mobile.
- **Success Popups**: Professional feedback after submission.
- **Identity Cards**: Professional display of employee name and department.

## 🛠 Setup

1. **Google Sheet**:
   - Copy the code from `apps-script/Code.gs`.
   - Run `initializeSystem()` once.
2. **Triggers**:
   - Set a daily trigger for `triggerAutomaticReminders` (e.g., 9:00 AM).
   - Set a daily trigger for `generateSmartReport` (e.g., 1:00 PM).
3. **Frontend**:
   - Deploy the React app and update the `FRONTEND_URL` in the GAS `CONFIG`.

---
Developed by Antigravity for SBH Hospital.
