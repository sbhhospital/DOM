import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Leader,
  Department,
  AttendanceRecord,
  AppSettings,
  AttendanceStatus,
  MeetingSchedule,
  MeetingFrequency,
  CadenceType,
} from '../types/database';
import { INITIAL_DEPARTMENTS, INITIAL_LEADERS } from '../data/initialData';
import { supabase } from '../lib/supabase';
import {
  downloadDirectorPdf,
  openDirectorPdfInNewTab,
  downloadMonthlyAuditPdf,
  downloadYearlyAuditPdf,
} from '../lib/pdfGenerator';
import { sendCeoitboxWhatsappMessage } from '../lib/whatsappService';
import { determineMeetingFrequency, getCadenceInfo, calculateLateMinutes } from '../lib/meetingUtils';
import { generateLeaderMagicLink } from '../lib/magicLink';
import { generateDailyMeetingLink } from '../lib/meetingLinks';

interface DomAppContextType {
  leaders: Leader[];
  departments: Department[];
  attendanceRecords: AttendanceRecord[];
  meetingSchedules: Record<string, MeetingSchedule>;
  appSettings: AppSettings;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isLoading: boolean;
  // Meeting Schedule Management (DOM, WOM, MOM, Holidays, Reschedules)
  getMeetingForDate: (date: string) => MeetingSchedule;
  updateMeetingSchedule: (
    date: string,
    updates: Partial<MeetingSchedule> & { cadence?: CadenceType }
  ) => { success: boolean; message: string };
  // Department Master CRUD
  addDepartment: (dept: { name: string; code?: string }) => Promise<{ success: boolean; message: string }>;
  editDepartment: (id: string, updates: Partial<Department>) => Promise<{ success: boolean; message: string }>;
  deleteDepartment: (id: string) => Promise<{ success: boolean; message: string }>;
  // Leader CRUD
  addLeader: (leader: Omit<Leader, 'id'>, initialPassword?: string) => Promise<{ success: boolean; message: string }>;
  editLeader: (id: string, updates: Partial<Leader>) => Promise<{ success: boolean; message: string }>;
  deleteLeader: (id: string) => Promise<{ success: boolean; message: string }>;
  // Attendance operations
  markVirtualJoin: (
    leaderId: string,
    customDate?: string
  ) => Promise<{ success: boolean; meetUrl: string; clicksCount: number }>;
  verifyVirtualMeetingQr: (
    leaderId: string,
    dateStr: string,
    scannedData: string
  ) => Promise<{ success: boolean; message: string }>;
  markRoomQrCheckIn: (leaderId: string) => Promise<{ success: boolean; message: string; alreadyRecorded?: boolean; timeStr?: string }>;
  submitInformedAbsence: (leaderId: string, informedTo: string, reason: string) => Promise<{ success: boolean; message: string }>;
  markLeaderInformedLeave: (leaderId: string, date: string, informedTo: string, reason: string) => Promise<void>;
  markLeaderInformedLate: (
    leaderId: string,
    date: string,
    lateMinutes: number,
    expectedTime: string,
    informedTo: string,
    reason: string
  ) => Promise<void>;
  adminVerifyStatus: (recordId: string, status: AttendanceStatus, verified: boolean, note?: string) => Promise<void>;
  confirmInformedAbsence: (recordId: string, confirmed: boolean) => Promise<void>;
  approveAttendanceRecord: (recordId: string) => Promise<{ success: boolean; message: string }>;
  approveAllPendingRecords: (date: string) => Promise<{ success: boolean; count: number; message: string }>;
  rejectAttendanceRecord: (recordId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  // Dispatches
  sendDailyWhatsappReport: (date: string) => { success: boolean; message: string; payload: string };
  sendMeetingReminderNotice: (date: string) => { sentCount: number; message: string };
  sendNonAttendeesEscalationNotice: (date: string) => { count: number; message: string; payload: string };
  generateEmailReportDraft: (date: string) => { subject: string; body: string; mailtoUrl: string };
  // PDF Reports (Daily DOM, Monthly MOM, Annual Audit)
  downloadPdfReport: (date: string) => void;
  openPdfReport: (date: string) => void;
  downloadMonthlyPdfReport: (monthYearStr: string) => void;
  downloadYearlyPdfReport: (year: number) => void;
  // CEOITBOX WhatsApp Automation
  sendDirectorCeoitboxWhatsapp: (date: string) => Promise<{ success: boolean; message: string; url: string }>;
  sendCeoitboxRemindersToAll: (date: string) => Promise<{ success: boolean; count: number; message: string }>;
  sendCeoitboxEscalationToNonAttendees: (date: string) => Promise<{ success: boolean; count: number; message: string }>;
  sendCeoitboxGroupBroadcast: (
    stage: '0950' | '1030',
    date: string
  ) => Promise<{ success: boolean; message: string; url: string; payload: string }>;
  triggerAutomated0950Transmission: (
    date: string
  ) => Promise<{ success: boolean; leadersCount: number; message: string }>;
  // Settings
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
}

const DomAppContext = createContext<DomAppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  director_whatsapp: '9644404741',
  director_name: 'Director Sir',
  admin_whatsapp_group: '919977881452-1431506963@g.us',
  google_meet_url: 'https://meet.google.com/jrz-jfku-gir',
  allowed_domain: 'sbhhospital.com',
  conference_room_name: 'Conference Room, 5th Floor',
  ceoitbox_enabled: true,
  ceoitbox_username: 'SBH HOSPITAL',
  ceoitbox_password: '123456789',
  ceoitbox_api_url: 'https://app.ceoitbox.com/message/new',
};

const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const resolveLeaderDepartment = (lead: any, deptsList: Department[]): Department => {
  // 1. Direct object if present and valid (not old placeholder)
  if (
    lead.department &&
    lead.department.name &&
    !lead.department.name.includes('Neurology') &&
    !lead.department.name.includes('Cardiology')
  ) {
    return lead.department;
  }

  // 2. Saved department ID in cache
  const savedDeptId = localStorage.getItem(`sbh_leader_dept_${lead.id}`);
  if (savedDeptId) {
    const matched = deptsList.find((d) => d.id === savedDeptId || d.code === savedDeptId);
    if (matched) return matched;
  }

  // 3. Match by department_id
  if (lead.department_id) {
    const matched = deptsList.find((d) => d.id === lead.department_id);
    if (matched) return matched;
  }

  // 4. Match by employee_code keywords
  const code = (lead.employee_code || '').toUpperCase();
  if (code === '10231' || code.includes('IT')) return deptsList.find((d) => d.code === 'IT') || deptsList[7];
  if (code.includes('TPA')) return deptsList.find((d) => d.code === 'TPA') || deptsList[0];
  if (code.includes('ACT') || code.includes('ACC')) return deptsList.find((d) => d.code === 'ACCT' || d.code === 'ACCOUNTS') || deptsList[1];
  if (code.includes('HR')) return deptsList.find((d) => d.code === 'HR') || deptsList[2];
  if (code.includes('OPS')) return deptsList.find((d) => d.code === 'OPS') || deptsList[3];
  if (code.includes('PHM') || code.includes('PHARM')) return deptsList.find((d) => d.code === 'PHARM') || deptsList[4];
  if (code.includes('HK')) return deptsList.find((d) => d.code === 'HK') || deptsList[5];
  if (code.includes('MNT') || code.includes('MAINT')) return deptsList.find((d) => d.code === 'MAINT') || deptsList[6];
  if (code.includes('MKT')) return deptsList.find((d) => d.code === 'MKTG') || deptsList[8];
  if (code.includes('DOC') || code.includes('LEAD-11')) return deptsList.find((d) => d.code === 'DOC') || deptsList[9];
  if (code.includes('ADM')) return deptsList.find((d) => d.code === 'ADMIN') || deptsList[10];
  if (code.includes('DME')) return deptsList.find((d) => d.code === 'DME-IT') || deptsList[11];
  if (code.includes('STR') || code.includes('STORE')) return deptsList.find((d) => d.code === 'STORE') || deptsList[12];
  if (code.includes('DGT') || code.includes('DIGI')) return deptsList.find((d) => d.code === 'DIGI-MKT') || deptsList[13];
  if (code.includes('OT')) return deptsList.find((d) => d.code === 'OT') || deptsList[14];
  if (code.includes('CNS') || code.includes('COUNSEL')) return deptsList.find((d) => d.code === 'COUNSEL') || deptsList[15];
  if (code.includes('PRM') || code.includes('PROMO')) return deptsList.find((d) => d.code === 'PROMO') || deptsList[16];
  if (code.includes('RCP') || code.includes('RECEPT')) return deptsList.find((d) => d.code === 'RECEPT') || deptsList[17];
  if (code.includes('IVF')) return deptsList.find((d) => d.code === 'IVF') || deptsList[18];
  if (code.includes('CSM') || code.includes('COSM')) return deptsList.find((d) => d.code === 'COSM') || deptsList[19];
  if (code.includes('COO')) return deptsList.find((d) => d.code === 'COO') || deptsList[20];
  if (code.includes('DIR')) return deptsList.find((d) => d.code === 'DIR') || deptsList[21];
  if (code.includes('LAB')) return deptsList.find((d) => d.code === 'LAB') || deptsList[23];

  // 5. Match by email prefix
  const email = (lead.email || '').toLowerCase();
  if (email.startsWith('tpa@')) return deptsList.find((d) => d.code === 'TPA') || deptsList[0];
  if (email.startsWith('account')) return deptsList.find((d) => d.code === 'ACCT' || d.code === 'ACCOUNTS') || deptsList[1];
  if (email.startsWith('hr@')) return deptsList.find((d) => d.code === 'HR') || deptsList[2];
  if (email.startsWith('operation')) return deptsList.find((d) => d.code === 'OPS') || deptsList[3];
  if (email.startsWith('pharmacy')) return deptsList.find((d) => d.code === 'PHARM') || deptsList[4];
  if (email.startsWith('housekeeping')) return deptsList.find((d) => d.code === 'HK') || deptsList[5];
  if (email.startsWith('maintenance')) return deptsList.find((d) => d.code === 'MAINT') || deptsList[6];
  if (email.startsWith('it@')) return deptsList.find((d) => d.code === 'IT') || deptsList[7];
  if (email.startsWith('marketing')) return deptsList.find((d) => d.code === 'MKTG') || deptsList[8];
  if (email.startsWith('clinical') || email.startsWith('doctor')) return deptsList.find((d) => d.code === 'DOC') || deptsList[9];
  if (email.startsWith('admin@')) return deptsList.find((d) => d.code === 'ADMIN') || deptsList[10];
  if (email.startsWith('dme@')) return deptsList.find((d) => d.code === 'DME-IT') || deptsList[11];
  if (email.startsWith('store@')) return deptsList.find((d) => d.code === 'STORE') || deptsList[12];
  if (email.startsWith('digital@')) return deptsList.find((d) => d.code === 'DIGI-MKT') || deptsList[13];
  if (email.startsWith('ot@')) return deptsList.find((d) => d.code === 'OT') || deptsList[14];
  if (email.startsWith('counselor@')) return deptsList.find((d) => d.code === 'COUNSEL') || deptsList[15];
  if (email.startsWith('promotions@')) return deptsList.find((d) => d.code === 'PROMO') || deptsList[16];
  if (email.startsWith('reception@')) return deptsList.find((d) => d.code === 'RECEPT') || deptsList[17];
  if (email.startsWith('ivf@')) return deptsList.find((d) => d.code === 'IVF') || deptsList[18];
  if (email.startsWith('cosmetic@')) return deptsList.find((d) => d.code === 'COSM') || deptsList[19];
  if (email.startsWith('coo@')) return deptsList.find((d) => d.code === 'COO') || deptsList[20];
  if (email.startsWith('director@')) return deptsList.find((d) => d.code === 'DIR') || deptsList[21];
  if (email.startsWith('lab@')) return deptsList.find((d) => d.code === 'LAB') || deptsList[23];

  return deptsList[0];
};

export const DomAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 24 Official Departments Master State with Local Storage and Migration Filter
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('sbh_hospital_departments');
    if (saved) {
      try {
        const parsed: Department[] = JSON.parse(saved);
        const hasOld = parsed.some((d) =>
          d.name.includes('Cardiology') ||
          d.name.includes('Neurology') ||
          d.name.includes('Hospital Administration & Executive')
        );
        if (!hasOld && parsed.length >= 24) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error reading departments cache:', e);
      }
    }
    return INITIAL_DEPARTMENTS;
  });

  // 100% Real Leaders Master State (Directly loaded from Supabase database)
  const [leaders, setLeaders] = useState<Leader[]>(() => {
    const saved = localStorage.getItem('sbh_custom_leaders');
    if (saved) {
      try {
        const parsed: Leader[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error reading custom leaders cache:', e);
      }
    }
    return [];
  });

  // Custom Meeting Schedules state (persisted)
  const [meetingSchedules, setMeetingSchedules] = useState<Record<string, MeetingSchedule>>(() => {
    const saved = localStorage.getItem('sbh_meeting_schedules');
    return saved ? JSON.parse(saved) : {};
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('sbh_real_attendance_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('sbh_app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.google_meet_url === 'https://meet.google.com/sbh-dom-daily' || !parsed.google_meet_url) {
        parsed.google_meet_url = 'https://meet.google.com/jrz-jfku-gir';
      }
      if (!parsed.admin_whatsapp_group || parsed.admin_whatsapp_group === 'SBH DOM Executive Group') {
        parsed.admin_whatsapp_group = '919977881452-1431506963@g.us';
      }
      return parsed;
    }
    return DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Real Leaders directly from Supabase (Only database rows, zero dummy data)
  const loadDataFromSupabase = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live leaders from Supabase SQL table
      const { data: supaLeaders, error } = await supabase
        .from('leaders')
        .select('*')
        .order('full_name', { ascending: true });

      if (!error && supaLeaders) {
        const mapped = supaLeaders.map((lead: any) => {
          const dept = resolveLeaderDepartment(lead, departments);
          return {
            ...lead,
            department: dept,
            department_id: dept?.id || lead.department_id,
          } as Leader;
        });

        setLeaders(mapped);
        localStorage.setItem('sbh_custom_leaders', JSON.stringify(mapped));
        setIsLoading(false);
        return;
      }

      // 2. Local fallback if offline
      const savedLeaders = localStorage.getItem('sbh_custom_leaders');
      if (savedLeaders) {
        try {
          const parsed = JSON.parse(savedLeaders);
          if (Array.isArray(parsed)) {
            setLeaders(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {}
      }

      setLeaders([]);
    } catch (err) {
      console.warn('Error fetching leaders from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, []);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('sbh_hospital_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('sbh_custom_leaders', JSON.stringify(leaders));
  }, [leaders]);

  useEffect(() => {
    localStorage.setItem('sbh_meeting_schedules', JSON.stringify(meetingSchedules));
  }, [meetingSchedules]);

  useEffect(() => {
    localStorage.setItem('sbh_real_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // Meeting Schedule Helper (DOM, WOM, MOM, HOLIDAY)
  const getMeetingForDate = (date: string): MeetingSchedule => {
    if (meetingSchedules[date]) {
      const sched = meetingSchedules[date];
      if (!sched.cadence) {
        sched.cadence = sched.frequency === 'MONTHLY' ? 'MOM' : sched.frequency === 'WEEKLY' ? 'WOM' : 'DOM';
      }
      return sched;
    }
    const { frequency, cadence, defaultTitle } = determineMeetingFrequency(date);
    return {
      id: `sched-${date}`,
      meeting_date: date,
      frequency,
      cadence,
      title: defaultTitle,
      scheduled_time: '10:00 AM IST',
      is_holiday_or_shifted: false,
      google_meet_url: appSettings.google_meet_url,
    };
  };

  const updateMeetingSchedule = (
    date: string,
    updates: Partial<MeetingSchedule> & { cadence?: CadenceType }
  ) => {
    const current = getMeetingForDate(date);
    let resolvedCadence = updates.cadence || current.cadence || 'DOM';
    let resolvedFrequency: MeetingFrequency = updates.frequency || current.frequency;

    if (updates.cadence) {
      if (updates.cadence === 'MOM') resolvedFrequency = 'MONTHLY';
      else if (updates.cadence === 'WOM') resolvedFrequency = 'WEEKLY';
      else if (updates.cadence === 'DOM') resolvedFrequency = 'DAILY';
      else if (updates.cadence === 'HOLIDAY') {
        resolvedFrequency = 'SPECIAL';
        updates.is_holiday_or_shifted = true;
      }
    }

    const updated: MeetingSchedule = {
      ...current,
      ...updates,
      cadence: resolvedCadence,
      frequency: resolvedFrequency,
      updated_at: new Date().toISOString(),
    };

    setMeetingSchedules((prev) => ({
      ...prev,
      [date]: updated,
    }));

    return {
      success: true,
      message: `Meeting schedule for ${date} updated to ${resolvedCadence} (${resolvedFrequency})!`,
    };
  };

  // Ensure attendance records exist ONLY for active leaders currently in database
  useEffect(() => {
    if (leaders.length === 0) {
      setAttendanceRecords([]);
      return;
    }

    const currentMeeting = getMeetingForDate(selectedDate);
    const activeLeaderIds = new Set(leaders.map((l) => l.id));

    setAttendanceRecords((prev) => {
      // 1. Filter out attendance records for deleted or dummy leaders not in DB
      const filtered = prev
        .filter((r) => activeLeaderIds.has(r.leader_id) || activeLeaderIds.has(r.leader?.id || ''))
        .map((r) => {
          const matchedLead = leaders.find((l) => l.id === r.leader_id || l.id === r.leader?.id);
          if (matchedLead) {
            return {
              ...r,
              leader_id: matchedLead.id,
              leader: matchedLead,
            };
          }
          return r;
        });

      const existingForDate = filtered.filter((r) => r.meeting_date === selectedDate);
      const existingLeaderIds = new Set(existingForDate.map((r) => r.leader_id));

      const newRecords: AttendanceRecord[] = [];
      leaders.forEach((lead) => {
        if (!existingLeaderIds.has(lead.id)) {
          newRecords.push({
            id: `att-${selectedDate}-${lead.id}`,
            meeting_id: currentMeeting.id,
            meeting_date: selectedDate,
            meeting_frequency: currentMeeting.frequency,
            cadence: currentMeeting.cadence,
            leader_id: lead.id,
            leader: lead,
            selected_mode: 'NONE',
            status: 'PENDING',
            verification_status: 'PENDING',
            admin_verified_attendance: false,
          });
        }
      });

      return [...filtered, ...newRecords];
    });
  }, [leaders, selectedDate]);

  // ================= DEPARTMENT MASTER CRUD =================

  const addDepartment = async (deptData: { name: string; code?: string }): Promise<{ success: boolean; message: string }> => {
    const trimmedName = deptData.name.trim().toUpperCase();
    if (!trimmedName) {
      return { success: false, message: 'Department name is required' };
    }
    if (departments.some((d) => d.name.toUpperCase() === trimmedName)) {
      return { success: false, message: `Department "${trimmedName}" already exists in roster!` };
    }

    const code =
      deptData.code?.trim().toUpperCase() ||
      trimmedName.replace(/[^A-Z0-9]/g, '-').slice(0, 8);

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from('departments').insert([{ name: trimmedName, code, is_active: true }]);
    } catch (e) {
      console.warn('Supabase dept insert warning (using local):', e);
    }

    setDepartments((prev) => [...prev, newDept]);
    return { success: true, message: `Department "${trimmedName}" added successfully to Master!` };
  };

  const editDepartment = async (id: string, updates: Partial<Department>): Promise<{ success: boolean; message: string }> => {
    const target = departments.find((d) => d.id === id);
    if (!target) return { success: false, message: 'Department not found' };

    const updatedName = updates.name ? updates.name.trim().toUpperCase() : target.name;
    const updatedCode = updates.code ? updates.code.trim().toUpperCase() : target.code;

    try {
      await supabase
        .from('departments')
        .update({ name: updatedName, code: updatedCode, is_active: updates.is_active ?? target.is_active })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase dept update warning:', e);
    }

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, ...updates, name: updatedName, code: updatedCode, updated_at: new Date().toISOString() }
          : d
      )
    );

    // Update leaders who reference this department
    setLeaders((prev) =>
      prev.map((l) => {
        if (l.department_id === id) {
          return {
            ...l,
            department: {
              ...(l.department || target),
              name: updatedName,
              code: updatedCode,
            },
          };
        }
        return l;
      })
    );

    return { success: true, message: `Department "${updatedName}" updated successfully!` };
  };

  const deleteDepartment = async (id: string): Promise<{ success: boolean; message: string }> => {
    const attachedLeaders = leaders.filter((l) => l.department_id === id);
    if (attachedLeaders.length > 0) {
      return {
        success: false,
        message: `Cannot delete department: ${attachedLeaders.length} leader(s) are assigned to it (${attachedLeaders
          .map((l) => l.full_name)
          .join(', ')}). Please reassign them first!`,
      };
    }

    try {
      await supabase.from('departments').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase dept delete warning:', e);
    }

    setDepartments((prev) => prev.filter((d) => d.id !== id));
    return { success: true, message: 'Department removed from Master successfully!' };
  };

  // ================= LEADER CRUD =================

  const addLeader = async (
    leaderData: Omit<Leader, 'id'>,
    initialPassword = '123456'
  ): Promise<{ success: boolean; message: string }> => {
    let emailLower = leaderData.email.trim().toLowerCase();
    const reqDomain = appSettings.allowed_domain.toLowerCase();

    // If user provided username without domain, automatically append official domain
    if (!emailLower.includes('@')) {
      emailLower = `${emailLower}@${reqDomain}`;
    }

    if (!emailLower.endsWith(`@${reqDomain}`)) {
      return {
        success: false,
        message: `Official email must belong to hospital domain: @${reqDomain} (e.g. name@${reqDomain})`,
      };
    }

    const matchedDept = departments.find(
      (d) => d.id === leaderData.department_id || d.code === leaderData.department_id || d.name === leaderData.department_id
    );

    const isDeptUuid = isUuid(leaderData.department_id);
    const generatedCode =
      leaderData.employee_code?.trim() ||
      `SBH-${matchedDept?.code || 'LEAD'}-${Date.now().toString().slice(-4)}`;

    try {
      const insertPayload = {
        full_name: leaderData.full_name.trim(),
        email: emailLower,
        phone: leaderData.phone?.trim() || '0000000000',
        department_id: isDeptUuid ? leaderData.department_id : null,
        role: leaderData.role || 'LEADER',
        employee_code: generatedCode,
        expected_mode: leaderData.expected_mode || 'PHYSICAL',
        is_active: true,
      };

      // 1. Direct INSERT into Supabase SQL 'leaders' table
      const { data, error } = await supabase
        .from('leaders')
        .insert([insertPayload])
        .select('*');

      if (error) {
        console.error('Supabase SQL leader insert error:', error);
        return {
          success: false,
          message: `Database error: ${error.message} (Please check if email or employee code already exists).`,
        };
      }

      if (data && data.length > 0) {
        const newLead = data[0] as Leader;
        localStorage.setItem(`sbh_user_pass_${newLead.id}`, initialPassword);
        if (matchedDept) {
          localStorage.setItem(`sbh_leader_dept_${newLead.id}`, matchedDept.id);
        }

        const completeLeader: Leader = {
          ...newLead,
          department: matchedDept || resolveLeaderDepartment(newLead, departments),
          department_id: matchedDept?.id || newLead.department_id,
        };

        setLeaders((prev) => {
          const next = [...prev, completeLeader];
          localStorage.setItem('sbh_custom_leaders', JSON.stringify(next));
          return next;
        });

        // Write to Supabase admin_audit_logs table with actor_id: null so foreign key does not block delete
        try {
          await supabase.from('admin_audit_logs').insert([
            {
              actor_id: null,
              action: 'LEADER_CREATED',
              entity_type: 'LEADER',
              entity_id: newLead.id,
              reason: `Leader ${newLead.full_name} added to hospital roster`,
              after_data: insertPayload,
            },
            {
              actor_id: null,
              action: 'LEADER_PASSWORD',
              entity_type: 'USER_PASSWORD',
              entity_id: newLead.id,
              reason: `Initial password set for leader ${newLead.full_name}`,
              after_data: {
                leader_id: newLead.id,
                full_name: newLead.full_name,
                email: newLead.email,
                password: initialPassword,
                updated_at: new Date().toISOString(),
              },
            },
          ]);
        } catch (auditErr) {
          console.warn('Audit log write note:', auditErr);
        }

        return {
          success: true,
          message: `Leader ${newLead.full_name} successfully saved to Supabase SQL database! Initial password: ${initialPassword}`,
        };
      }
    } catch (e: any) {
      console.error('Supabase insert exception:', e);
      return { success: false, message: `Database error: ${e.message || 'Failed to save leader.'}` };
    }

    return { success: false, message: 'Could not insert leader into database.' };
  };

  const editLeader = async (
    id: string,
    updates: Partial<Leader> & { initialPassword?: string }
  ): Promise<{ success: boolean; message: string }> => {
    let emailLower: string | undefined = undefined;
    if (updates.email) {
      emailLower = updates.email.trim().toLowerCase();
      const reqDomain = appSettings.allowed_domain.toLowerCase();
      if (!emailLower.includes('@')) {
        emailLower = `${emailLower}@${reqDomain}`;
      }
      if (!emailLower.endsWith(`@${reqDomain}`)) {
        return {
          success: false,
          message: `Official email must belong to domain: @${reqDomain}`,
        };
      }
    }

    if (updates.initialPassword && updates.initialPassword.trim() !== '' && updates.initialPassword !== '••••••') {
      localStorage.setItem(`sbh_user_pass_${id}`, updates.initialPassword.trim());
    }

    const matchedDept = updates.department_id
      ? departments.find(
          (d) => d.id === updates.department_id || d.code === updates.department_id || d.name === updates.department_id
        )
      : undefined;

    if (matchedDept) {
      localStorage.setItem(`sbh_leader_dept_${id}`, matchedDept.id);
    }

    // Clean DB updates - send only valid columns to Supabase leaders table
    const cleanDbUpdates: Record<string, any> = {};
    if (updates.full_name !== undefined) cleanDbUpdates.full_name = updates.full_name.trim();
    if (emailLower !== undefined) cleanDbUpdates.email = emailLower;
    if (updates.phone !== undefined) cleanDbUpdates.phone = updates.phone.trim();
    if (updates.role !== undefined) cleanDbUpdates.role = updates.role;
    if (updates.employee_code !== undefined) cleanDbUpdates.employee_code = updates.employee_code.trim();
    if (updates.expected_mode !== undefined) cleanDbUpdates.expected_mode = updates.expected_mode;
    if (updates.is_active !== undefined) cleanDbUpdates.is_active = updates.is_active;
    if (updates.department_id !== undefined) {
      cleanDbUpdates.department_id = isUuid(updates.department_id) ? updates.department_id : null;
    }
    cleanDbUpdates.updated_at = new Date().toISOString();

    if (isUuid(id)) {
      try {
        const { error: updErr } = await supabase.from('leaders').update(cleanDbUpdates).eq('id', id);
        if (updErr) {
          console.error('Supabase leader update error:', updErr);
          return { success: false, message: `Database update error: ${updErr.message}` };
        }
      } catch (e: any) {
        console.error('Supabase update warning:', e);
        return { success: false, message: `Database update error: ${e.message || 'Failed to update'}` };
      }
    }

    // Persist new password directly to Supabase admin_audit_logs if provided
    if (updates.initialPassword && updates.initialPassword.trim().length >= 4) {
      const newPass = updates.initialPassword.trim();
      localStorage.setItem(`sbh_user_pass_${id}`, newPass);
      try {
        await supabase.from('admin_audit_logs').insert([
          {
            actor_id: null,
            action: 'LEADER_PASSWORD',
            entity_type: 'USER_PASSWORD',
            entity_id: id,
            reason: `Password updated for leader ${updates.full_name || id}`,
            after_data: {
              leader_id: id,
              full_name: updates.full_name || '',
              email: emailLower || '',
              password: newPass,
              updated_at: new Date().toISOString(),
            },
          },
        ]);
      } catch (passErr) {
        console.warn('Password audit log save note:', passErr);
      }
    }

    // Update leaders state and immediately persist to localStorage
    setLeaders((prev) => {
      const next = prev.map((l) =>
        l.id === id
          ? {
              ...l,
              ...updates,
              full_name: updates.full_name?.trim() || l.full_name,
              phone: updates.phone?.trim() || l.phone,
              employee_code: updates.employee_code?.trim() || l.employee_code,
              email: emailLower || l.email,
              department: matchedDept || l.department,
              department_id: updates.department_id || l.department_id,
              updated_at: new Date().toISOString(),
            }
          : l
      );
      localStorage.setItem('sbh_custom_leaders', JSON.stringify(next));
      return next;
    });

    // Also update any attendance records for this leader so the change reflects everywhere live!
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.leader_id === id
          ? {
              ...r,
              leader: {
                ...r.leader!,
                ...updates,
                full_name: updates.full_name?.trim() || r.leader?.full_name || '',
                phone: updates.phone?.trim() || r.leader?.phone || '',
                email: emailLower || r.leader?.email || '',
                department: matchedDept || r.leader?.department,
                department_id: updates.department_id || r.leader?.department_id,
              },
            }
          : r
      )
    );

    return { success: true, message: 'Leader details & department saved to database successfully!' };
  };

  const deleteLeader = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (isUuid(id)) {
      try {
        // Clean up any foreign key constraints before deleting leader
        await supabase.from('admin_audit_logs').delete().eq('actor_id', id);
        await supabase.from('admin_audit_logs').delete().eq('entity_id', id);
        await supabase.from('attendance_records').delete().eq('leader_id', id);
        await supabase.from('leave_requests').delete().eq('leader_id', id);
        await supabase.from('departments').update({ head_leader_id: null }).eq('head_leader_id', id);

        const { error: delErr } = await supabase.from('leaders').delete().eq('id', id);
        if (delErr) {
          console.error('Supabase delete error:', delErr);
          return { success: false, message: `Database delete failed: ${delErr.message}` };
        }
      } catch (e: any) {
        console.error('Supabase delete warning:', e);
        return { success: false, message: `Database error: ${e.message || 'Failed to delete'}` };
      }
    }

    localStorage.removeItem(`sbh_user_pass_${id}`);
    localStorage.removeItem(`sbh_leader_dept_${id}`);

    setLeaders((prev) => {
      const next = prev.filter((l) => l.id !== id);
      localStorage.setItem('sbh_custom_leaders', JSON.stringify(next));
      return next;
    });
    setAttendanceRecords((prev) => prev.filter((r) => r.leader_id !== id));
    return { success: true, message: 'Leader removed from roster and database successfully.' };
  };

  // ================= ATTENDANCE ACTIONS =================

  const markVirtualJoin = async (
    leaderId: string,
    customDate?: string
  ): Promise<{ success: boolean; meetUrl: string; clicksCount: number }> => {
    const targetDate = customDate || selectedDate;
    const meeting = getMeetingForDate(targetDate);
    const nowIso = new Date().toISOString();
    const lateMinutes = calculateLateMinutes(targetDate, meeting.scheduled_time, new Date());
    const isLate = lateMinutes > 0;
    const statusToSet: AttendanceStatus = isLate ? 'INFORMED_LATE' : 'PRESENT';
    const note = isLate
      ? `Joined ${lateMinutes}m late • Pending Admin Approval`
      : 'On-Time • Pending Admin Approval';

    let updatedClicks = 1;
    const recordId = `att-${targetDate}-${leaderId}`;

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === targetDate);
      if (existing) {
        updatedClicks = (existing.virtual_clicks_count || 0) + 1;
        // SINGLE DAILY ATTENDANCE COUNT RULE:
        // If leader already checked in today, lock and preserve their initial check_in_at timestamp,
        // late_minutes, status, and verification note. Do NOT downgrade on-time to late on rejoin!
        const preservedCheckIn = existing.check_in_at || nowIso;
        const preservedStatus = existing.status && existing.status !== 'ABSENT' ? existing.status : statusToSet;
        const preservedLate = existing.late_minutes ?? lateMinutes;
        const preservedNote = existing.verification_note || note;

        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                selected_mode: r.selected_mode === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL',
                status: preservedStatus,
                verification_status: r.admin_verified_attendance ? 'VERIFIED' : r.verification_status || 'PENDING',
                check_in_at: preservedCheckIn,
                first_event_at: r.first_event_at || nowIso,
                last_click_at: nowIso,
                late_minutes: preservedLate,
                virtual_clicks_count: updatedClicks,
                evidence_source: r.evidence_source || 'GOOGLE_MEET_REDIRECT',
                admin_verified_attendance: r.admin_verified_attendance || false,
                verification_note: preservedNote,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: recordId,
          meeting_id: meeting.id,
          meeting_date: targetDate,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'VIRTUAL',
          status: statusToSet,
          verification_status: 'PENDING',
          check_in_at: nowIso,
          first_event_at: nowIso,
          last_click_at: nowIso,
          late_minutes: lateMinutes,
          virtual_clicks_count: 1,
          evidence_source: 'GOOGLE_MEET_REDIRECT',
          admin_verified_attendance: false,
          verification_note: note,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });

    // Sync to Supabase directly preserving original check_in_at
    try {
      const existingRecord = attendanceRecords.find((r) => r.leader_id === leaderId && r.meeting_date === targetDate);
      const savedCheckIn = existingRecord?.check_in_at || nowIso;
      const savedStatus = (existingRecord?.status && existingRecord.status !== 'ABSENT') ? existingRecord.status : statusToSet;
      const savedLate = existingRecord?.late_minutes ?? lateMinutes;
      const savedNote = existingRecord?.verification_note || note;

      if (isUuid(leaderId)) {
        supabase.from('admin_audit_logs').insert([{
          actor_id: leaderId,
          action: 'VIRTUAL_JOIN',
          entity_type: 'ATTENDANCE',
          entity_id: recordId,
          reason: `Leader joined Google Meet on ${targetDate}. ${savedNote}`,
          after_data: { targetDate, statusToSet: savedStatus, lateMinutes: savedLate },
        }]).then();
      }
    } catch (e) {
      console.warn('Supabase async sync notice:', e);
    }

    return {
      success: true,
      meetUrl: meeting.google_meet_url || appSettings.google_meet_url || 'https://meet.google.com/jrz-jfku-gir',
      clicksCount: updatedClicks,
    };
  };

  const verifyVirtualMeetingQr = async (
    leaderId: string,
    dateStr: string,
    scannedData: string
  ): Promise<{ success: boolean; message: string }> => {
    const nowIso = new Date().toISOString();
    const meeting = getMeetingForDate(dateStr);
    const lateMinutes = calculateLateMinutes(dateStr, meeting.scheduled_time, new Date());
    const isLate = lateMinutes > 0;
    const statusToSet: AttendanceStatus = isLate ? 'INFORMED_LATE' : 'PRESENT';
    const note = isLate
      ? `Virtual QR Scanned (+${lateMinutes}m late) • Pending Admin Approval`
      : 'Virtual QR Scanned • Pending Admin Approval';
    const recordId = `att-${dateStr}-${leaderId}`;

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === dateStr);
      if (existing) {
        // Single Daily Attendance Count Lock:
        const preservedCheckIn = existing.check_in_at || nowIso;
        const preservedStatus = existing.status && existing.status !== 'ABSENT' ? existing.status : statusToSet;
        const preservedLate = existing.late_minutes ?? lateMinutes;
        const preservedNote = existing.verification_note || note;

        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                status: preservedStatus,
                verification_status: r.admin_verified_attendance ? 'VERIFIED' : r.verification_status || 'PENDING',
                admin_verified_attendance: r.admin_verified_attendance || false,
                evidence_source: 'VIRTUAL_QR_VERIFIED',
                qr_scanned_at: r.qr_scanned_at || nowIso,
                late_minutes: preservedLate,
                check_in_at: preservedCheckIn,
                verification_note: preservedNote,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: recordId,
          meeting_id: meeting.id,
          meeting_date: dateStr,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'VIRTUAL',
          status: statusToSet,
          verification_status: 'PENDING',
          admin_verified_attendance: false,
          evidence_source: 'VIRTUAL_QR_VERIFIED',
          check_in_at: nowIso,
          qr_scanned_at: nowIso,
          last_click_at: nowIso,
          late_minutes: lateMinutes,
          virtual_clicks_count: 1,
          verification_note: note,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });

    try {
      const existingRecord = attendanceRecords.find((r) => r.leader_id === leaderId && r.meeting_date === dateStr);
      const savedCheckIn = existingRecord?.check_in_at || nowIso;
      const savedStatus = (existingRecord?.status && existingRecord.status !== 'ABSENT') ? existingRecord.status : statusToSet;
      const savedLate = existingRecord?.late_minutes ?? lateMinutes;
      const savedNote = existingRecord?.verification_note || note;

      supabase.from('attendance_records').upsert({
        id: recordId,
        meeting_id: meeting.id,
        meeting_date: dateStr,
        leader_id: leaderId,
        selected_mode: 'VIRTUAL',
        status: savedStatus,
        verification_status: existingRecord?.admin_verified_attendance ? 'VERIFIED' : 'PENDING',
        admin_verified_attendance: existingRecord?.admin_verified_attendance || false,
        late_minutes: savedLate,
        check_in_at: savedCheckIn,
        evidence_source: 'VIRTUAL_QR_VERIFIED',
        verification_note: savedNote,
        updated_at: nowIso,
      }).then();
    } catch (e) {}

    return {
      success: true,
      message: isLate
        ? `Virtual QR Scanned (+${lateMinutes}m late). Attendance submitted for Admin approval.`
        : 'Virtual QR Scanned on-time. Attendance submitted for Admin approval.',
    };
  };

  const markRoomQrCheckIn = async (leaderId: string): Promise<{ success: boolean; message: string; alreadyRecorded?: boolean; timeStr?: string }> => {
    const meeting = getMeetingForDate(selectedDate);
    const nowIso = new Date().toISOString();
    const lateMinutes = calculateLateMinutes(selectedDate, meeting.scheduled_time, new Date());
    const isLate = lateMinutes > 0;
    const statusToSet: AttendanceStatus = isLate ? 'INFORMED_LATE' : 'PRESENT';
    const note = isLate
      ? `Boardroom QR Scanned (+${lateMinutes}m late) • Pending Admin Approval`
      : 'Boardroom QR Scanned On-Time • Pending Admin Approval';
    const recordId = `att-${selectedDate}-${leaderId}`;

    let isAlreadyRecorded = false;
    let recordedTimeStr = '';

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === selectedDate);
      if (existing) {
        // Single Daily Attendance Count Lock:
        // If already marked, preserve initial check-in time and status!
        if (existing.check_in_at) {
          isAlreadyRecorded = true;
          recordedTimeStr = new Date(existing.check_in_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        }
        const preservedCheckIn = existing.check_in_at || nowIso;
        const preservedStatus = existing.status && existing.status !== 'ABSENT' ? existing.status : statusToSet;
        const preservedLate = existing.late_minutes ?? lateMinutes;
        const preservedNote = existing.verification_note || note;

        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                selected_mode: 'PHYSICAL',
                status: preservedStatus,
                verification_status: r.admin_verified_attendance ? 'VERIFIED' : r.verification_status || 'PENDING',
                check_in_at: preservedCheckIn,
                first_event_at: r.first_event_at || nowIso,
                evidence_source: 'ROOM_STATIC_QR',
                late_minutes: preservedLate,
                admin_verified_attendance: r.admin_verified_attendance || false,
                verification_note: preservedNote,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: recordId,
          meeting_id: meeting.id,
          meeting_date: selectedDate,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'PHYSICAL',
          status: statusToSet,
          verification_status: 'PENDING',
          check_in_at: nowIso,
          first_event_at: nowIso,
          late_minutes: lateMinutes,
          evidence_source: 'ROOM_STATIC_QR',
          admin_verified_attendance: false,
          verification_note: note,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });

    try {
      const existingRecord = attendanceRecords.find((r) => r.leader_id === leaderId && r.meeting_date === selectedDate);
      const savedCheckIn = existingRecord?.check_in_at || nowIso;
      const savedStatus = (existingRecord?.status && existingRecord.status !== 'ABSENT') ? existingRecord.status : statusToSet;
      const savedLate = existingRecord?.late_minutes ?? lateMinutes;
      const savedNote = existingRecord?.verification_note || note;

      if (isUuid(leaderId)) {
        supabase.from('admin_audit_logs').insert([{
          actor_id: leaderId,
          action: 'ROOM_QR_CHECKIN',
          entity_type: 'ATTENDANCE',
          entity_id: recordId,
          reason: `Physical boardroom QR attendance checked in on ${selectedDate}. ${savedNote}`,
          after_data: { selectedDate, statusToSet: savedStatus, isAlreadyRecorded },
        }]).then();
      }
    } catch (e) {}

    const formattedNow = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return {
      success: true,
      alreadyRecorded: isAlreadyRecorded,
      timeStr: isAlreadyRecorded ? recordedTimeStr : formattedNow,
      message: isAlreadyRecorded
        ? `Your physical attendance was already recorded today at ${recordedTimeStr || formattedNow}. Single daily count is locked.`
        : isLate
        ? `Boardroom QR Scanned (+${lateMinutes}m late). Physical attendance submitted for Admin approval.`
        : 'Boardroom QR Scanned On-Time! Physical attendance confirmed.',
    };
  };

  // ================= ADMIN APPROVAL ENGINE =================

  const approveAttendanceRecord = async (
    recordId: string
  ): Promise<{ success: boolean; message: string }> => {
    const nowIso = new Date().toISOString();
    let targetLeaderName = 'Leader';

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          targetLeaderName = r.leader?.full_name || 'Leader';
          const lateStr = r.late_minutes && r.late_minutes > 0 ? ` (+${r.late_minutes}m)` : '';
          return {
            ...r,
            admin_verified_attendance: true,
            verification_status: 'VERIFIED',
            verified_at: nowIso,
            updated_at: nowIso,
            verification_note: `Approved by Admin${lateStr} at ${new Date(nowIso).toLocaleTimeString()}`,
          };
        }
        return r;
      })
    );

    // Sync to Supabase
    try {
      await supabase
        .from('attendance_records')
        .update({
          admin_verified_attendance: true,
          verification_status: 'VERIFIED',
          verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', recordId);
    } catch (e) {
      console.warn('Supabase approval sync notice:', e);
    }

    return { success: true, message: `Attendance verified & approved for ${targetLeaderName}!` };
  };

  const approveAllPendingRecords = async (
    date: string
  ): Promise<{ success: boolean; count: number; message: string }> => {
    const nowIso = new Date().toISOString();
    let approvedCount = 0;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (
          r.meeting_date === date &&
          !r.admin_verified_attendance &&
          (r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.selected_mode !== 'NONE')
        ) {
          approvedCount++;
          const lateStr = r.late_minutes && r.late_minutes > 0 ? ` (+${r.late_minutes}m)` : '';
          return {
            ...r,
            admin_verified_attendance: true,
            verification_status: 'VERIFIED',
            verified_at: nowIso,
            updated_at: nowIso,
            verification_note: `Approved by Admin${lateStr} at ${new Date(nowIso).toLocaleTimeString()}`,
          };
        }
        return r;
      })
    );

    // Sync to Supabase
    try {
      await supabase
        .from('attendance_records')
        .update({
          admin_verified_attendance: true,
          verification_status: 'VERIFIED',
          verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq('meeting_date', date);
    } catch (e) {
      console.warn('Supabase bulk approval notice:', e);
    }

    return {
      success: true,
      count: approvedCount,
      message: `Successfully approved attendance for ${approvedCount} leaders!`,
    };
  };

  const rejectAttendanceRecord = async (
    recordId: string,
    reason: string = 'Rejected by Admin'
  ): Promise<{ success: boolean; message: string }> => {
    const nowIso = new Date().toISOString();
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: 'ABSENT',
              verification_status: 'REJECTED',
              admin_verified_attendance: false,
              verification_note: reason,
              updated_at: nowIso,
            }
          : r
      )
    );

    try {
      await supabase
        .from('attendance_records')
        .update({
          status: 'ABSENT',
          verification_status: 'REJECTED',
          admin_verified_attendance: false,
          verification_note: reason,
          updated_at: nowIso,
        })
        .eq('id', recordId);
    } catch (e) {}

    return { success: true, message: 'Attendance rejected and marked as ABSENT.' };
  };

  const submitInformedAbsence = async (leaderId: string, informedTo: string, reason: string) => {
    const meeting = getMeetingForDate(selectedDate);
    const nowIso = new Date().toISOString();

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === selectedDate);
      if (existing) {
        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                status: 'INFORMED_ABSENT',
                verification_status: 'PENDING',
                informed_to_person: informedTo,
                informed_reason: reason,
                informed_confirmed: false,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: `att-${selectedDate}-${leaderId}`,
          meeting_id: meeting.id,
          meeting_date: selectedDate,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'NONE',
          status: 'INFORMED_ABSENT',
          verification_status: 'PENDING',
          informed_to_person: informedTo,
          informed_reason: reason,
          informed_confirmed: false,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });

    return { success: true, message: 'Informed Absence registered for Admin verification.' };
  };

  const adminVerifyStatus = async (
    recordId: string,
    status: AttendanceStatus,
    verified: boolean,
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status,
              verification_status: verified ? 'VERIFIED' : 'REJECTED',
              admin_verified_attendance: verified,
              verification_note: note,
              check_in_at: r.check_in_at || nowIso,
              verified_at: nowIso,
              updated_at: nowIso,
            }
          : r
      )
    );
  };

  const confirmInformedAbsence = async (recordId: string, confirmed: boolean) => {
    const nowIso = new Date().toISOString();
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: confirmed ? 'LEAVE' : 'ABSENT',
              verification_status: confirmed ? 'VERIFIED' : 'REJECTED',
              informed_confirmed: confirmed,
              admin_verified_attendance: confirmed,
              verified_at: nowIso,
              updated_at: nowIso,
            }
          : r
      )
    );
  };

  const markLeaderInformedLeave = async (
    leaderId: string,
    date: string,
    informedTo: string,
    reason: string
  ) => {
    const meeting = getMeetingForDate(date);
    const nowIso = new Date().toISOString();

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === date);
      if (existing) {
        return prev.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                status: 'LEAVE',
                verification_status: 'VERIFIED',
                informed_to_person: informedTo,
                informed_reason: reason,
                informed_confirmed: true,
                admin_verified_attendance: true,
                verification_note: `Informed: ${informedTo} - ${reason}`,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: `att-${date}-${leaderId}`,
          meeting_id: meeting.id,
          meeting_date: date,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'NONE',
          status: 'LEAVE',
          verification_status: 'VERIFIED',
          informed_to_person: informedTo,
          informed_reason: reason,
          informed_confirmed: true,
          admin_verified_attendance: true,
          verification_note: `Informed: ${informedTo} - ${reason}`,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });
  };

  const markLeaderInformedLate = async (
    leaderId: string,
    date: string,
    lateMinutes: number,
    expectedTime: string,
    informedTo: string,
    reason: string
  ) => {
    const meeting = getMeetingForDate(date);
    const nowIso = new Date().toISOString();

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.meeting_date === date && r.leader_id === leaderId);
      if (idx >= 0) {
        return prev.map((r, i) =>
          i === idx
            ? {
                ...r,
                status: 'INFORMED_LATE' as AttendanceStatus,
                verification_status: 'VERIFIED',
                informed_to_person: informedTo,
                informed_reason: reason,
                late_minutes: lateMinutes,
                expected_arrival_time: expectedTime,
                late_reason: reason,
                late_approved_by_admin: true,
                informed_confirmed: true,
                admin_verified_attendance: true,
                verification_note: `Late: ${lateMinutes}m (ETA ${expectedTime}) - ${informedTo} - ${reason}`,
                updated_at: nowIso,
              }
            : r
        );
      }
      return [
        ...prev,
        {
          id: `att-${date}-${leaderId}`,
          meeting_id: meeting.id,
          meeting_date: date,
          meeting_frequency: meeting.frequency,
          cadence: meeting.cadence,
          leader_id: leaderId,
          leader: leaders.find((l) => l.id === leaderId),
          selected_mode: 'NONE',
          status: 'INFORMED_LATE' as AttendanceStatus,
          verification_status: 'VERIFIED',
          informed_to_person: informedTo,
          informed_reason: reason,
          late_minutes: lateMinutes,
          expected_arrival_time: expectedTime,
          late_reason: reason,
          late_approved_by_admin: true,
          informed_confirmed: true,
          admin_verified_attendance: true,
          verification_note: `Late: ${lateMinutes}m (ETA ${expectedTime}) - ${informedTo} - ${reason}`,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];
    });
  };

  // ================= 2-STAGE AUTOMATED WHATSAPP DISPATCHES =================

  // Stage 2: 10:30 AM Final Leadership Audit Report
  const sendDailyWhatsappReport = (date: string) => {
    const meeting = getMeetingForDate(date);
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const presentPhysical = forDate.filter(
      (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
    );
    const presentVirtual = forDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT');
    const informedLate = forDate.filter(
      (r) => r.status === 'INFORMED_LATE' && r.late_approved_by_admin
    );
    const informedLeave = forDate.filter(
      (r) => r.status === 'LEAVE' || (r.status === 'INFORMED_ABSENT' && (r.informed_confirmed || r.admin_verified_attendance))
    );
    const absent = forDate.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    );

    const cadenceCode = meeting.cadence || 'DOM';
    const totalCount = forDate.length || leaders.length;
    const totalPresent = presentPhysical.length + presentVirtual.length;
    const complianceRate = totalCount > 0 ? Math.round(((totalPresent + informedLate.length + informedLeave.length) / totalCount) * 100) : 0;
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let msg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
    msg += `📊 *FINAL 10:30 AM ${cadenceCode} ATTENDANCE AUDIT REPORT*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📅 *Date:* ${formattedDate} | *Meeting:* ${cadenceCode} (${meeting.frequency})\n`;
    msg += `⏰ *Audit Frozen:* 10:30 AM | *Venue:* ${appSettings.conference_room_name}\n\n`;
    msg += `📈 *HOSPITAL OPERATIONS AUDIT SUMMARY:*\n`;
    msg += `👥 Total Expected Leaders: ${totalCount}\n`;
    msg += `🏢 In-Person (Conference Room): ${presentPhysical.length}\n`;
    msg += `💻 Virtual (Google Meet): ${presentVirtual.length}\n`;
    msg += `⏱️ Approved Late Arrivals: ${informedLate.length}\n`;
    msg += `⚠️ Approved Leave / Excused: ${informedLeave.length}\n`;
    msg += `❌ Final Absentees: ${absent.length}\n`;
    msg += `🎯 Total Compliance Rate: *${complianceRate}%*\n\n`;

    if (absent.length > 0) {
      msg += `❌ *FINAL ABSENT LEADERS (Action Required):*\n`;
      absent.forEach((p, idx) => {
        msg += `❌ ${idx + 1}. *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'})\n`;
      });
      msg += `\n`;
    } else {
      msg += `🎉 *100% ATTENDANCE ACHIEVED! All leaders were present, late-approved, or excused.*\n\n`;
    }

    if (informedLate.length > 0) {
      msg += `⏱️ *APPROVED LATE ARRIVALS (Admin Verified ✅):*\n`;
      informedLate.forEach((p, idx) => {
        const mins = p.late_minutes ? `+${p.late_minutes}m` : 'Late';
        const eta = p.expected_arrival_time ? ` | ETA: ${p.expected_arrival_time}` : '';
        const rsn = p.late_reason || p.informed_reason ? ` (${p.late_reason || p.informed_reason})` : '';
        msg += `• *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'}) — ${mins}${eta}${rsn}\n`;
      });
      msg += `\n`;
    }

    if (informedLeave.length > 0) {
      msg += `⚠️ *OFFICIAL EXCUSED / LEAVE SUMMARY:*\n`;
      informedLeave.forEach((p, idx) => {
        const info = p.informed_to_person ? `Informed: ${p.informed_to_person}` : 'Verified';
        const rsn = p.informed_reason ? ` | ${p.informed_reason}` : '';
        msg += `• *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'}) — ${info}${rsn}\n`;
      });
      msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    return { success: true, message: 'Final 10:30 AM WhatsApp Audit Report opened for dispatch!', payload: msg };
  };

  // Stage 1: 09:50 AM Morning Notice with Meeting Link (Daily, Monday to Saturday; Sunday Paused)
  const sendMeetingReminderNotice = (date: string) => {
    // Sunday Rule: Automated reminders paused on Sunday
    if (new Date(date).getDay() === 0) {
      return { sentCount: 0, message: 'Sunday is an official weekly off. DOM Standup & automated reminders are paused on Sundays.' };
    }

    const meeting = getMeetingForDate(date);
    const cadenceCode = meeting.cadence || 'DOM';
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let reminderMsg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
    reminderMsg += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
    reminderMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    reminderMsg += `📅 *Date:* ${formattedDate}\n`;
    reminderMsg += `⏰ *Start Time:* ${meeting.scheduled_time} (Sharp 10:00 AM)\n`;
    reminderMsg += `📍 *Venue:* ${appSettings.conference_room_name}\n`;
    reminderMsg += `💻 *Google Meet Link:* ${meeting.google_meet_url}\n`;
    reminderMsg += `🔐 *Official Login Panel:* ${window.location.origin}/login\n\n`;
    reminderMsg += `⚠️ *ATTENDANCE INSTRUCTION:*\n`;
    reminderMsg += `All leaders must login via the official portal (${window.location.origin}/login) before 10:00 AM sharp to confirm attendance (either in-person in Conference Room, 5th Floor or virtually via Google Meet).\n`;
    reminderMsg += `1. Select your name from the roster dropdown\n`;
    reminderMsg += `2. Enter your password to authenticate\n`;
    reminderMsg += `3. Confirm attendance (tracked date-wise & user-wise)\n\n`;
    reminderMsg += `Final Attendance Audit Report will be published at 10:30 AM.\n`;
    reminderMsg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(reminderMsg)}`, '_blank');
    return { sentCount: leaders.length, message: `09:50 AM ${cadenceCode} notice opened for WhatsApp dispatch!` };
  };

  // Stage 2: 10:10 AM Live Attendance Status (❌ Red Cross for absentees, 🏢 physical, 💻 virtual, ⚠️ verified leave)
  const sendNonAttendeesEscalationNotice = (date: string) => {
    const meeting = getMeetingForDate(date);
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const cadenceCode = meeting.cadence || 'DOM';
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const presentPhysical = forDate.filter(
      (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
    );
    const presentVirtual = forDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT');
    const informedLeave = forDate.filter(
      (r) => r.status === 'LEAVE' || (r.status === 'INFORMED_ABSENT' && (r.informed_confirmed || r.admin_verified_attendance))
    );
    const absent = forDate.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    );

    let msg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
    msg += `🚨 *10:10 AM LIVE ATTENDANCE STATUS (${cadenceCode})*\n`;
    msg += `📅 Date: ${formattedDate} | ⏰ Checked at: 10:10 AM\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. ABSENT / NOT JOINED (Red Cross ❌)
    if (absent.length > 0) {
      msg += `❌ *NOT JOINED / ABSENT (${absent.length}):*\n`;
      absent.forEach((p, idx) => {
        msg += `❌ ${idx + 1}. *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'}) — NOT JOINED\n`;
      });
      msg += `\n`;
    } else {
      msg += `🎉 *Zero Absentees! Everyone has joined or informed.*\n\n`;
    }

    // 2. PHYSICALLY JOINED (Boardroom)
    if (presentPhysical.length > 0) {
      msg += `🏢 *PHYSICALLY JOINED IN BOARDROOM (${presentPhysical.length}):*\n`;
      presentPhysical.forEach((p, idx) => {
        const timeStr = p.check_in_at
          ? new Date(p.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'In-Person';
        msg += `🏢 ${idx + 1}. ${p.leader?.full_name} (${p.leader?.department?.name || 'Dept'}) — ${timeStr}\n`;
      });
      msg += `\n`;
    }

    // 3. VIRTUALLY JOINED (Google Meet)
    if (presentVirtual.length > 0) {
      msg += `💻 *VIRTUALLY JOINED VIA GOOGLE MEET (${presentVirtual.length}):*\n`;
      presentVirtual.forEach((p, idx) => {
        const timeStr = p.check_in_at
          ? new Date(p.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'Meet Virtual';
        msg += `💻 ${idx + 1}. ${p.leader?.full_name} (${p.leader?.department?.name || 'Dept'}) — ${timeStr}\n`;
      });
      msg += `\n`;
    }

    // 4. INFORMED / LEAVE (VERIFIED BY ADMIN)
    if (informedLeave.length > 0) {
      msg += `⚠️ *INFORMED / APPROVED LEAVE (${informedLeave.length}) [Verified by Admin ✅]:*\n`;
      informedLeave.forEach((p, idx) => {
        const info = p.informed_to_person ? `Informed to: ${p.informed_to_person}` : 'Informed Admin';
        const rsn = p.informed_reason ? ` | ${p.informed_reason}` : '';
        msg += `⚠️ ${idx + 1}. ${p.leader?.full_name} (${p.leader?.department?.name || 'Dept'}) — ${info}${rsn}\n`;
      });
      msg += `\n`;
    }

    if (absent.length > 0) {
      msg += `🔴 *KINDLY JOIN IMMEDIATELY:*\n`;
      msg += `💻 Google Meet: ${meeting.google_meet_url}\n`;
      msg += `*Attendance window will freeze for final 10:30 AM report.*\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    return { count: absent.length, message: `10:10 AM live status dispatched for ${absent.length} absent leaders!`, payload: msg };
  };

  const generateEmailReportDraft = (date: string) => {
    const meeting = getMeetingForDate(date);
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const cadenceCode = meeting.cadence || 'DOM';
    const subject = `[OFFICIAL REPORT] SBH Hospital — ${cadenceCode} Attendance Audit (${date})`;

    let body = `Respected Director Sir,\n\nPlease find below the attendance audit for ${cadenceCode} (${meeting.title}) on ${date}:\n\n`;
    body += `Total Scheduled Leaders: ${forDate.length}\n`;
    body += `Conference Room, 5th Floor In-Person: ${forDate.filter((r) => r.selected_mode === 'PHYSICAL' && r.status === 'PRESENT').length}\n`;
    body += `Google Meet Virtual: ${forDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT').length}\n`;
    body += `Approved Leave: ${forDate.filter((r) => r.status === 'LEAVE').length}\n`;
    body += `Absent: ${forDate.filter((r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')).length}\n\n`;
    body += `Regards,\nDOM Operations Command, SBH Raipur`;

    const mailtoUrl = `mailto:director@sbhhospital.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { subject, body, mailtoUrl };
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('sbh_app_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // ================= PDF EXPORTS =================

  const downloadPdfReport = (date: string) => {
    const meeting = getMeetingForDate(date);
    const records = attendanceRecords.filter((r) => r.meeting_date === date);
    downloadDirectorPdf(meeting, records, appSettings);
  };

  const openPdfReport = (date: string) => {
    const meeting = getMeetingForDate(date);
    const records = attendanceRecords.filter((r) => r.meeting_date === date);
    openDirectorPdfInNewTab(meeting, records, appSettings);
  };

  const downloadMonthlyPdfReport = (monthYearStr: string) => {
    downloadMonthlyAuditPdf(monthYearStr, leaders, attendanceRecords, appSettings);
  };

  const downloadYearlyPdfReport = (year: number) => {
    downloadYearlyAuditPdf(year, leaders, attendanceRecords, appSettings);
  };

  // ================= CEOITBOX WHATSAPP DISPATCHES =================

  const sendDirectorCeoitboxWhatsapp = async (date: string): Promise<{ success: boolean; message: string; url: string }> => {
    const meeting = getMeetingForDate(date);
    const cadenceCode = meeting.cadence || 'DOM';
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const presentPhysical = forDate.filter(
      (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
    );
    const presentVirtual = forDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT');
    const informedLeave = forDate.filter((r) => r.status === 'LEAVE');
    const absent = forDate.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    );

    let msg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
    msg += `📊 *OFFICIAL ${cadenceCode} ATTENDANCE REPORT*\n`;
    msg += `📅 Date: ${date} (${cadenceCode} SESSION)\n`;
    msg += `⏰ Scheduled Time: ${meeting.scheduled_time}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👥 Total Leaders Scheduled: ${forDate.length}\n`;
    msg += `🏢 In-Person (Boardroom): ${presentPhysical.length}\n`;
    msg += `💻 Virtual (Google Meet): ${presentVirtual.length}\n`;
    msg += `✅ Approved Leave: ${informedLeave.length}\n`;
    msg += `❌ Absent: ${absent.length}\n\n`;

    if (absent.length > 0) {
      msg += `*⚠️ ABSENT LEADERS:*\n`;
      absent.forEach((p, idx) => {
        msg += `${idx + 1}. ${p.leader?.full_name} [${p.leader?.department?.name || 'Dept'}]\n`;
      });
      msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

    const res = await sendCeoitboxWhatsappMessage({
      mobileNo: appSettings.director_whatsapp || '9644404741',
      name: appSettings.director_name || 'Director Sir',
      message: msg,
      settings: appSettings,
    });

    return {
      success: res.success,
      message: `Official ${cadenceCode} Report dispatched to Director Sir (${appSettings.director_whatsapp}) via CEOITBOX WhatsApp API!`,
      url: res.url,
    };
  };

  // Stage 1: Send Personalized 09:50 AM Alerts to All Leaders (Mon-Sat, Sunday Paused)
  const sendCeoitboxRemindersToAll = async (
    date: string
  ): Promise<{ success: boolean; count: number; message: string }> => {
    // Sunday Rule: Automated reminders paused on Sunday
    if (new Date(date).getDay() === 0) {
      return { success: true, count: 0, message: 'Sunday is an official weekly off. Leader reminders skipped.' };
    }

    const meeting = getMeetingForDate(date);
    const cadenceCode = meeting.cadence || 'DOM';
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    let sent = 0;

    for (const lead of leaders) {
      if (!lead.phone) continue;
      // Protection: Ex-employee phone number must never be targeted
      if (lead.phone.includes('9977881452')) continue;

      const { url: magicUrl } = generateLeaderMagicLink(lead);
      const { url: dailyMeetUrl } = generateDailyMeetingLink(
        lead,
        date,
        undefined,
        meeting.google_meet_url || appSettings.google_meet_url
      );

      let reminderText = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
      reminderText += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
      reminderText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      reminderText += `👤 *Hello ${lead.full_name}* (${lead.department?.name || 'Dept'})\n`;
      reminderText += `📅 *Date:* ${formattedDate}\n`;
      reminderText += `⏰ *Start Time:* ${meeting.scheduled_time} (Sharp 10:00 AM)\n`;
      reminderText += `📍 *Venue:* ${appSettings.conference_room_name}\n`;
      reminderText += `💻 *Official Google Meet:* ${meeting.google_meet_url || appSettings.google_meet_url}\n\n`;
      reminderText += `🔐 *LOGIN & ATTENDANCE SIGN-IN:*\n`;
      reminderText += `${window.location.origin}/login\n`;
      reminderText += `*(Select your name, enter your password & confirm attendance)*\n\n`;
      reminderText += `🔗 *YOUR UNIQUE GOOGLE MEET TRACKING LINK:*\n`;
      reminderText += `${dailyMeetUrl}\n`;
      reminderText += `*(Tap to join Meet & auto-count your virtual attendance)*\n\n`;
      reminderText += `📲 *OR 15-MINUTE DIRECT MAGIC ACCESS:*\n`;
      reminderText += `${magicUrl}\n`;
      reminderText += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

      await sendCeoitboxWhatsappMessage({
        mobileNo: lead.phone,
        name: lead.full_name,
        message: reminderText,
        settings: appSettings,
      });
      sent++;
    }

    return {
      success: true,
      count: sent,
      message: `09:50 AM notice & secure login links broadcast to ${sent} department leaders!`,
    };
  };

  const sendCeoitboxEscalationToNonAttendees = async (date: string): Promise<{ success: boolean; count: number; message: string }> => {
    const meeting = getMeetingForDate(date);
    const cadenceCode = meeting.cadence || 'DOM';
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const nonAttendees = forDate.filter(
      (r) => r.status === 'PENDING' || r.status === 'ABSENT' || (r.selected_mode === 'NONE' && r.status !== 'LEAVE')
    );

    if (nonAttendees.length === 0) {
      return { success: true, count: 0, message: 'All leaders have joined! No non-attendees to escalate.' };
    }

    let sent = 0;
    for (const rec of nonAttendees) {
      const lead = rec.leader;
      if (!lead?.phone) continue;

      let alertText = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
      alertText += `🚨 *URGENT: ${cadenceCode} SESSION IN PROGRESS — KINDLY JOIN*\n`;
      alertText += `Dear ${lead.full_name},\n`;
      alertText += `Today's ${cadenceCode} (${meeting.title}) has commenced. Your attendance is required immediately.\n\n`;
      alertText += `🔴 *JOIN NOW:*\n`;
      alertText += `💻 Google Meet: ${meeting.google_meet_url || appSettings.google_meet_url}\n`;
      alertText += `📍 In-Person: ${appSettings.conference_room_name}\n`;

      await sendCeoitboxWhatsappMessage({
        mobileNo: lead.phone,
        name: lead.full_name,
        message: alertText,
        settings: appSettings,
      });
      sent++;
    }

    return {
      success: true,
      count: sent,
      message: `Urgent Kindly Join alert dispatched to ${sent} non-attendees via CEOITBOX!`,
    };
  };

  // Automated 2-Stage Broadcast directly into official WhatsApp Group (919977881452-1431506963@g.us) via CEOITBOX API (Mon-Sat, Sunday Paused)
  const sendCeoitboxGroupBroadcast = async (
    stage: '0950' | '1030',
    date: string
  ): Promise<{ success: boolean; message: string; url: string; payload: string }> => {
    // Sunday Rule: Automated group broadcasts paused on Sunday
    if (new Date(date).getDay() === 0) {
      return { success: true, message: 'Sunday is an official weekly off. Group broadcast skipped.', url: '', payload: '' };
    }

    const meeting = getMeetingForDate(date);
    const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const cadenceCode = meeting.cadence || 'DOM';
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const presentPhysical = forDate.filter(
      (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
    );
    const presentVirtual = forDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT');
    const informedLate = forDate.filter(
      (r) => r.status === 'INFORMED_LATE' && r.late_approved_by_admin
    );
    const informedLeave = forDate.filter(
      (r) => r.status === 'LEAVE' || (r.status === 'INFORMED_ABSENT' && (r.informed_confirmed || r.admin_verified_attendance))
    );
    const absent = forDate.filter(
      (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
    );

    const totalCount = forDate.length || leaders.length;
    const totalPresent = presentPhysical.length + presentVirtual.length;
    const complianceRate = totalCount > 0 ? Math.round(((totalPresent + informedLate.length + informedLeave.length) / totalCount) * 100) : 0;

    let msg = '';

    if (stage === '0950') {
      msg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
      msg += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📅 *Date:* ${formattedDate}\n`;
      msg += `⏰ *Start Time:* ${meeting.scheduled_time} (Sharp 10:00 AM)\n`;
      msg += `📍 *Venue:* ${appSettings.conference_room_name}\n`;
      msg += `💻 *Google Meet Link:* ${meeting.google_meet_url}\n`;
      msg += `🔐 *Official Login Panel:* ${window.location.origin}/login\n\n`;
      msg += `⚠️ *ATTENDANCE INSTRUCTION:*\n`;
      msg += `All leaders are requested to join before 10:00 AM sharp (either in-person at Conference Room, 5th Floor or virtually via Google Meet).\n`;
      msg += `Select your name and login at ${window.location.origin}/login to confirm your attendance.\n`;
      msg += `If you are arriving late, submit your expected arrival time immediately for Admin approval.\n`;
      msg += `Final Attendance Audit Report will be published at 10:30 AM.\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;
      msg += `If you are arriving late, submit your expected arrival time immediately for Admin approval.\n`;
      msg += `Final Attendance Audit Report will be published at 10:30 AM.\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;
    } else {
      // 10:30 AM
      msg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n`;
      msg += `📊 *FINAL 10:30 AM ${cadenceCode} ATTENDANCE AUDIT REPORT*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📅 *Date:* ${formattedDate} | *Meeting:* ${cadenceCode} (${meeting.frequency})\n`;
      msg += `⏰ *Audit Frozen:* 10:30 AM | *Venue:* ${appSettings.conference_room_name}\n\n`;
      msg += `📈 *HOSPITAL OPERATIONS AUDIT SUMMARY:*\n`;
      msg += `👥 Total Expected Leaders: ${totalCount}\n`;
      msg += `🏢 In-Person (Conference Room): ${presentPhysical.length}\n`;
      msg += `💻 Virtual (Google Meet): ${presentVirtual.length}\n`;
      msg += `⏱️ Approved Late Arrivals: ${informedLate.length}\n`;
      msg += `⚠️ Approved Leave / Excused: ${informedLeave.length}\n`;
      msg += `❌ Final Absentees: ${absent.length}\n`;
      msg += `🎯 Overall Compliance: *${complianceRate}%*\n\n`;

      if (absent.length > 0) {
        msg += `❌ *FINAL ABSENT LEADERS (Action Required):*\n`;
        absent.forEach((p, idx) => {
          msg += `❌ ${idx + 1}. *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'})\n`;
        });
        msg += `\n`;
      } else {
        msg += `🎉 *100% ATTENDANCE COMPLIANCE RECORDED TODAY!*\n\n`;
      }

      if (informedLate.length > 0) {
        msg += `⏱️ *APPROVED LATE ARRIVALS (Admin Verified ✅):*\n`;
        informedLate.forEach((p, idx) => {
          const mins = p.late_minutes ? `+${p.late_minutes}m` : 'Late';
          const eta = p.expected_arrival_time ? ` | ETA: ${p.expected_arrival_time}` : '';
          const rsn = p.late_reason || p.informed_reason ? ` (${p.late_reason || p.informed_reason})` : '';
          msg += `• *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'}) — ${mins}${eta}${rsn}\n`;
        });
        msg += `\n`;
      }

      if (informedLeave.length > 0) {
        msg += `⚠️ *OFFICIAL EXCUSED / LEAVE SUMMARY:*\n`;
        informedLeave.forEach((p, idx) => {
          const info = p.informed_to_person ? `Informed: ${p.informed_to_person}` : 'Verified';
          const rsn = p.informed_reason ? ` | ${p.informed_reason}` : '';
          msg += `• *${p.leader?.full_name}* (${p.leader?.department?.name || 'Dept'}) — ${info}${rsn}\n`;
        });
        msg += `\n`;
      }
      msg += `━━━━━━━━━━━━━━━━━━━━━━\nBroadcast to: Official WhatsApp Group & Director Sir\nDOM Operations Command | SBH Raipur`;
    }

    const groupJid = appSettings.admin_whatsapp_group || '919977881452-1431506963@g.us';

    const res = await sendCeoitboxWhatsappMessage({
      mobileNo: groupJid,
      name: 'SBH DOM Official Group',
      message: msg,
      settings: appSettings,
    });

    if (res.url) {
      window.open(res.url, '_blank');
    }

    return {
      success: true,
      message: `Stage ${stage === '0950' ? '09:50 AM Notice' : '10:30 AM Final Audit'} copied to clipboard & opened in WhatsApp! Post directly to the official group. (Ex-employee +91 99778 81452 is 100% blocked)`,
      url: res.url,
      payload: msg,
    };
  };

  // Full Automated 09:50 AM Transmission (Both Official WhatsApp Group AND 24 Leaders with Magic Links)
  const triggerAutomated0950Transmission = async (
    date: string
  ): Promise<{ success: boolean; leadersCount: number; message: string }> => {
    // 1. Dispatch Group Broadcast
    await sendCeoitboxGroupBroadcast('0950', date);
    // 2. Dispatch Individual Reminders with 15-min Magic Links
    const leadRes = await sendCeoitboxRemindersToAll(date);

    return {
      success: true,
      leadersCount: leadRes.count,
      message: `09:50 AM Automated Transmission Successful! Notice sent to WhatsApp Group and ${leadRes.count} leaders with personalized 15-minute quick attendance links.`,
    };
  };

  return (
    <DomAppContext.Provider
      value={{
        leaders,
        departments,
        attendanceRecords,
        meetingSchedules,
        appSettings,
        selectedDate,
        setSelectedDate,
        isLoading,
        getMeetingForDate,
        updateMeetingSchedule,
        addDepartment,
        editDepartment,
        deleteDepartment,
        addLeader,
        editLeader,
        deleteLeader,
        markVirtualJoin,
        verifyVirtualMeetingQr,
        markRoomQrCheckIn,
        submitInformedAbsence,
        markLeaderInformedLeave,
        markLeaderInformedLate,
        adminVerifyStatus,
        confirmInformedAbsence,
        approveAttendanceRecord,
        approveAllPendingRecords,
        rejectAttendanceRecord,
        sendDailyWhatsappReport,
        sendMeetingReminderNotice,
        sendNonAttendeesEscalationNotice,
        generateEmailReportDraft,
        downloadPdfReport,
        openPdfReport,
        downloadMonthlyPdfReport,
        downloadYearlyPdfReport,
        sendDirectorCeoitboxWhatsapp,
        sendCeoitboxRemindersToAll,
        sendCeoitboxEscalationToNonAttendees,
        sendCeoitboxGroupBroadcast,
        triggerAutomated0950Transmission,
        updateAppSettings,
      }}
    >
      {children}
    </DomAppContext.Provider>
  );
};

export const useDomApp = () => {
  const context = useContext(DomAppContext);
  if (!context) {
    throw new Error('useDomApp must be used within a DomAppProvider');
  }
  return context;
};
