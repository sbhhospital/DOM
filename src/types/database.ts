export type UserRole = 'DIRECTOR' | 'ADMIN' | 'HR' | 'LEADER' | 'SUPER_ADMIN';

export type AttendanceMode = 'PHYSICAL' | 'VIRTUAL' | 'NONE';

export type AttendanceStatus =
  | 'PENDING'
  | 'CHECKED_IN'
  | 'PRESENT'
  | 'ABSENT'
  | 'LEAVE'
  | 'INFORMED_ABSENT'
  | 'INFORMED_LATE'
  | 'EXCUSED'
  | 'REJECTED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type MeetingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';

export type CadenceType = 'DOM' | 'WOM' | 'MOM' | 'HOLIDAY';

export interface Department {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
  leader_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Leader {
  id: string;
  full_name: string;
  email: string; // Official domain: @sbhhospital.com
  phone: string;
  password?: string; // User personal password for self login
  department_id?: string;
  role: UserRole;
  employee_code?: string;
  expected_mode: AttendanceMode;
  is_active: boolean;
  department?: Department;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingSchedule {
  id: string;
  meeting_date: string; // YYYY-MM-DD
  frequency: MeetingFrequency;
  cadence?: CadenceType; // DOM | WOM | MOM | HOLIDAY
  title: string;
  scheduled_time: string; // e.g. "10:00 AM"
  is_holiday_or_shifted: boolean;
  shift_reason?: string;
  google_meet_url: string;
  agenda?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  meeting_id: string;
  meeting_date?: string; // YYYY-MM-DD
  meeting_frequency?: MeetingFrequency;
  cadence?: CadenceType;
  leader_id: string;
  leader?: Leader;
  selected_mode: AttendanceMode;
  status: AttendanceStatus;
  verification_status: VerificationStatus;
  first_event_at?: string;
  check_in_at?: string;
  evidence_source?: string; // 'ROOM_STATIC_QR', 'GOOGLE_MEET_REDIRECT', 'ADMIN_MANUAL', 'INFORMED_LEAVE', 'INFORMED_LATE'
  informed_to_person?: string; // If user informed someone before absenting or being late
  informed_reason?: string;
  informed_confirmed?: boolean; // Verified by Admin
  admin_verified_attendance?: boolean;
  late_minutes?: number; // e.g. 10, 15, 20, 30, 45, 60
  is_late?: boolean;
  expected_arrival_time?: string; // e.g. "10:10 AM", "10:30 AM"
  late_reason?: string;
  late_approved_by_admin?: boolean; // Admin approval required
  verification_note?: string;
  virtual_clicks_count?: number; // Tracks link clicks user-wise & date-wise
  last_click_at?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  qr_scanned_at?: string;
  verified_by?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppSettings {
  director_whatsapp: string;
  director_name: string;
  admin_whatsapp_group: string;
  google_meet_url: string;
  allowed_domain: string;
  conference_room_name: string;
  // CEOITBOX WhatsApp API Gateway Credentials
  ceoitbox_enabled: boolean;
  ceoitbox_username: string;
  ceoitbox_password: string;
  ceoitbox_api_url: string;
  // Google Drive & Google Sheet Automation Pipeline
  google_drive_folder_id?: string;
  google_drive_folder_url?: string;
  google_sheet_webhook_url?: string;
  // Hospital 5th Floor Geofence Configuration
  hospital_latitude?: number;
  hospital_longitude?: number;
  hospital_radius_meters?: number;
  hospital_geofence_enabled?: boolean;
}
