# DOM System Testing Guide 🧪

Is guide ko follow karke aap poora system 5 minute me test kar sakte hain.

## Step 1: Sheet ko Taiyar Karein
1.  Google Sheet me Apps Script editor kholein.
2.  `initializeSystem` function ko run karein (Agar pehle nahi kiya hai). Isse tabs ban jayenge.
3.  `Master_Data` tab me apna naam aur mobile number ek baar manual daal dein test ke liye.

## Step 2: Reminder Test Karein
1.  Apps Script editor me `triggerDailyReminders` function ko select karke **Run** karein.
2.  Aapke mobile par WhatsApp message aana chahiye jisme ek link hoga.

## Step 3: Attendance Mark Karein (Frontend Test)
1.  WhatsApp par aaye hue **Link ko Click karein**.
2.  App open hogi. Check karein:
    *   Kya aapka **Name** aur **Dept** sahi dikh raha hai?
    *   Kya **Location** automatic capture ho rahi hai?
    *   Status me **"Haan"** select karein aur **Submit** dabayein.

## Step 4: Sheet me Data Verify Karein
1.  Apni Google Sheet ke **Daily_DOM** tab me jayein.
2.  Check karein:
    *   Kya aapki entry wahan aa gayi hai?
    *   Agar aapne 10:00 AM ke baad bhara hai, to kya remark me **"Late"** likha hai aur row **Red** color me hai?
    *   Kya **Location** coordinates wahan dikh rahe hain?

## Step 5: Closing Logic Test (Manual)
1.  Apps Script me `closeDailyAttendance` function ko run karein.
2.  Check karein ki jin employees ne attendance nahi bhari, unka status automatic **"Absent"** ho gaya hai ya nahi.

---

### Tips for Success:
*   **GAS Deployment**: Har baar code change karne ke baad `Deploy > Manage Deployments > Edit > New Version` zaroor karein, warna changes live nahi honge.
*   **Location Permission**: Mobile par link open karte waqt "Allow Location" par click karein.
