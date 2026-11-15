# Google Meet Integration — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Overview
The DOM meeting supports remote executive attendance via Google Meet for leaders on official duty or remote administrative work.

### 2. Available APIs & Requirements
- **Google Workspace Edition**: Google Meet Attendance Reports are generated automatically for Google Workspace Business Plus, Enterprise, or Education tiers when meetings have 5+ participants.
- **Google Meet REST API / Reports API**:
  - `admin.reports.audit.meet`: Requires Google Workspace Service Account with domain-wide delegation.
  - Scopes: `https://www.googleapis.com/auth/admin.reports.audit.readonly`
- **Reconciliation Engine Process**:
  1. Fetch meeting participants by `conferenceId` or meeting code.
  2. Map participant `email` to `leaders.email`.
  3. Calculate aggregated duration `SUM(leave_time - join_time)`.
  4. Compare with hospital threshold (e.g. >= 20 minutes).
  5. If valid, update `status = 'PRESENT'`, `verification_status = 'VERIFIED'`, `evidence_source = 'GOOGLE_MEET_API'`.

### 3. Limitations & Fallback Workflow
- Real-time attendance is not guaranteed by Google Meet API while the meeting is in progress; reports often generate post-conclusion (5-15 minute latency).
- **Provisional Status**: Leaders who click "Join Virtually" are marked `CHECKED_IN` (`verification_status: PENDING`) until the post-meeting reconciliation job confirms connection duration.
- Administrators can manually review and verify virtual attendance in the DOM console if participant reports are delayed.
