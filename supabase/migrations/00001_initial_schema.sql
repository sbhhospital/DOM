-- Migration 00001: Initial Schema for DOM Attendance Automation System
-- SBH Group of Hospital, Raipur

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Roles ENUM
CREATE TYPE user_role AS ENUM (
  'DIRECTOR',
  'ADMIN',
  'HR',
  'LEADER',
  'SUPER_ADMIN'
);

-- 2. Attendance Mode ENUM
CREATE TYPE attendance_mode AS ENUM (
  'PHYSICAL',
  'VIRTUAL',
  'NONE'
);

-- 3. Attendance Status ENUM
CREATE TYPE attendance_status AS ENUM (
  'PENDING',
  'CHECKED_IN',
  'PRESENT',
  'ABSENT',
  'LEAVE',
  'EXCUSED',
  'REJECTED'
);

-- 4. Verification Status ENUM
CREATE TYPE verification_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

-- 5. Leave Status ENUM
CREATE TYPE leave_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

-- 6. Reminder Type ENUM
CREATE TYPE reminder_type AS ENUM (
  'INITIAL_1000',
  'FOLLOWUP_1005',
  'ESCALATION_1020'
);

-- 7. Job Status ENUM
CREATE TYPE job_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'CANCELLED'
);

--------------------------------------------------------------------------------
-- Table: departments
--------------------------------------------------------------------------------
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  head_leader_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: leaders
--------------------------------------------------------------------------------
CREATE TABLE leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- References auth.users(id) in Supabase
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'LEADER',
  employee_code VARCHAR(50) UNIQUE,
  expected_mode attendance_mode NOT NULL DEFAULT 'PHYSICAL',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key back to department head
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head
  FOREIGN KEY (head_leader_id) REFERENCES leaders(id) ON DELETE SET NULL;

--------------------------------------------------------------------------------
-- Table: meetings
--------------------------------------------------------------------------------
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'Daily Operations Meeting (DOM)',
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  google_meet_url VARCHAR(500),
  external_conference_id VARCHAR(100),
  qr_secret_salt VARCHAR(100) NOT NULL DEFAULT uuid_generate_v4()::text,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, ACTIVE, CONCLUDED, CANCELLED
  created_by UUID REFERENCES leaders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meeting_date UNIQUE (meeting_date)
);

--------------------------------------------------------------------------------
-- Table: attendance_records
--------------------------------------------------------------------------------
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  selected_mode attendance_mode NOT NULL DEFAULT 'NONE',
  status attendance_status NOT NULL DEFAULT 'PENDING',
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  first_event_at TIMESTAMPTZ,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  evidence_source VARCHAR(100), -- 'ROOM_QR', 'GOOGLE_MEET_API', 'ADMIN_MANUAL'
  verified_by UUID REFERENCES leaders(id),
  verified_at TIMESTAMPTZ,
  verification_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meeting_leader UNIQUE (meeting_id, leader_id)
);

--------------------------------------------------------------------------------
-- Table: attendance_events
--------------------------------------------------------------------------------
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- QR_SCANNED, PHYSICAL_CHECKIN, VIRTUAL_JOIN_DETECTED, etc.
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) NOT NULL, -- 'MOBILE_WEB', 'ADMIN_PORTAL', 'MEET_SYNC', 'SYSTEM'
  evidence_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: leave_requests
--------------------------------------------------------------------------------
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) NOT NULL, -- 'CASUAL', 'MEDICAL', 'CONFERENCE', 'OFFICIAL_DUTY'
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID REFERENCES leaders(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

--------------------------------------------------------------------------------
-- Table: attendance_exceptions
--------------------------------------------------------------------------------
CREATE TABLE attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  exception_type VARCHAR(50) NOT NULL, -- 'CLINICAL_EMERGENCY', 'OT_DUTY', 'OFFICIAL_TRAVEL'
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  approved_by UUID NOT NULL REFERENCES leaders(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: reminder_jobs
--------------------------------------------------------------------------------
CREATE TABLE reminder_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES leaders(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status job_status NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(150) NOT NULL UNIQUE,
  provider_message_id VARCHAR(150),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: notification_logs
--------------------------------------------------------------------------------
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES reminder_jobs(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL, -- 'WHATSAPP', 'EMAIL'
  recipient VARCHAR(255) NOT NULL,
  template_name VARCHAR(100),
  provider_response JSONB,
  delivery_status VARCHAR(50) NOT NULL, -- 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: admin_audit_logs
--------------------------------------------------------------------------------
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES leaders(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  reason TEXT NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Table: integration_settings
--------------------------------------------------------------------------------
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES leaders(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- Indices for Performance and Real-time Filtering
--------------------------------------------------------------------------------
CREATE INDEX idx_meetings_date ON meetings (meeting_date);
CREATE INDEX idx_attendance_meeting_status ON attendance_records (meeting_id, status);
CREATE INDEX idx_attendance_leader ON attendance_records (leader_id);
CREATE INDEX idx_events_attendance ON attendance_events (attendance_record_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests (start_date, end_date, status);
CREATE INDEX idx_reminder_jobs_pending ON reminder_jobs (scheduled_at, status);
CREATE INDEX idx_audit_logs_actor ON admin_audit_logs (actor_id, created_at DESC);
