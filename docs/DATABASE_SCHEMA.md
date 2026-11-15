# Database Schema — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

All migrations are maintained under `supabase/migrations/` and must be applied sequentially.

### 1. Migrations Registry
| Migration File | Description | Status |
|---|---|---|
| `00001_initial_schema.sql` | Core logical tables, ENUM types, Foreign Keys, Unique Constraints, Indices | Reviewed & Ready |
| `00002_rls_policies.sql` | Row Level Security (RLS) policies for strict role isolation | Reviewed & Ready |
| `00003_seed_hospital_data.sql` | Seed master data for SBH Group of Hospital (Cardiology, Trauma, Neuro, ICU, etc.) | Reviewed & Ready |

### 2. Relational Entity Relationship Summary
```
+----------------+       +-------------------+       +--------------------+
|  departments   |<------|      leaders      |<------| attendance_records |
+----------------+       +-------------------+       +--------------------+
         ^                         ^                           |
         |                         |                           v
         |                         |                 +--------------------+
         |                         |                 | attendance_events  |
         |                         |                 +--------------------+
         |                         |
         |               +-------------------+
         +---------------|  leave_requests   |
                         +-------------------+
```

### 3. Key Table Details
- **departments**: Department metadata and leadership linkage.
- **leaders**: Hospital leadership directory with Workspace email mapping and role assignments.
- **meetings**: Daily Operations Meeting sessions with start/end timestamps and dynamic QR salt.
- **attendance_records**: Unique tuple `(meeting_id, leader_id)` storing live operational attendance states.
- **attendance_events**: Chronological and immutable event stream (scans, joins, sign-offs, admin approvals).
- **leave_requests**: Date-bounded leave applications with approval audit trail.
- **reminder_jobs**: Idempotent scheduled notification tasks for WhatsApp and Email dispatch.
- **admin_audit_logs**: Tamper-proof log of administrative presence overrides and rejections.
