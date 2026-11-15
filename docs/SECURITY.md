# Security & RLS Policies — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Row Level Security (RLS) Principles
All database tables in Supabase have RLS enabled by default. No anonymous client may access leader records or attendance data.

| Table | Policy Highlights |
|---|---|
| `departments` | Read-only for authenticated staff; mutations restricted to `ADMIN` and `SUPER_ADMIN`. |
| `leaders` | Directory read for coordination; profile updates restricted to administrative officers. |
| `attendance_records` | Leaders can view only their own records; privileged roles (`DIRECTOR`, `ADMIN`, `HR`) view all. Leaders can update only `selected_mode`. |
| `attendance_events` | Immutable historical event log. Once written, records cannot be updated or deleted. |
| `leave_requests` | Leaders create their own requests; approvals/rejections restricted to `HR` role. Self-approval is rejected by database constraints and RLS. |
| `admin_audit_logs` | Immutable audit trail. System actors insert events; zero update or delete permissions exist for any user. |

### 2. QR Code Tamper Prevention
- In-room QR codes are generated dynamically with rotating 30-second HMAC time windows and server-side secret salts.
- Scans made outside the active time window or outside an `ACTIVE` meeting session are rejected with clear error codes.
