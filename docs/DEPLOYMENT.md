# Deployment Runbook — DOM Attendance Automation System
## SBH Group of Hospital, Raipur

### 1. Supabase Cloud Setup
1. Create a new Supabase project in the nearest region (e.g., `ap-south-1` Mumbai).
2. Execute SQL migrations in sequential order via Supabase SQL Editor:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_rls_policies.sql`
   - `supabase/migrations/00003_seed_hospital_data.sql`
3. Configure Google Workspace OAuth under **Authentication > Providers > Google**:
   - Add Authorized Client ID and Client Secret.
   - Restrict allowed email domains to `@sbh.org`.

### 2. Vercel Web Deployment
1. Connect the Git repository to Vercel.
2. Set Build Command to `npm run build` and Output Directory to `dist`.
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `CRON_SECRET`
   - `APP_BASE_URL`

### 3. Vercel Cron Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders?type=1000",
      "schedule": "30 4 * * 1-6"
    },
    {
      "path": "/api/cron/reminders?type=1005",
      "schedule": "35 4 * * 1-6"
    },
    {
      "path": "/api/cron/reminders?type=1020",
      "schedule": "50 4 * * 1-6"
    }
  ]
}
```
*(Note: 10:00 AM, 10:05 AM, and 10:20 AM IST correspond to 04:30, 04:35, and 04:50 UTC).*
