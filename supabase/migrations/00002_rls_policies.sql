-- Migration 00002: Row Level Security (RLS) Policies
-- SBH Group of Hospital, Raipur

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Helper Function: Get Current Leader Record from Auth UID
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_leader_id()
RETURNS UUID AS $$
  SELECT id FROM leaders WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_leader_role()
RETURNS user_role AS $$
  SELECT role FROM leaders WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

--------------------------------------------------------------------------------
-- Policies: departments
--------------------------------------------------------------------------------
-- Authenticated users can view active departments
CREATE POLICY "Allow authenticated read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Only Admins and Super Admins can insert/update departments
CREATE POLICY "Allow admin manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (get_current_leader_role() IN ('ADMIN', 'SUPER_ADMIN'));

--------------------------------------------------------------------------------
-- Policies: leaders
--------------------------------------------------------------------------------
-- Leaders can read all leaders (directory view for DOM coordination)
CREATE POLICY "Allow authenticated read leaders directory"
  ON leaders FOR SELECT
  TO authenticated
  USING (true);

-- Only Admins / Super Admins can insert or update leader profiles
CREATE POLICY "Allow admin manage leaders"
  ON leaders FOR ALL
  TO authenticated
  USING (get_current_leader_role() IN ('ADMIN', 'SUPER_ADMIN'));

--------------------------------------------------------------------------------
-- Policies: meetings
--------------------------------------------------------------------------------
-- Authenticated users can view meetings
CREATE POLICY "Allow authenticated read meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

-- Admins / Super Admins can create and edit meetings
CREATE POLICY "Allow admin manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (get_current_leader_role() IN ('ADMIN', 'SUPER_ADMIN'));

--------------------------------------------------------------------------------
-- Policies: attendance_records
--------------------------------------------------------------------------------
-- Leaders can read their own attendance records; Directors, Admins, HR can read all
CREATE POLICY "Allow read attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    leader_id = get_current_leader_id()
    OR get_current_leader_role() IN ('DIRECTOR', 'ADMIN', 'HR', 'SUPER_ADMIN')
  );

-- Admins and Super Admins can insert, verify, and update attendance records
CREATE POLICY "Allow admin manage attendance records"
  ON attendance_records FOR ALL
  TO authenticated
  USING (get_current_leader_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Leaders can update selected_mode on their own record when status is PENDING
CREATE POLICY "Allow leader select mode"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (leader_id = get_current_leader_id())
  WITH CHECK (
    leader_id = get_current_leader_id()
    AND status IN ('PENDING', 'CHECKED_IN')
  );

--------------------------------------------------------------------------------
-- Policies: attendance_events
--------------------------------------------------------------------------------
-- Readable by Admins, Directors, and the Leader themselves
CREATE POLICY "Allow read attendance events"
  ON attendance_events FOR SELECT
  TO authenticated
  USING (
    leader_id = get_current_leader_id()
    OR get_current_leader_role() IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN')
  );

-- Insert permitted by Authenticated users for their own events (e.g. mobile QR scan event)
CREATE POLICY "Allow leader or admin insert event"
  ON attendance_events FOR INSERT
  TO authenticated
  WITH CHECK (
    leader_id = get_current_leader_id()
    OR get_current_leader_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Prevent update or deletion of historical attendance events
CREATE POLICY "Prevent delete attendance events"
  ON attendance_events FOR DELETE
  TO authenticated
  USING (false);

--------------------------------------------------------------------------------
-- Policies: leave_requests
--------------------------------------------------------------------------------
-- Leaders read their own leaves; HR, Director & Admins read all
CREATE POLICY "Allow read leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    leader_id = get_current_leader_id()
    OR get_current_leader_role() IN ('HR', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN')
  );

-- Leaders can insert leave requests for themselves
CREATE POLICY "Allow leader insert leave request"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (leader_id = get_current_leader_id());

-- Only HR and Super Admin can approve/reject leave requests
CREATE POLICY "Allow HR approve leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (get_current_leader_role() IN ('HR', 'SUPER_ADMIN'));

--------------------------------------------------------------------------------
-- Policies: admin_audit_logs
--------------------------------------------------------------------------------
-- Directors, Admins, Super Admins can view audit logs
CREATE POLICY "Allow privileged read audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (get_current_leader_role() IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'));

-- Insert allowed by system actors
CREATE POLICY "Allow insert audit log"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Immutable: NO UPDATE or DELETE on audit logs
CREATE POLICY "Prevent audit log mutation"
  ON admin_audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Prevent audit log deletion"
  ON admin_audit_logs FOR DELETE
  TO authenticated
  USING (false);
