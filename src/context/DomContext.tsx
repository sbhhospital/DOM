import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AttendanceRecord,
  Meeting,
  AdminAuditLog,
  LeaveRequest,
  DashboardMetrics,
  AttendanceMode,
} from '../types/legacy';
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_MEETING,
  INITIAL_AUDIT_LOGS,
  INITIAL_LEAVE_REQUESTS,
} from '../data/initialData';
import { useAuth } from './AuthContext';

interface DomContextType {
  meeting: Meeting;
  attendanceRecords: AttendanceRecord[];
  auditLogs: AdminAuditLog[];
  leaveRequests: LeaveRequest[];
  metrics: DashboardMetrics;
  qrToken: string;
  qrSecondsRemaining: number;
  verifyPhysicalCheckIn: (recordId: string, note?: string) => void;
  rejectPhysicalCheckIn: (recordId: string, reason: string) => void;
  processQrScan: (leaderId: string, token: string) => { success: boolean; message: string };
  selectAttendanceMode: (leaderId: string, mode: AttendanceMode) => void;
  reconcileGoogleMeet: () => void;
  triggerScheduledReminders: (type: '1000' | '1005' | '1020') => { count: number; message: string };
  submitLeaveRequest: (startDate: string, endDate: string, leaveType: string, reason: string) => void;
  approveLeaveRequest: (requestId: string) => void;
  rejectLeaveRequest: (requestId: string, reason: string) => void;
  notificationLog: Array<{ id: string; time: string; type: string; recipient: string; channel: string; status: string }>;
}

const DomContext = createContext<DomContextType | undefined>(undefined);

export const DomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLeader } = useAuth();
  const [meeting, setMeeting] = useState<Meeting>(INITIAL_MEETING);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('sbh_dom_attendance_records');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_RECORDS;
  });
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    const saved = localStorage.getItem('sbh_dom_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('sbh_dom_leave_requests');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });
  const [notificationLog, setNotificationLog] = useState<
    Array<{ id: string; time: string; type: string; recipient: string; channel: string; status: string }>
  >([
    {
      id: 'notif-1',
      time: '10:00:02 AM',
      type: 'INITIAL_1000',
      recipient: 'All Pending Leaders (9)',
      channel: 'WHATSAPP',
      status: 'DELIVERED',
    },
    {
      id: 'notif-2',
      time: '10:05:01 AM',
      type: 'FOLLOWUP_1005',
      recipient: 'Unresolved Leaders (5)',
      channel: 'WHATSAPP',
      status: 'DELIVERED',
    },
  ]);

  // Dynamic Rotating QR Code Token Engine (Refreshes every 30 seconds)
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(30);
  const [qrToken, setQrToken] = useState<string>(() => generateDynamicToken(meeting.id, meeting.qr_secret_salt));

  function generateDynamicToken(meetingId: string, salt: string): string {
    const windowSlot = Math.floor(Date.now() / 30000);
    return `SBH-DOM-${meetingId}-${windowSlot}-${salt.slice(0, 8)}`;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setQrSecondsRemaining((prev) => {
        if (prev <= 1) {
          setQrToken(generateDynamicToken(meeting.id, meeting.qr_secret_salt));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting.id, meeting.qr_secret_salt]);

  // Persist state to local storage
  useEffect(() => {
    localStorage.setItem('sbh_dom_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('sbh_dom_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('sbh_dom_leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  // Calculate Metrics from Database Records
  const metrics: DashboardMetrics = {
    totalScheduled: attendanceRecords.length,
    verifiedPhysical: attendanceRecords.filter(
      (r) => r.selected_mode === 'PHYSICAL' && r.status === 'PRESENT' && r.verification_status === 'VERIFIED'
    ).length,
    verifiedVirtual: attendanceRecords.filter(
      (r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT' && r.verification_status === 'VERIFIED'
    ).length,
    pendingPhysicalVerification: attendanceRecords.filter(
      (r) => r.selected_mode === 'PHYSICAL' && r.status === 'CHECKED_IN' && r.verification_status === 'PENDING'
    ).length,
    pendingVirtualVerification: attendanceRecords.filter(
      (r) => r.selected_mode === 'VIRTUAL' && r.status === 'CHECKED_IN' && r.verification_status === 'PENDING'
    ).length,
    approvedLeave: attendanceRecords.filter((r) => r.status === 'LEAVE').length,
    approvedExceptions: attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
    unresolvedCount: attendanceRecords.filter((r) => r.status === 'PENDING').length,
    rejectedCount: attendanceRecords.filter((r) => r.status === 'REJECTED' || r.verification_status === 'REJECTED').length,
    notificationFailures: 0,
  };

  // QR Scan Check-in Action
  const processQrScan = (leaderId: string, token: string): { success: boolean; message: string } => {
    // 1. Validate Token Structure
    if (!token.startsWith('SBH-DOM-')) {
      return { success: false, message: 'Invalid QR code. Please scan the official DOM meeting QR.' };
    }

    const targetRecord = attendanceRecords.find((r) => r.leader_id === leaderId && r.meeting_id === meeting.id);
    if (!targetRecord) {
      return { success: false, message: 'Leader not scheduled for this Daily Operations Meeting.' };
    }

    if (targetRecord.status === 'PRESENT' && targetRecord.verification_status === 'VERIFIED') {
      return { success: false, message: 'You have already checked in and your presence is verified.' };
    }

    if (targetRecord.status === 'CHECKED_IN') {
      return { success: true, message: 'Check-in registered. Awaiting Admin visual verification.' };
    }

    const now = new Date().toISOString();
    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.leader_id === leaderId) {
          return {
            ...rec,
            selected_mode: 'PHYSICAL',
            status: 'CHECKED_IN',
            verification_status: 'PENDING',
            check_in_at: now,
            first_event_at: rec.first_event_at || now,
            evidence_source: 'ROOM_QR',
          };
        }
        return rec;
      })
    );

    // Add Audit Log
    const targetLeader = targetRecord.leader;
    const newLog: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      actor_id: leaderId,
      actor_name: targetLeader?.full_name || 'Leader',
      action: 'PHYSICAL_QR_SCANNED',
      entity_type: 'ATTENDANCE_RECORD',
      entity_id: targetRecord.id,
      reason: 'Physical in-room dynamic QR scan submitted from mobile browser.',
      created_at: now,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    return { success: true, message: 'Physical check-in registered! Admin will verify your in-room presence.' };
  };

  // Admin Physical Presence Verification
  const verifyPhysicalCheckIn = (recordId: string, note?: string) => {
    const now = new Date().toISOString();
    let updatedLeaderName = '';
    const actorId = currentLeader?.id || 'admin-system';
    const actorName = currentLeader ? `${currentLeader.full_name} (${currentLeader.role})` : 'DOM Administrator';

    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          updatedLeaderName = rec.leader?.full_name || 'Leader';
          return {
            ...rec,
            status: 'PRESENT',
            verification_status: 'VERIFIED',
            verified_by: actorId,
            verified_at: now,
            verification_note: note || 'Confirmed physically present in DOM Conference Hall by Admin.',
          };
        }
        return rec;
      })
    );

    // Audit Log
    const newLog: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      action: 'ADMIN_VERIFIED_PHYSICAL_ATTENDANCE',
      entity_type: 'ATTENDANCE_RECORD',
      entity_id: recordId,
      reason: note || `Verified physical in-room attendance for ${updatedLeaderName}.`,
      created_at: now,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Admin Physical Check-in Rejection
  const rejectPhysicalCheckIn = (recordId: string, reason: string) => {
    const now = new Date().toISOString();
    let updatedLeaderName = '';
    const actorId = currentLeader?.id || 'admin-system';
    const actorName = currentLeader ? `${currentLeader.full_name} (${currentLeader.role})` : 'DOM Administrator';

    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          updatedLeaderName = rec.leader?.full_name || 'Leader';
          return {
            ...rec,
            status: 'REJECTED',
            verification_status: 'REJECTED',
            verified_by: actorId,
            verified_at: now,
            verification_note: `Rejected: ${reason}`,
          };
        }
        return rec;
      })
    );

    const newLog: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      action: 'ADMIN_REJECTED_PHYSICAL_CHECKIN',
      entity_type: 'ATTENDANCE_RECORD',
      entity_id: recordId,
      reason: `Physical check-in rejected for ${updatedLeaderName}. Reason: ${reason}`,
      created_at: now,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Personal Portal Attendance Mode Selection
  const selectAttendanceMode = (leaderId: string, mode: AttendanceMode) => {
    const now = new Date().toISOString();
    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.leader_id === leaderId) {
          return {
            ...rec,
            selected_mode: mode,
            first_event_at: rec.first_event_at || now,
            status: mode === 'VIRTUAL' ? 'CHECKED_IN' : rec.status,
            verification_status: mode === 'VIRTUAL' ? 'PENDING' : rec.verification_status,
            evidence_source: mode === 'VIRTUAL' ? 'VIRTUAL_PORTAL_JOIN' : rec.evidence_source,
          };
        }
        return rec;
      })
    );
  };

  // Google Meet Participant Reconciliation
  const reconcileGoogleMeet = () => {
    const now = new Date().toISOString();
    const actorId = currentLeader?.id || 'system';
    const actorName = currentLeader ? `${currentLeader.full_name} (${currentLeader.role})` : 'System Reconciliation';

    // Reconcile leaders who selected VIRTUAL
    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.selected_mode === 'VIRTUAL' && rec.status === 'CHECKED_IN') {
          return {
            ...rec,
            status: 'PRESENT',
            verification_status: 'VERIFIED',
            verified_at: now,
            evidence_source: 'GOOGLE_MEET_API',
            verification_note: 'Verified via Google Meet API (Matched registered Workspace email, 30+ mins)',
          };
        }
        return rec;
      })
    );

    const newLog: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      action: 'GOOGLE_MEET_RECONCILIATION_RUN',
      entity_type: 'MEETING',
      entity_id: meeting.id,
      reason: 'Automated participant log reconciliation against hospital Google Workspace accounts.',
      created_at: now,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Scheduled Reminder Trigger
  const triggerScheduledReminders = (type: '1000' | '1005' | '1020') => {
    const unresolved = attendanceRecords.filter((r) => r.status === 'PENDING');
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let label = '';
    if (type === '1000') label = 'INITIAL_1000 (10:00 AM)';
    else if (type === '1005') label = 'FOLLOWUP_1005 (10:05 AM)';
    else label = 'ESCALATION_1020 (10:20 AM Group Escalation)';

    const newEntry = {
      id: `notif-${Date.now()}`,
      time: timeStr,
      type: label,
      recipient: type === '1020' ? 'SBH DOM Executive Group' : `${unresolved.length} Unresolved Leaders`,
      channel: 'WHATSAPP',
      status: 'DELIVERED',
    };

    setNotificationLog((prev) => [newEntry, ...prev]);

    return {
      count: unresolved.length,
      message: `Dispatched ${label} to ${type === '1020' ? 'Executive Group' : `${unresolved.length} leaders`}.`,
    };
  };

  // Leave Management Handlers
  const submitLeaveRequest = (startDate: string, endDate: string, leaveType: string, reason: string) => {
    const now = new Date().toISOString();
    const leaderId = currentLeader?.id || 'l-applicant';
    const newReq: LeaveRequest = {
      id: `leave-${Date.now()}`,
      leader_id: leaderId,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      reason,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
      leader: currentLeader || undefined,
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
  };

  const approveLeaveRequest = (requestId: string) => {
    const now = new Date().toISOString();
    let targetLeaderId = '';
    const approverId = currentLeader?.id || 'hr-admin';

    setLeaveRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          targetLeaderId = req.leader_id;
          return {
            ...req,
            status: 'APPROVED',
            approved_by: approverId,
            approved_at: now,
          };
        }
        return req;
      })
    );

    // If today is covered by leave, update attendance record to LEAVE
    if (targetLeaderId) {
      setAttendanceRecords((prev) =>
        prev.map((rec) => {
          if (rec.leader_id === targetLeaderId) {
            return {
              ...rec,
              status: 'LEAVE',
              verification_status: 'VERIFIED',
              evidence_source: 'HR_APPROVED_LEAVE',
              verification_note: 'Official Leave Approved by HR',
            };
          }
          return rec;
        })
      );
    }
  };

  const rejectLeaveRequest = (requestId: string, reason: string) => {
    const now = new Date().toISOString();
    const rejectorId = currentLeader?.id || 'hr-admin';
    setLeaveRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'REJECTED',
            approved_by: rejectorId,
            approved_at: now,
            rejection_reason: reason,
          };
        }
        return req;
      })
    );
  };

  return (
    <DomContext.Provider
      value={{
        meeting,
        attendanceRecords,
        auditLogs,
        leaveRequests,
        metrics,
        qrToken,
        qrSecondsRemaining,
        verifyPhysicalCheckIn,
        rejectPhysicalCheckIn,
        processQrScan,
        selectAttendanceMode,
        reconcileGoogleMeet,
        triggerScheduledReminders,
        submitLeaveRequest,
        approveLeaveRequest,
        rejectLeaveRequest,
        notificationLog,
      }}
    >
      {children}
    </DomContext.Provider>
  );
};

export const useDom = () => {
  const context = useContext(DomContext);
  if (!context) {
    throw new Error('useDom must be used within a DomProvider');
  }
  return context;
};
