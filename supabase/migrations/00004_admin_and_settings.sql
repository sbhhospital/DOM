-- Migration 00004: Add Admin Credentials, Informed Absentees, and QR/Report Settings
-- SBH Group of Hospital, Raipur

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL DEFAULT 'Hospital Administrator',
  email VARCHAR(255) NOT NULL DEFAULT 'admin@sbhhospital.com',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and public access policy for admin authentication
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all admin_users access" ON admin_users FOR ALL USING (true);

-- Insert default admin account (admin / admin123)
INSERT INTO admin_users (username, password_hash, full_name, email)
VALUES ('admin', 'admin123', 'SBH Super Administrator', 'admin@sbhhospital.com')
ON CONFLICT (username) DO NOTHING;

-- Extend attendance_records with informed absence fields if not exist
ALTER TABLE attendance_records 
  ADD COLUMN IF NOT EXISTS informed_to_person VARCHAR(150),
  ADD COLUMN IF NOT EXISTS informed_reason TEXT,
  ADD COLUMN IF NOT EXISTS informed_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_verified_attendance BOOLEAN DEFAULT false;

-- Table for system settings (WhatsApp group, Director WhatsApp, Google Meet URL, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all app_settings access" ON app_settings FOR ALL USING (true);

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('director_whatsapp', '+919876543210', 'Director WhatsApp Number for Daily Reports'),
  ('admin_whatsapp_group', 'SBH DOM Executive Group', 'WhatsApp Group Name/ID for DOM Escalations'),
  ('google_meet_url', 'https://meet.google.com/sbh-dom-daily', 'Hospital Official Google Meet URL'),
  ('allowed_domain', 'sbhhospital.com', 'Official hospital email domain')
ON CONFLICT (setting_key) DO NOTHING;
