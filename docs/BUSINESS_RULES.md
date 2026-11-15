# Business Rules — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Attendance Modes
- **PHYSICAL**: Leader is in the hospital boardroom for the DOM meeting.
- **VIRTUAL**: Leader is connecting via official Google Meet video conference.
- **NONE**: Unselected initial status.

### 2. Physical Attendance Policy
- **Hospital Premise Rule**: If an executive leader is present in the hospital, the expected mode is `PHYSICAL`, unless exempted by an approved clinical duty (e.g. emergency surgery in OT, code blue in ICU).
- An in-room QR scan provides evidence of a scan attempt (`CHECKED_IN`), not verified presence.
- The DOM Administrative Officer must confirm the leader's visual presence before status becomes `PRESENT`.

### 3. Google Meet Virtual Attendance Policy
- Clicking "Join Virtually" from the Personal Portal link updates the mode and logs an initial join event, but **does not grant verified attendance**.
- The server-side reconciliation engine queries Google Meet attendance data:
  1. Participant Workspace email must match `leaders.email`.
  2. Total session duration must satisfy the minimum required threshold (default: >= 20 minutes).
  3. Records not satisfying this threshold remain in unresolved status for administrative audit.

### 4. Scheduled Notification & Escalation Schedule (Asia/Kolkata)
- **10:00 AM IST — Initial Reminder**:
  - Scans `attendance_records` for status `PENDING`.
  - Suppressed if leader has approved leave or an active clinical exemption.
  - Sends personalized WhatsApp link directing leader to either "Attend Physically" or "Join Virtually".
- **10:05 AM IST — Follow-up Reminder**:
  - Re-evaluates live attendance status immediately prior to dispatch.
  - Excludes leaders who have scanned QR or whose status is no longer `PENDING`.
  - Dispatches follow-up WhatsApp reminder.
- **10:20 AM IST — Group Escalation**:
  - Compiles unresolved leaders (excluding approved leave).
  - Posts escalation digest to the Executive Leadership WhatsApp group.
