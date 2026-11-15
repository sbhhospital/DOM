# Testing Strategy & Test Matrix — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Test Verification Scenarios

| Area | Test Case | Expected Behavior | Status |
|---|---|---|---|
| **Auth** | Sign in with `@sbh.org` account | Authenticated and matched to `leaders` table profile | Verified |
| **Auth** | Sign in with unregistered personal Gmail | Access rejected with clear organizational policy alert | Verified |
| **In-Room QR** | Leader scans valid dynamic QR code | Status becomes `CHECKED_IN`, verification is `PENDING`, appears in Admin Queue | Verified |
| **In-Room QR** | QR code rotates every 30 seconds | Expired token cannot be replayed from previous window | Verified |
| **Verification** | Admin confirms physical presence | Status becomes `PRESENT`, verification `VERIFIED`, counts increment in Director metrics | Verified |
| **Verification** | Admin rejects check-in with reason | Record marked `REJECTED`, audit entry written with mandatory justification | Verified |
| **Google Meet** | Leader selects "Join Virtually" | Status updated to `CHECKED_IN`, Meet link launched, join event logged | Verified |
| **Google Meet** | Post-meeting participant sync | Matches Workspace email & verifies duration threshold | Verified |
| **Leave** | Leader applies for medical/casual leave | Recorded as `PENDING` until HR approves | Verified |
| **Leave** | HR approves leave for meeting date | Status becomes `LEAVE`, automatically suppresses 10:00/10:05/10:20 notifications | Verified |
| **Reminders** | 10:00 AM Initial Reminder | Sent only to `PENDING` leaders without approved leave | Verified |
| **Reminders** | 10:05 AM Follow-up Reminder | Only unverified leaders re-targeted; QR scans in queue notify admin instead | Verified |
| **Escalation** | 10:20 AM Group Escalation | Dispatched to leadership group summarizing remaining unresolved cases | Verified |
| **Audit** | Any verification or rejection action | Immutable row written to `admin_audit_logs` | Verified |
