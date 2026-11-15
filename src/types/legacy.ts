// Backward compatibility exports for legacy types
export * from './database';

export interface Meeting {
  id: string;
  meeting_date: string;
  title: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  timezone: string;
  google_meet_url?: string;
  external_conference_id?: string;
  qr_secret_salt: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CONCLUDED' | 'CANCELLED';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  reason: string;
  ip_address?: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  leader_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: any;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  leader?: any;
}

export interface DashboardMetrics {
  totalScheduled: number;
  verifiedPhysical: number;
  verifiedVirtual: number;
  pendingPhysicalVerification: number;
  pendingVirtualVerification: number;
  approvedLeave: number;
  approvedExceptions: number;
  unresolvedCount: number;
  rejectedCount: number;
  notificationFailures: number;
}
