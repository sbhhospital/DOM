# System Architecture — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. High-Level Architecture Overview
The DOM Attendance Automation System is designed to manage the critical daily attendance of hospital leadership and clinical department heads.

```
+---------------------------------------------------------------------------------+
|                               Presentation Layer                                |
|  - React 19 + TypeScript + Vite + Tailwind CSS                                  |
|  - In-Room Dynamic QR Display (Boardroom projection, 30s rotating window)       |
|  - In-Room Live Verification Queue (Admin presence confirmation)                |
|  - Leader Personal Portal (Attending Physically vs. Join Virtually)            |
|  - HR Leave & Exemption Portal (Suppression of morning automated notifications)  |
|  - Director Analytical Dashboard & NABH Compliance Reports                      |
+---------------------------------------------------------------------------------+
                                       |
                   Supabase Client / Protected HTTPS API
                                       v
+---------------------------------------------------------------------------------+
|                           Database & Security Layer                             |
|  - Supabase PostgreSQL with Relational Constraints                              |
|  - Row Level Security (RLS) enforcing strict Role Isolation                     |
|  - Cryptographic Salt & Token Hashing for In-Room QR Code Validation           |
|  - Immutable Audit Event Ledger (`admin_audit_logs`)                            |
+---------------------------------------------------------------------------------+
                                       |
                   Serverless Execution & Scheduler
                                       v
+---------------------------------------------------------------------------------+
|                       Integrations & Automation Engine                          |
|  - Vercel Cron Jobs / Supabase Edge Functions                                   |
|  - 10:00 AM Initial Reminder -> WhatsApp API Adapter + Personal Portal Links    |
|  - 10:05 AM Follow-up Reminder -> Re-checks live attendance status              |
|  - 10:20 AM Group Escalation -> Executive Leadership Group Dispatch             |
|  - Google Meet API Participant Reconciliation Engine                            |
+---------------------------------------------------------------------------------+
```

### 2. Physical Presence Verification Security
To prevent fraud (such as photo-sharing of the QR code outside the boardroom):
1. The conference room screen projects a **time-slotted HMAC token** that rotates automatically every 30 seconds.
2. The leader's mobile scan only changes their state to `CHECKED_IN` (`verification_status: PENDING`).
3. The DOM Admin physically reviews the leader's visual presence in the room and clicks **"Verify Presence"**, transitioning the record to `PRESENT` (`verification_status: VERIFIED`).
4. Rejections require a mandatory clinical/operational justification which is written to the immutable audit log.
