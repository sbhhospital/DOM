-- Migration 00007: Complete SQL Schema & Tables for SBH Hospital DOM
-- Zero LocalStorage dependency. Everything stored in Supabase SQL Database.

-- 1. Add password column to leaders table
ALTER TABLE leaders 
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456';

UPDATE leaders 
SET password = '123456' 
WHERE password IS NULL;

-- 2. Ensure attendance_records has all audit and inform fields
ALTER TABLE attendance_records 
  ADD COLUMN IF NOT EXISTS informed_to_person VARCHAR(150),
  ADD COLUMN IF NOT EXISTS informed_reason TEXT,
  ADD COLUMN IF NOT EXISTS informed_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_verified_attendance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- 3. Meeting Schedules table for Calendar Cadences and Cancelled / Removed DOMs
CREATE TABLE IF NOT EXISTS meeting_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_date DATE NOT NULL UNIQUE,
  cadence VARCHAR(20) DEFAULT 'DOM',
  frequency VARCHAR(20) DEFAULT 'DAILY',
  title VARCHAR(255) DEFAULT 'DOM — Daily Operations Meeting',
  scheduled_time VARCHAR(50) DEFAULT '10:00 AM IST',
  is_holiday_or_shifted BOOLEAN DEFAULT false,
  shift_reason TEXT,
  google_meet_url TEXT DEFAULT 'https://meet.google.com/jrz-jfku-gir',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Admin Users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL DEFAULT 'Hospital Administrator',
  email VARCHAR(255) NOT NULL DEFAULT 'admin@sbhhospital.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_users (username, password_hash, full_name, email)
VALUES ('admin', 'Naman@123', 'SBH Hospital Operations Command', 'admin@sbhhospital.com')
ON CONFLICT (username) DO UPDATE SET password_hash = 'Naman@123';

-- 5. App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('director_whatsapp', '9644404741', 'Director Sir WhatsApp Number'),
  ('admin_whatsapp_group', '120363432056023698@g.us', 'Official SBH WhatsApp Group ID'),
  ('google_meet_url', 'https://meet.google.com/jrz-jfku-gir', 'Daily DOM Google Meet URL'),
  ('conference_room_name', 'Conference Room, 5th Floor', 'Boardroom Venue'),
  ('ceoitbox_username', 'SBH HOSPITAL', 'CEOITBOX API Username'),
  ('ceoitbox_password', '123456789', 'CEOITBOX API Password')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 6. Enable Row Level Security and allow full CRUD access for web client
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on leaders" ON leaders;
CREATE POLICY "Allow anon all on leaders" ON leaders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on departments" ON departments;
CREATE POLICY "Allow anon all on departments" ON departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on meetings" ON meetings;
CREATE POLICY "Allow anon all on meetings" ON meetings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on attendance_records" ON attendance_records;
CREATE POLICY "Allow anon all on attendance_records" ON attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "Allow anon all on admin_audit_logs" ON admin_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on admin_users" ON admin_users;
CREATE POLICY "Allow anon all on admin_users" ON admin_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on app_settings" ON app_settings;
CREATE POLICY "Allow anon all on app_settings" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on meeting_schedules" ON meeting_schedules;
CREATE POLICY "Allow anon all on meeting_schedules" ON meeting_schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
