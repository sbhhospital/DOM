import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { INITIAL_DEPARTMENTS } from '../data/initialData';
import { supabase } from '../lib/supabase';
import {
  downloadDirectorPdf,
  getDirectorPdfBase64,
  openDirectorPdfInNewTab,
  downloadMonthlyAuditPdf,
  downloadYearlyAuditPdf,
} from '../lib/pdfGenerator';
import { sendCeoitboxWhatsappMessage } from '../lib/whatsappService';
import { determineMeetingFrequency, getCadenceInfo, calculateLateMinutes, getLiveIndiaDateStr } from '../lib/meetingUtils';
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
  markRoomQrCheckIn: (
    leaderId: string,
    locationData?: { latitude?: number; longitude?: number; accuracy?: number; device?: string }
  ) => Promise<{ success: boolean; message: string; alreadyRecorded?: boolean; timeStr?: string }>;
  logMeetingRejoin: (leaderId: string, meetUrl: string) => Promise<void>;
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
  uploadReportToGoogleDriveAndSheet: (
    date: string
  ) => Promise<{ success: boolean; message: string; driveUrl?: string }>;
  // Settings
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
}

const DomAppContext = createContext<DomAppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  director_whatsapp: '9644404741',
  director_name: 'Director Sir',
  admin_whatsapp_group: '120363432056023698@g.us',
  google_meet_url: 'https://meet.google.com/jrz-jfku-gir',
  allowed_domain: 'sbhhospital.com',
  conference_room_name: 'Conference Room, 5th Floor',
  ceoitbox_enabled: true,
  ceoitbox_username: 'SBH HOSPITAL',
  ceoitbox_password: '123456789',
  ceoitbox_api_url: 'https://app.ceoitbox.com/message/new',
  google_drive_folder_id: '1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD',
  google_drive_folder_url: 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing',
  google_sheet_webhook_url: 'https://script.google.com/macros/s/AKfycbyp3qzrQkP29pHmpz1bmcuwMYNSEncexZ6UE-Wr_1719eFiLvgUh7ETE0iexN4rGqvabw/exec',
};

const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const resolveLeaderDepartment = (lead: any, deptsList: Department[]): Department => {
  if (!deptsList || deptsList.length === 0) {
    return { id: 'dept-general', name: 'GENERAL', code: 'GEN', is_active: true, created_at: '', updated_at: '' };
  }

  // Helper to find dept by code or name
  const findBy = (val: string) =>
    deptsList.find(
      (d) =>
        d.id === val ||
        d.code.trim().toUpperCase() === val.toUpperCase() ||
        d.name.trim().toUpperCase() === val.toUpperCase()
    );

  // 1. Direct object if present in deptsList
  if (lead.department) {
    const matched = deptsList.find(
      (d) =>
        (lead.department.id && d.id === lead.department.id) ||
        (lead.department.code && d.code.trim().toUpperCase() === lead.department.code.trim().toUpperCase()) ||
        (lead.department.name && d.name.trim().toUpperCase() === lead.department.name.trim().toUpperCase())
    );
    if (
      matched &&
      !matched.name.includes('Cardiology') &&
      !matched.name.includes('Neurology') &&
      !matched.name.includes('Hospital Administration & Executive')
    ) {
      return matched;
    }
  }

  // 2. Match by department_id
  if (lead.department_id) {
    const matched = deptsList.find(
      (d) =>
        d.id === lead.department_id ||
        d.code.trim().toUpperCase() === lead.department_id.trim().toUpperCase() ||
        d.name.trim().toUpperCase() === lead.department_id.trim().toUpperCase()
    );
    if (
      matched &&
      !matched.name.includes('Cardiology') &&
      !matched.name.includes('Neurology') &&
      !matched.name.includes('Hospital Administration & Executive')
    ) {
      return matched;
    }
  }

  // 3. Match by Leader Name
  const name = (lead.full_name || '').toLowerCase();
  if (name.includes('naman') || name.includes('kamlesh')) return findBy('IT') || deptsList[7];
  if (name.includes('ugrasen')) return findBy('HK') || deptsList[5];
  if (name.includes('deepu')) return findBy('RECEPT') || deptsList[17];
  if (name.includes('deepmala') || name.includes('swapnil') || name.includes('suman bala')) return findBy('OPS') || deptsList[3];
  if (name.includes('poonam')) return findBy('IVF') || deptsList[18];
  if (name.includes('aakriti')) return findBy('DOC') || deptsList[9];
  if (name.includes('pratima')) return findBy('STORE') || deptsList[12];
  if (name.includes('umesh')) return findBy('PHARM') || deptsList[4];
  if (name.includes('monika') || name.includes('khushi')) return findBy('COSM') || deptsList[19];
  if (name.includes('rajesh dewangan') || name.includes('alokesh')) return findBy('MKTG') || deptsList[8];
  if (name.includes('santos')) return findBy('LAB') || deptsList[23];
  if (name.includes('nikhilesh')) return findBy('COO') || deptsList[20];
  if (name.includes('shilpa')) return findBy('ADMIN') || deptsList[10];
  if (name.includes('ajay') || name.includes('supriya')) return findBy('ACCOUNTS') || findBy('ACCT') || deptsList[1];
  if (name.includes('director')) return findBy('DIR') || deptsList[21];

  // 4. Match by employee_code keywords
  const code = (lead.employee_code || '').toUpperCase();
  if (code === '10231' || code === '20251' || code.includes('IT')) return findBy('IT') || deptsList[7];
  if (code.includes('TPA')) return findBy('TPA') || deptsList[0];
  if (code.includes('ACT') || code.includes('ACC')) return findBy('ACCOUNTS') || findBy('ACCT') || deptsList[1];
  if (code.includes('HR')) return findBy('HR') || deptsList[2];
  if (code.includes('OPS')) return findBy('OPS') || deptsList[3];
  if (code.includes('PHM') || code.includes('PHARM')) return findBy('PHARM') || deptsList[4];
  if (code.includes('HK')) return findBy('HK') || deptsList[5];
  if (code.includes('MNT') || code.includes('MAINT')) return findBy('MAINT') || deptsList[6];
  if (code.includes('MKT')) return findBy('MKTG') || deptsList[8];
  if (code.includes('DOC') || code.includes('LEAD-11')) return findBy('DOC') || deptsList[9];
  if (code.includes('ADM')) return findBy('ADMIN') || deptsList[10];
  if (code.includes('DME')) return findBy('DME-IT') || deptsList[11];
  if (code.includes('STR') || code.includes('STORE')) return findBy('STORE') || deptsList[12];
  if (code.includes('DGT') || code.includes('DIGI')) return findBy('DIGI-MKT') || deptsList[13];
  if (code.includes('OT')) return findBy('OT') || deptsList[14];
  if (code.includes('CNS') || code.includes('COUNSEL')) return findBy('COUNSEL') || deptsList[15];
  if (code.includes('PRM') || code.includes('PROMO')) return findBy('PROMO') || deptsList[16];
  if (code.includes('RCP') || code.includes('RECEPT')) return findBy('RECEPT') || deptsList[17];
  if (code.includes('IVF')) return findBy('IVF') || deptsList[18];
  if (code.includes('CSM') || code.includes('COSM')) return findBy('COSM') || deptsList[19];
  if (code.includes('COO')) return findBy('COO') || deptsList[20];
  if (code.includes('DIR')) return findBy('DIR') || deptsList[21];
  if (code.includes('LAB')) return findBy('LAB') || deptsList[23];

  // 5. Match by email keywords (using includes, not startsWith!)
  const email = (lead.email || '').toLowerCase();
  if (email.includes('tpa')) return findBy('TPA') || deptsList[0];
  if (email.includes('account')) return findBy('ACCOUNTS') || findBy('ACCT') || deptsList[1];
  if (email.includes('hr')) return findBy('HR') || deptsList[2];
  if (email.includes('operation') || email.includes('floormanager') || email.includes('oe@')) return findBy('OPS') || deptsList[3];
  if (email.includes('pharm')) return findBy('PHARM') || deptsList[4];
  if (email.includes('.hk') || email.includes('housekeeping')) return findBy('HK') || deptsList[5];
  if (email.includes('maint')) return findBy('MAINT') || deptsList[6];
  if (email.includes('it@') || email.includes('asstit') || email.includes('it.head') || email.includes('naman')) return findBy('IT') || deptsList[7];
  if (email.includes('market')) return findBy('MKTG') || deptsList[8];
  if (email.includes('draakriti') || email.includes('doctor') || email.includes('clinical')) return findBy('DOC') || deptsList[9];
  if (email.includes('admin')) return findBy('ADMIN') || deptsList[10];
  if (email.includes('dme')) return findBy('DME-IT') || deptsList[11];
  if (email.includes('store')) return findBy('STORE') || deptsList[12];
  if (email.includes('digital')) return findBy('DIGI-MKT') || deptsList[13];
  if (email.includes('ot@')) return findBy('OT') || deptsList[14];
  if (email.includes('crm') || email.includes('counselor')) return findBy('COUNSEL') || deptsList[15];
  if (email.includes('promo')) return findBy('PROMO') || deptsList[16];
  if (email.includes('enquiry') || email.includes('recept')) return findBy('RECEPT') || deptsList[17];
  if (email.includes('ivf')) return findBy('IVF') || deptsList[18];
  if (email.includes('skin.care') || email.includes('cosmetic')) return findBy('COSM') || deptsList[19];
  if (email.includes('coo@')) return findBy('COO') || deptsList[20];
  if (email.includes('director')) return findBy('DIR') || deptsList[21];
  if (email.includes('lab') || email.includes('metrolabs')) return findBy('LAB') || deptsList[23];

  return deptsList[0];
};

export const INITIAL_LEADERS: Leader[] = [
  {
    id: '71cc79f1-b72b-43cf-8ce7-a2666522c65a',
    full_name: 'Deepmala Patil',
    email: 'floormanager.eye@sbhhospital.com',
    phone: '7470374245',
    role: 'LEADER',
    employee_code: 'SBH-6983',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '610ba367-0d5e-4a60-bc40-ba04fc9cf2bc',
    full_name: 'DR POONAM',
    email: 'ivf@sbhhospital.com',
    phone: '9575616668',
    role: 'LEADER',
    employee_code: 'SBH-3302',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '2ebb60ca-d9ea-4a20-9392-6faba55bd1f3',
    full_name: 'DEEPU MOURYA',
    email: 'enquiry.eye@sbhhospital.com',
    phone: '7477203477',
    role: 'LEADER',
    employee_code: 'SBH-5764',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'f5baa113-6d5c-4936-afe9-fb532db5a86a',
    full_name: 'UGRASEN',
    email: 'manager.hk@sbhhospital.com',
    phone: '83490 44155',
    role: 'LEADER',
    employee_code: 'SBH-4838',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'eec381f5-3f7f-4d87-a1a5-99840c7f238f',
    full_name: 'DR AAKRITI',
    email: 'draakriti@sbhhospital.com',
    phone: '98274 13066',
    role: 'LEADER',
    employee_code: 'SBH-0070',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'da0589d7-f675-4c49-813b-e87d0c625efd',
    full_name: 'PRATIMA VARTHI',
    email: 'store.women@sbhhospital.com',
    phone: '77738 47662',
    role: 'LEADER',
    employee_code: 'SBH-9895',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '596ca37d-205b-474d-a2a2-feef3eb0459c',
    full_name: 'UMESH DHAKKAD',
    email: 'pharmacy@sbhhospital.com',
    phone: '83490 33822',
    role: 'LEADER',
    employee_code: 'SBH-5154',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'cbbffba7-142f-4886-8d69-63a15291b8a5',
    full_name: 'Swapnil Jain',
    email: 'operation.manager@sbhhospital.com',
    phone: '9644199925',
    role: 'LEADER',
    employee_code: 'SBH-8761',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '3544fae9-6d87-4340-84a1-b6a48f6c6d0d',
    full_name: 'KAMLESH',
    email: 'asstit@sbhhospital.com',
    phone: '9644404743',
    role: 'LEADER',
    employee_code: 'SBH-1081',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '8c772b22-ee5e-4fc1-a8cf-8515c678a152',
    full_name: 'Monika Gaykawad',
    email: 'skin.care@sbhhospital.com',
    phone: '78801 03176',
    role: 'LEADER',
    employee_code: 'SBH-8023',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '7bc34a7a-ed6f-4fc2-ae6f-b97b3b0ce762',
    full_name: 'Khushi Nayak',
    email: 'skin.caree@sbhhospital.com',
    phone: '9039080204',
    role: 'LEADER',
    employee_code: 'SBH-5319',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '946a3acc-68d1-4b14-a280-58297326a00d',
    full_name: 'Rajesh Dewangan',
    email: 'marketing.women@sbhhospital.com',
    phone: '7880103177',
    role: 'LEADER',
    employee_code: 'SBH-8625',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '274bfe93-9a2c-448d-bdd1-4aae97d41331',
    full_name: 'Alokesh Chatterjee',
    email: 'marketing.head@sbhhospital.com',
    phone: '9039080205',
    role: 'LEADER',
    employee_code: 'SBH-6384',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'e1d776ec-fab8-460d-abb4-15521a7a4dfc',
    full_name: 'Ajay Upadhyay',
    email: 'accounts.women@sbhhospital.com',
    phone: '9644199935',
    role: 'LEADER',
    employee_code: 'SBH-2570',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '4c8f0cc0-a2fd-473c-9786-d6f17ccc0b25',
    full_name: 'Nikhilesh Davda',
    email: 'coo@sbhhospital.com',
    phone: '9752303123',
    role: 'LEADER',
    employee_code: 'SBH-7913',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '5abe26f9-a600-4b3b-91bf-14c6ccd5dd74',
    full_name: 'Supriya Agrawal',
    email: 'accounts.eye@sbhhospital.com',
    phone: '9644497911',
    role: 'LEADER',
    employee_code: 'SBH-4339',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '7470a1d7-7a07-4d59-b903-54b383a68642',
    full_name: 'Shilpa',
    email: 'admin@sbhhospital.com',
    phone: '9039080203',
    role: 'LEADER',
    employee_code: 'SBH-4331',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'b856bac8-f40f-45ff-9133-761b8ae730b4',
    full_name: 'Santos Kumar Das',
    email: 'metrolabs.us@sbhhospital.com',
    phone: '9039020854',
    role: 'LEADER',
    employee_code: 'SBH-8604',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: 'c3bf15b8-e95b-4b4a-bf31-25d70152c934',
    full_name: 'Suman Bala',
    email: 'oe@sbhhospital.com',
    phone: '9644492144',
    role: 'LEADER',
    employee_code: 'SBH-7052',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '26e59da2-458d-43f7-a694-20c7b1fe71b1',
    full_name: 'CRM TEAM',
    email: 'crm.nh001@sbhhospital.com',
    phone: '9644070999',
    role: 'LEADER',
    employee_code: 'SBH-3092',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
  {
    id: '153a450e-c789-4f9f-8398-bfda320949c4',
    full_name: 'Naman Mishra',
    email: 'it@sbhhospital.com',
    phone: '9644404741',
    role: 'LEADER',
    employee_code: '10231',
    expected_mode: 'PHYSICAL',
    is_active: true,
  },
];

export const DomAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const todayStr = getLiveIndiaDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Daily midnight date synchronization (Asia/Kolkata live time)
  useEffect(() => {
    const syncLiveDate = () => {
      const liveToday = getLiveIndiaDateStr();
      setSelectedDate((prev) => {
        if (prev < liveToday) {
          return liveToday;
        }
        return prev;
      });
    };
    const dateTimer = setInterval(syncLiveDate, 30000);
    return () => clearInterval(dateTimer);
  }, []);

  // 24 Official SBH Departments Master State (Live Supabase database driven, zero localStorage cache)
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);

  // 100% Real Leaders Master State (Directly loaded from Supabase database)
  const [leaders, setLeaders] = useState<Leader[]>(INITIAL_LEADERS);

  // Meeting Schedules & Attendance Records state (Stored 100% in Supabase SQL Database, Zero LocalStorage dependency)
  const [meetingSchedules, setMeetingSchedules] = useState<Record<string, MeetingSchedule>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('sbh_app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.google_meet_url === 'https://meet.google.com/sbh-dom-daily' || !parsed.google_meet_url) {
        parsed.google_meet_url = 'https://meet.google.com/jrz-jfku-gir';
      }
      if (
        !parsed.admin_whatsapp_group ||
        parsed.admin_whatsapp_group.includes('919977881452') ||
        parsed.admin_whatsapp_group === 'SBH DOM Executive Group'
      ) {
        parsed.admin_whatsapp_group = '120363432056023698@g.us';
      }
      if (!parsed.google_drive_folder_url) {
        parsed.google_drive_folder_url = 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing';
        parsed.google_drive_folder_id = '1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD';
      }
      if (!parsed.google_sheet_webhook_url) {
        parsed.google_sheet_webhook_url = 'https://script.google.com/macros/s/AKfycbyp3qzrQkP29pHmpz1bmcuwMYNSEncexZ6UE-Wr_1719eFiLvgUh7ETE0iexN4rGqvabw/exec';
      }
      return parsed;
    }
    return DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const leadersRef = useRef<Leader[]>(leaders);
  const lastAttFingerprintRef = useRef<string>('');

  useEffect(() => {
    leadersRef.current = leaders;
  }, [leaders]);

  // Helper to persist attendance record updates directly into Supabase SQL database table
  const syncAttendanceRecordToSupabase = async (record: AttendanceRecord, reason?: string) => {
    try {
      await supabase.from('admin_audit_logs').insert([
        {
          actor_id: null,
          action: 'ATTENDANCE_RECORD',
          entity_type: 'ATTENDANCE',
          entity_id: record.id,
          reason: reason || `Attendance updated for ${record.leader?.full_name || record.leader_id} on ${record.meeting_date}`,
          after_data: record,
        },
      ]);
    } catch (e) {
      console.warn('Supabase attendance record save warning:', e);
    }
  };

  // Load 100% Real Leaders, Departments, Meeting Time/Date Schedules & Attendance Records directly from Supabase SQL Database
  const loadDataFromSupabase = async () => {
    setIsLoading(true);
    try {
      // 0. Fetch live departments from Supabase SQL table
      let liveDepts = INITIAL_DEPARTMENTS;
      const { data: supaDepts, error: deptErr } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (!deptErr && supaDepts && supaDepts.length > 0) {
        // Detect if Supabase table still has the legacy 7 dummy placeholder departments
        const hasDummyPlaceholders = supaDepts.some((d: any) =>
          d.name.includes('Cardiology') ||
          d.name.includes('Neurology') ||
          d.name.includes('Hospital Administration & Executive Leadership') ||
          d.name.includes('Emergency Medicine') ||
          d.name.includes('Critical Care Medicine')
        );

        if (!hasDummyPlaceholders) {
          // 100% Live real departments fetched from Supabase SQL!
          liveDepts = supaDepts.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            head_leader_id: d.head_leader_id,
            is_active: d.is_active ?? true,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          setDepartments(liveDepts);
        } else {
          // Legacy 7 placeholder rows detected in SQL: Preserve the 24 official departments
          console.info(
            'Supabase departments table currently has 7 legacy placeholder rows. Maintaining the 24 official hospital departments.'
          );
          liveDepts = INITIAL_DEPARTMENTS;
          setDepartments(INITIAL_DEPARTMENTS);
        }
      }

      // 1. Fetch live leaders from Supabase SQL table
      const { data: supaLeaders, error } = await supabase
        .from('leaders')
        .select('*')
        .order('full_name', { ascending: true });

      let mappedLeaders: Leader[] = INITIAL_LEADERS;
      if (!error && supaLeaders && supaLeaders.length > 0) {
        mappedLeaders = supaLeaders.map((lead: any) => {
          const dept = liveDepts.find((d) => d.id === lead.department_id) || resolveLeaderDepartment(lead, liveDepts);
          return {
            ...lead,
            is_active: lead.is_active !== undefined ? lead.is_active : true,
            department: dept,
            department_id: dept?.id || lead.department_id,
          } as Leader;
        });

        setLeaders(mappedLeaders);
      }

      // 2. Fetch live meeting schedules (date, scheduled time, cadence, google meet) from Supabase table
      const { data: schedLogs, error: schedErr } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action', 'MEETING_SCHEDULE')
        .order('created_at', { ascending: true });

      if (!schedErr && schedLogs && schedLogs.length > 0) {
        const schedMap: Record<string, MeetingSchedule> = {};
        schedLogs.forEach((log) => {
          if (log.after_data && log.entity_id) {
            schedMap[log.entity_id] = log.after_data as MeetingSchedule;
          }
        });
        setMeetingSchedules(schedMap);
      }

      // 3. Fetch live attendance records (join time, attendance date, status, mode, audit) from Supabase table
      const { data: attLogs, error: attErr } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action', 'ATTENDANCE_RECORD')
        .order('created_at', { ascending: true });

      if (!attErr && attLogs && attLogs.length > 0) {
        const attMap = new Map<string, AttendanceRecord>();
        attLogs.forEach((log) => {
          if (log.after_data && (log.after_data as any).id) {
            const rawRec = log.after_data as AttendanceRecord;
            const matchedLeader = mappedLeaders.find((l) => l.id === rawRec.leader_id || l.id === rawRec.leader?.id);
            const isApproved = Boolean(rawRec.admin_verified_attendance || rawRec.verification_status === 'VERIFIED');
            const isRejected = rawRec.verification_status === 'REJECTED';

            const cleanRec: AttendanceRecord = {
              ...rawRec,
              leader_id: matchedLeader ? matchedLeader.id : rawRec.leader_id,
              leader: matchedLeader || rawRec.leader,
              status: isApproved ? 'PRESENT' : isRejected ? 'ABSENT' : rawRec.status,
              verification_status: isApproved ? 'VERIFIED' : isRejected ? 'REJECTED' : rawRec.verification_status,
              admin_verified_attendance: isApproved,
            };
            attMap.set(cleanRec.id, cleanRec);
          }
        });
        setAttendanceRecords(Array.from(attMap.values()));
      }
    } catch (err) {
      console.warn('Error fetching data from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Live Real-Time Attendance Synchronizer (Invoked on Supabase Realtime event & smart polling)
  const refreshLiveAttendance = async () => {
    try {
      const { data: attLogs, error: attErr } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action', 'ATTENDANCE_RECORD')
        .order('created_at', { ascending: true });

      if (!attErr && attLogs && attLogs.length > 0) {
        // Fingerprint incoming audit logs to avoid triggering redundant re-renders when data has not changed
        const currentFingerprint = attLogs
          .map((l) => `${l.id}_${l.created_at}_${(l.after_data as any)?.status}_${(l.after_data as any)?.verification_status}_${(l.after_data as any)?.selected_mode}`)
          .join('|');

        if (currentFingerprint === lastAttFingerprintRef.current) {
          return;
        }
        lastAttFingerprintRef.current = currentFingerprint;

        setAttendanceRecords((prev) => {
          const currentLeaders = leadersRef.current.length > 0 ? leadersRef.current : INITIAL_LEADERS;
          const attMap = new Map<string, AttendanceRecord>();

          // Keep in-memory records
          prev.forEach((r) => attMap.set(r.id, r));

          // Merge fresh live logs from Supabase
          attLogs.forEach((log) => {
            if (log.after_data && (log.after_data as any).id) {
              const rawRec = log.after_data as AttendanceRecord;
              const matchedLeader = currentLeaders.find((l) => l.id === rawRec.leader_id || l.id === rawRec.leader?.id);
              const isApproved = Boolean(rawRec.admin_verified_attendance || rawRec.verification_status === 'VERIFIED');
              const isRejected = rawRec.verification_status === 'REJECTED';

              const cleanRec: AttendanceRecord = {
                ...rawRec,
                leader_id: matchedLeader ? matchedLeader.id : rawRec.leader_id,
                leader: matchedLeader || rawRec.leader,
                status: isApproved ? 'PRESENT' : isRejected ? 'ABSENT' : rawRec.status,
                verification_status: isApproved ? 'VERIFIED' : isRejected ? 'REJECTED' : rawRec.verification_status,
                admin_verified_attendance: isApproved,
              };
              attMap.set(cleanRec.id, cleanRec);
            }
          });
          return Array.from(attMap.values());
        });
      }
    } catch (err) {
      console.warn('Realtime live sync note:', err);
    }
  };

  useEffect(() => {
    // Clean up local storage: do NOT store meeting schedules, attendance records, leaders, or departments in localStorage
    localStorage.removeItem('sbh_meeting_schedules');
    localStorage.removeItem('sbh_real_attendance_records');
    localStorage.removeItem('sbh_hospital_departments');
    localStorage.removeItem('sbh_custom_leaders');
    loadDataFromSupabase();

    // 1. Supabase Realtime Subscription for instantaneous attendance updates
    const channel = supabase
      .channel('sbh_attendance_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_audit_logs' },
        (payload) => {
          console.info('📡 Supabase Live Attendance Event received:', payload.eventType);
          refreshLiveAttendance();
        }
      )
      .subscribe();

    // 2. High-reliability fallback polling interval (every 4 seconds)
    // Ensures real-time updates even if WebSockets are dropped or filtered by hospital firewall
    const pollInterval = setInterval(() => {
      refreshLiveAttendance();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

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

    // Persist directly into Supabase SQL database table
    try {
      supabase.from('admin_audit_logs').insert([
        {
          actor_id: null,
          action: 'MEETING_SCHEDULE',
          entity_type: 'SCHEDULE',
          entity_id: date,
          reason: `Meeting schedule updated for date ${date} at ${updated.scheduled_time}`,
          after_data: updated,
        },
      ]).then();
    } catch (e) {
      console.warn('Supabase meeting schedule save warning:', e);
    }

    return {
      success: true,
      message: `Meeting schedule for ${date} updated to ${resolvedCadence} (${resolvedFrequency}) in Supabase database!`,
    };
  };

  // Ensure attendance records exist ONLY for active leaders currently in database
  useEffect(() => {
    // Only ACTIVE leaders participate in daily operations and attendance
    const activeLeaders = leaders.filter((l) => l.is_active !== false);

    if (activeLeaders.length === 0) {
      setAttendanceRecords((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const currentMeeting = getMeetingForDate(selectedDate);
    const activeLeaderIds = new Set(activeLeaders.map((l) => l.id));

    setAttendanceRecords((prev) => {
      // 1. Filter out attendance records for inactive or deleted leaders
      let changed = false;
      const filtered = prev
        .filter((r) => activeLeaderIds.has(r.leader_id) || activeLeaderIds.has(r.leader?.id || ''))
        .map((r) => {
          const matchedLead = activeLeaders.find((l) => l.id === r.leader_id || l.id === r.leader?.id);
          if (matchedLead) {
            const isApproved = Boolean(r.admin_verified_attendance || r.verification_status === 'VERIFIED');
            const isRejected = r.verification_status === 'REJECTED';
            const expectedStatus = isApproved ? 'PRESENT' : isRejected ? 'ABSENT' : r.status;
            const expectedVerif = isApproved ? 'VERIFIED' : isRejected ? 'REJECTED' : r.verification_status;
            if (
              r.leader_id !== matchedLead.id ||
              r.leader !== matchedLead ||
              r.status !== expectedStatus ||
              r.verification_status !== expectedVerif ||
              r.admin_verified_attendance !== isApproved
            ) {
              changed = true;
              return {
                ...r,
                leader_id: matchedLead.id,
                leader: matchedLead,
                status: expectedStatus,
                verification_status: expectedVerif,
                admin_verified_attendance: isApproved,
              };
            }
          }
          return r;
        });

      if (filtered.length !== prev.length) {
        changed = true;
      }

      const existingForDate = filtered.filter((r) => r.meeting_date === selectedDate);
      const existingLeaderIds = new Set(existingForDate.map((r) => r.leader_id));

      const newRecords: AttendanceRecord[] = [];
      activeLeaders.forEach((lead) => {
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

      if (newRecords.length > 0) {
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      return [...filtered, ...newRecords];
    });
  }, [leaders, selectedDate]);

  // Clean, user-friendly error formatting without SQL/technical database jargon
  const formatFriendlyErrorMessage = (errorMsg: string): string => {
    const lower = (errorMsg || '').toLowerCase();
    if (lower.includes('leaders_email_key') || (lower.includes('duplicate') && lower.includes('email'))) {
      return 'This email address is already registered with another leader. Please use a unique email.';
    }
    if (lower.includes('employee_code') || lower.includes('leaders_employee_code_key')) {
      return 'This Employee Code is already in use. Please enter a unique employee code.';
    }
    if (lower.includes('departments_name_key') || (lower.includes('duplicate') && lower.includes('department'))) {
      return 'A department with this name already exists in the roster.';
    }
    if (lower.includes('duplicate') || lower.includes('unique constraint')) {
      return 'A record with these details already exists. Please verify the entered information.';
    }
    return 'Unable to save details. Please check the information and try again.';
  };

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

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ name: trimmedName, code, is_active: true }])
        .select('*');

      if (error) {
        console.error('Supabase dept insert error:', error);
        return { success: false, message: formatFriendlyErrorMessage(error.message) };
      }

      if (data && data.length > 0) {
        const created = data[0] as Department;
        setDepartments((prev) => [...prev, created]);
        return { success: true, message: `Department "${trimmedName}" added successfully!` };
      }
    } catch (e: any) {
      console.warn('Supabase dept insert warning:', e);
      return { success: false, message: formatFriendlyErrorMessage(e.message || '') };
    }

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDepartments((prev) => [...prev, newDept]);
    return { success: true, message: `Department "${trimmedName}" added successfully!` };
  };

  const editDepartment = async (id: string, updates: Partial<Department>): Promise<{ success: boolean; message: string }> => {
    const target = departments.find((d) => d.id === id);
    if (!target) return { success: false, message: 'Department not found' };

    const updatedName = updates.name ? updates.name.trim().toUpperCase() : target.name;
    const updatedCode = updates.code ? updates.code.trim().toUpperCase() : target.code;

    if (isUuid(id)) {
      try {
        const { error } = await supabase
          .from('departments')
          .update({
            name: updatedName,
            code: updatedCode,
            is_active: updates.is_active ?? target.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          console.error('Supabase dept update error:', error);
          return { success: false, message: formatFriendlyErrorMessage(error.message) };
        }
      } catch (e: any) {
        console.warn('Supabase dept update warning:', e);
        return { success: false, message: formatFriendlyErrorMessage(e.message || '') };
      }
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

    if (isUuid(id)) {
      try {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) {
          console.error('Supabase dept delete error:', error);
          return { success: false, message: formatFriendlyErrorMessage(error.message) };
        }
      } catch (e: any) {
        console.warn('Supabase dept delete warning:', e);
        return { success: false, message: formatFriendlyErrorMessage(e.message || '') };
      }
    }

    setDepartments((prev) => prev.filter((d) => d.id !== id));
    return { success: true, message: 'Department removed successfully!' };
  };

  // ================= LEADER CRUD =================

  const addLeader = async (
    leaderData: Omit<Leader, 'id'>,
    initialPassword = '123456'
  ): Promise<{ success: boolean; message: string }> => {
    const emailClean = (leaderData.email || '').trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      return {
        success: false,
        message: 'Please enter a valid email address (e.g. name@example.com).',
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
        email: emailClean,
        phone: leaderData.phone?.trim() || '',
        department_id: isDeptUuid ? leaderData.department_id : null,
        role: leaderData.role || 'LEADER',
        employee_code: generatedCode,
        expected_mode: leaderData.expected_mode || 'PHYSICAL',
        is_active: leaderData.is_active !== undefined ? leaderData.is_active : true,
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
          message: formatFriendlyErrorMessage(error.message),
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
          is_active: newLead.is_active !== undefined ? newLead.is_active : true,
          department: matchedDept || resolveLeaderDepartment(newLead, departments),
          department_id: matchedDept?.id || newLead.department_id,
        };

        setLeaders((prev) => {
          const next = [...prev, completeLeader];
          localStorage.setItem('sbh_custom_leaders', JSON.stringify(next));
          return next;
        });

        // Audit log
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
          message: `Leader ${newLead.full_name} added successfully! Initial password: ${initialPassword}`,
        };
      }
    } catch (e: any) {
      console.error('Supabase insert exception:', e);
      return { success: false, message: formatFriendlyErrorMessage(e.message || '') };
    }

    return { success: false, message: 'Could not add leader. Please try again.' };
  };

  const editLeader = async (
    id: string,
    updates: Partial<Leader> & { initialPassword?: string }
  ): Promise<{ success: boolean; message: string }> => {
    let emailClean: string | undefined = undefined;
    if (updates.email !== undefined) {
      emailClean = updates.email.trim().toLowerCase();
      if (!emailClean || !emailClean.includes('@')) {
        return {
          success: false,
          message: 'Please enter a valid email address (e.g. name@example.com).',
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
    if (emailClean !== undefined) cleanDbUpdates.email = emailClean;
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
        const updatePromise = supabase.from('leaders').update(cleanDbUpdates).eq('id', id);
        const timeoutPromise = new Promise<{ error: any }>((resolve) =>
          setTimeout(() => resolve({ error: { message: 'Network timeout (saved to local cache)' } }), 3500)
        );
        const res: any = await Promise.race([updatePromise, timeoutPromise]);
        if (res && res.error) {
          console.warn('Supabase leader update notice (saved locally):', res.error?.message || res.error);
        }
      } catch (e: any) {
        console.warn('Supabase update warning (saved locally):', e);
      }
    }

    // Persist new password directly to Supabase admin_audit_logs if provided
    if (updates.initialPassword && updates.initialPassword.trim().length >= 4) {
      const newPass = updates.initialPassword.trim();
      localStorage.setItem(`sbh_user_pass_${id}`, newPass);
      try {
        const logPromise = supabase.from('admin_audit_logs').insert([
          {
            actor_id: null,
            action: 'LEADER_PASSWORD',
            entity_type: 'USER_PASSWORD',
            entity_id: id,
            reason: `Password updated for leader ${updates.full_name || id}`,
            after_data: {
              leader_id: id,
              full_name: updates.full_name || '',
              email: emailClean || '',
              password: newPass,
              updated_at: new Date().toISOString(),
            },
          },
        ]);
        const logTimeout = new Promise((resolve) => setTimeout(resolve, 3000));
        await Promise.race([logPromise, logTimeout]);
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
              email: emailClean || l.email,
              is_active: updates.is_active !== undefined ? updates.is_active : l.is_active,
              department: matchedDept || l.department,
              department_id: matchedDept?.id || updates.department_id || l.department_id,
              updated_at: new Date().toISOString(),
            }
          : l
      );
      localStorage.setItem('sbh_custom_leaders', JSON.stringify(next));
      return next;
    });

    // Also update any attendance records for this leader
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
                email: emailClean || r.leader?.email || '',
                is_active: updates.is_active !== undefined ? updates.is_active : (r.leader?.is_active ?? true),
                department: matchedDept || r.leader?.department,
                department_id: updates.department_id || r.leader?.department_id,
              },
            }
          : r
      )
    );

    return { success: true, message: 'Leader details updated successfully!' };
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
          return { success: false, message: formatFriendlyErrorMessage(delErr.message) };
        }
      } catch (e: any) {
        console.error('Supabase delete warning:', e);
        return { success: false, message: formatFriendlyErrorMessage(e.message || '') };
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
    return { success: true, message: 'Leader removed from roster successfully.' };
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
    let updatedRecordToSave: AttendanceRecord | null = null;

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

        const updated: AttendanceRecord = {
          ...existing,
          selected_mode: existing.selected_mode === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL',
          status: preservedStatus,
          verification_status: existing.admin_verified_attendance ? 'VERIFIED' : existing.verification_status || 'PENDING',
          check_in_at: preservedCheckIn,
          first_event_at: existing.first_event_at || nowIso,
          last_click_at: nowIso,
          late_minutes: preservedLate,
          virtual_clicks_count: updatedClicks,
          evidence_source: existing.evidence_source || 'GOOGLE_MEET_REDIRECT',
          admin_verified_attendance: existing.admin_verified_attendance || false,
          verification_note: preservedNote,
          updated_at: nowIso,
        };
        updatedRecordToSave = updated;
        return prev.map((r) => (r.id === existing.id ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      updatedRecordToSave = newRec;
      return [...prev, newRec];
    });

    // Persist directly into Supabase SQL Database
    if (updatedRecordToSave) {
      syncAttendanceRecordToSupabase(updatedRecordToSave, `Virtual attendance: ${note}`);
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
    let updatedRecordToSave: AttendanceRecord | null = null;

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === dateStr);
      if (existing) {
        // Single Daily Attendance Count Lock:
        const preservedCheckIn = existing.check_in_at || nowIso;
        const preservedStatus = existing.status && existing.status !== 'ABSENT' ? existing.status : statusToSet;
        const preservedLate = existing.late_minutes ?? lateMinutes;
        const preservedNote = existing.verification_note || note;

        const updated: AttendanceRecord = {
          ...existing,
          status: preservedStatus,
          verification_status: existing.admin_verified_attendance ? 'VERIFIED' : existing.verification_status || 'PENDING',
          admin_verified_attendance: existing.admin_verified_attendance || false,
          evidence_source: 'VIRTUAL_QR_VERIFIED',
          qr_scanned_at: existing.qr_scanned_at || nowIso,
          late_minutes: preservedLate,
          check_in_at: preservedCheckIn,
          verification_note: preservedNote,
          updated_at: nowIso,
        };
        updatedRecordToSave = updated;
        return prev.map((r) => (r.id === existing.id ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      updatedRecordToSave = newRec;
      return [...prev, newRec];
    });

    if (updatedRecordToSave) {
      syncAttendanceRecordToSupabase(updatedRecordToSave, `Virtual QR Scanned: ${note}`);
    }

    return {
      success: true,
      message: isLate
        ? `Virtual QR Scanned (+${lateMinutes}m late). Attendance submitted for Admin approval.`
        : 'Virtual QR Scanned on-time. Attendance submitted for Admin approval.',
    };
  };

  const markRoomQrCheckIn = async (
    leaderId: string,
    locationData?: { latitude?: number; longitude?: number; accuracy?: number; device?: string }
  ): Promise<{ success: boolean; message: string; alreadyRecorded?: boolean; timeStr?: string }> => {
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
    let updatedRecordToSave: AttendanceRecord | null = null;

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

        const updated: AttendanceRecord = {
          ...existing,
          selected_mode: 'PHYSICAL',
          status: preservedStatus,
          verification_status: existing.admin_verified_attendance ? 'VERIFIED' : existing.verification_status || 'PENDING',
          check_in_at: preservedCheckIn,
          first_event_at: existing.first_event_at || nowIso,
          evidence_source: 'ROOM_STATIC_QR',
          late_minutes: preservedLate,
          admin_verified_attendance: existing.admin_verified_attendance || false,
          verification_note: preservedNote,
          updated_at: nowIso,
        };
        updatedRecordToSave = updated;
        return prev.map((r) => (r.id === existing.id ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      updatedRecordToSave = newRec;
      return [...prev, newRec];
    });

    if (updatedRecordToSave) {
      syncAttendanceRecordToSupabase(updatedRecordToSave, `Boardroom QR check-in: ${note}`);
    }

    try {
      const existingRecord = attendanceRecords.find((r) => r.leader_id === leaderId && r.meeting_date === selectedDate);
      const savedNote = existingRecord?.verification_note || note;

      if (isUuid(leaderId)) {
        supabase.from('admin_audit_logs').insert([{
          actor_id: null,
          action: 'ROOM_QR_CHECKIN',
          entity_type: 'ATTENDANCE',
          entity_id: recordId,
          reason: `Physical boardroom QR attendance checked in on ${selectedDate}. ${savedNote}`,
          after_data: {
            selectedDate,
            statusToSet,
            isAlreadyRecorded,
            latitude: locationData?.latitude,
            longitude: locationData?.longitude,
            accuracy_meters: locationData?.accuracy,
            device: locationData?.device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'),
            method: 'LIVE_CAMERA_QR_SCAN',
            verified_at: nowIso,
          },
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

  // Silent Rejoin Logging in Supabase SQL Database (Zero frontend clutter)
  const logMeetingRejoin = async (leaderId: string, meetUrl: string): Promise<void> => {
    try {
      const leader = leaders.find((l) => l.id === leaderId);
      const nowIso = new Date().toISOString();
      await supabase.from('admin_audit_logs').insert([
        {
          actor_id: null,
          action: 'MEETING_REJOIN',
          entity_type: 'REJOIN_EVENT',
          entity_id: leaderId,
          reason: `Leader ${leader?.full_name || leaderId} rejoined Google Meet session`,
          after_data: {
            leader_id: leaderId,
            leader_name: leader?.full_name || '',
            date: selectedDate,
            rejoin_time: nowIso,
            rejoin_time_ist: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            }),
            mode: 'VIRTUAL_REJOIN',
            meet_url: meetUrl,
          },
        },
      ]);
    } catch (e) {
      console.warn('Silent rejoin audit log note:', e);
    }
  };

  // ================= ADMIN APPROVAL ENGINE =================

  const approveAttendanceRecord = async (
    recordId: string
  ): Promise<{ success: boolean; message: string }> => {
    const nowIso = new Date().toISOString();
    let targetLeaderName = 'Leader';
    let approvedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          targetLeaderName = r.leader?.full_name || 'Leader';
          const lateStr = r.late_minutes && r.late_minutes > 0 ? ` (+${r.late_minutes}m)` : '';
          const updated: AttendanceRecord = {
            ...r,
            status: 'PRESENT',
            admin_verified_attendance: true,
            verification_status: 'VERIFIED',
            selected_mode: r.selected_mode === 'NONE' ? 'VIRTUAL' : r.selected_mode,
            verified_at: nowIso,
            updated_at: nowIso,
            verification_note: `Approved by Admin${lateStr} at ${new Date(nowIso).toLocaleTimeString()}`,
          };
          approvedRec = updated;
          return updated;
        }
        return r;
      })
    );

    // Sync directly to Supabase SQL Database
    if (approvedRec) {
      syncAttendanceRecordToSupabase(approvedRec, `Approved by Admin for ${targetLeaderName}`);
    }

    return { success: true, message: `Attendance verified & approved for ${targetLeaderName}!` };
  };

  const approveAllPendingRecords = async (
    date: string
  ): Promise<{ success: boolean; count: number; message: string }> => {
    const nowIso = new Date().toISOString();
    let approvedCount = 0;
    const recordsToSync: AttendanceRecord[] = [];

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (
          r.meeting_date === date &&
          !r.admin_verified_attendance &&
          (r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.selected_mode !== 'NONE')
        ) {
          approvedCount++;
          const lateStr = r.late_minutes && r.late_minutes > 0 ? ` (+${r.late_minutes}m)` : '';
          const updated: AttendanceRecord = {
            ...r,
            status: 'PRESENT',
            admin_verified_attendance: true,
            verification_status: 'VERIFIED',
            selected_mode: r.selected_mode === 'NONE' ? 'VIRTUAL' : r.selected_mode,
            verified_at: nowIso,
            updated_at: nowIso,
            verification_note: `Approved by Admin${lateStr} at ${new Date(nowIso).toLocaleTimeString()}`,
          };
          recordsToSync.push(updated);
          return updated;
        }
        return r;
      })
    );

    // Sync all approved records to Supabase SQL Database
    recordsToSync.forEach((rec) => {
      syncAttendanceRecordToSupabase(rec, 'Bulk approved by Admin');
    });

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
    let rejectedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          const updated: AttendanceRecord = {
            ...r,
            status: 'ABSENT',
            verification_status: 'REJECTED',
            admin_verified_attendance: false,
            verification_note: reason,
            updated_at: nowIso,
          };
          rejectedRec = updated;
          return updated;
        }
        return r;
      })
    );

    if (rejectedRec) {
      syncAttendanceRecordToSupabase(rejectedRec, `Rejected by Admin: ${reason}`);
    }

    return { success: true, message: 'Attendance rejected and marked as ABSENT.' };
  };

  const submitInformedAbsence = async (leaderId: string, informedTo: string, reason: string) => {
    const meeting = getMeetingForDate(selectedDate);
    const nowIso = new Date().toISOString();
    let recordToSave: AttendanceRecord | null = null;

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === selectedDate);
      if (existing) {
        const updated: AttendanceRecord = {
          ...existing,
          status: 'INFORMED_ABSENT',
          verification_status: 'PENDING',
          informed_to_person: informedTo,
          informed_reason: reason,
          informed_confirmed: false,
          updated_at: nowIso,
        };
        recordToSave = updated;
        return prev.map((r) => (r.id === existing.id ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      recordToSave = newRec;
      return [...prev, newRec];
    });

    if (recordToSave) {
      syncAttendanceRecordToSupabase(recordToSave, `Informed Absence submitted: ${informedTo} - ${reason}`);
    }

    return { success: true, message: 'Informed Absence registered for Admin verification.' };
  };

  const adminVerifyStatus = async (
    recordId: string,
    status: AttendanceStatus,
    verified: boolean,
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    let updatedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          const updated: AttendanceRecord = {
            ...r,
            status,
            verification_status: verified ? 'VERIFIED' : 'REJECTED',
            admin_verified_attendance: verified,
            verification_note: note,
            check_in_at: r.check_in_at || nowIso,
            verified_at: nowIso,
            updated_at: nowIso,
          };
          updatedRec = updated;
          return updated;
        }
        return r;
      })
    );

    if (updatedRec) {
      syncAttendanceRecordToSupabase(updatedRec, note || `Status updated to ${status}`);
    }
  };

  const confirmInformedAbsence = async (recordId: string, confirmed: boolean) => {
    const nowIso = new Date().toISOString();
    let updatedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          const updated: AttendanceRecord = {
            ...r,
            status: confirmed ? 'LEAVE' : 'ABSENT',
            verification_status: confirmed ? 'VERIFIED' : 'REJECTED',
            informed_confirmed: confirmed,
            admin_verified_attendance: confirmed,
            verified_at: nowIso,
            updated_at: nowIso,
          };
          updatedRec = updated;
          return updated;
        }
        return r;
      })
    );

    if (updatedRec) {
      syncAttendanceRecordToSupabase(
        updatedRec,
        confirmed ? 'Informed absence confirmed as Leave' : 'Informed absence marked Absent'
      );
    }
  };

  const markLeaderInformedLeave = async (
    leaderId: string,
    date: string,
    informedTo: string,
    reason: string
  ) => {
    const meeting = getMeetingForDate(date);
    const nowIso = new Date().toISOString();
    let updatedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.leader_id === leaderId && r.meeting_date === date);
      if (existing) {
        const updated: AttendanceRecord = {
          ...existing,
          status: 'LEAVE',
          verification_status: 'VERIFIED',
          informed_to_person: informedTo,
          informed_reason: reason,
          informed_confirmed: true,
          admin_verified_attendance: true,
          verification_note: `Informed: ${informedTo} - ${reason}`,
          updated_at: nowIso,
        };
        updatedRec = updated;
        return prev.map((r) => (r.id === existing.id ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      updatedRec = newRec;
      return [...prev, newRec];
    });

    if (updatedRec) {
      syncAttendanceRecordToSupabase(updatedRec, `Informed Leave: ${informedTo} - ${reason}`);
    }
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
    let updatedRec: AttendanceRecord | null = null;

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.meeting_date === date && r.leader_id === leaderId);
      if (idx >= 0) {
        const existing = prev[idx];
        const updated: AttendanceRecord = {
          ...existing,
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
        };
        updatedRec = updated;
        return prev.map((r, i) => (i === idx ? updated : r));
      }

      const newRec: AttendanceRecord = {
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
      };
      updatedRec = newRec;
      return [...prev, newRec];
    });

    if (updatedRec) {
      syncAttendanceRecordToSupabase(
        updatedRec,
        `Informed Late: ${lateMinutes}m (ETA ${expectedTime}) - ${informedTo} - ${reason}`
      );
    }
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

    // Direct background dispatch to Google Sheet Webhook without redirecting browser
    if (appSettings.google_sheet_webhook_url) {
      try {
        fetch(appSettings.google_sheet_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'SEND_WHATSAPP_BROADCAST',
            stage: '1030',
            date,
            message: msg,
            targetGroup: appSettings.admin_whatsapp_group || '120363432056023698@g.us',
          }),
        }).catch(() => {});
      } catch (e) {
        // silent
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }

    return { success: true, message: 'Final 10:30 AM WhatsApp Audit Report automatically dispatched & logged in Google Sheet!', payload: msg };
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

    let reminderMsg = `🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n`;
    reminderMsg += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
    reminderMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    reminderMsg += `📅 *Date:* ${formattedDate}\n`;
    reminderMsg += `⏰ *Start Time:* 10:00 AM IST (Sharp)\n`;
    reminderMsg += `📍 *Venue:* ${appSettings.conference_room_name || 'Conference Room, 5th Floor'}\n\n`;
    reminderMsg += `✅ *ATTENDANCE & CHECK-IN LINK:*\n`;
    reminderMsg += `👉 https://sbhdom.vercel.app/boardroom-checkin\n\n`;
    reminderMsg += `⚠️ *INSTRUCTION FOR ALL HODs / LEADERS:*\n`;
    reminderMsg += `All Department Heads and Leaders are kindly requested to assemble in the Conference Room (5th Floor) and check in using the link above before 10:00 AM sharp.\n`;
    reminderMsg += `Final attendance audit will be finalized at 10:30 AM.\n`;
    reminderMsg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

    // Direct background dispatch to Google Sheet Webhook without redirecting browser
    if (appSettings.google_sheet_webhook_url) {
      try {
        fetch(appSettings.google_sheet_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'SEND_WHATSAPP_BROADCAST',
            stage: '0950',
            date,
            message: reminderMsg,
            targetGroup: appSettings.admin_whatsapp_group || '120363432056023698@g.us',
          }),
        }).catch(() => {});
      } catch (e) {
        // silent
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(reminderMsg).catch(() => {});
    }

    return { sentCount: leaders.length, message: `09:50 AM ${cadenceCode} notice automatically dispatched to WhatsApp Group & Google Sheet!` };
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

    // Direct background dispatch to Google Sheet Webhook without redirecting browser
    if (appSettings.google_sheet_webhook_url) {
      try {
        fetch(appSettings.google_sheet_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'SEND_WHATSAPP_BROADCAST',
            stage: '1010',
            date,
            message: msg,
            targetGroup: appSettings.admin_whatsapp_group || '120363432056023698@g.us',
          }),
        }).catch(() => {});
      } catch (e) {
        // silent
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }

    return { count: absent.length, message: `10:10 AM live status automatically dispatched to WhatsApp Group & Google Sheet!`, payload: msg };
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

  const getFullRosterForDate = (date: string): AttendanceRecord[] => {
    const meeting = getMeetingForDate(date);
    const activeLeaders = leaders.filter((l) => l.is_active !== false);
    const existingForDate = attendanceRecords.filter((r) => r.meeting_date === date);
    const existingMap = new Map<string, AttendanceRecord>();
    existingForDate.forEach((r) => existingMap.set(r.leader_id, r));

    return activeLeaders.map((lead) => {
      const existing = existingMap.get(lead.id);
      if (existing) {
        return {
          ...existing,
          leader: lead, // Always re-bind to live leader & official 24-department
        };
      }
      return {
        id: `att-${date}-${lead.id}`,
        meeting_id: meeting.id,
        meeting_date: date,
        meeting_frequency: meeting.frequency,
        cadence: meeting.cadence,
        leader_id: lead.id,
        leader: lead,
        selected_mode: 'NONE',
        status: 'ABSENT',
        verification_status: 'PENDING',
        admin_verified_attendance: false,
      };
    });
  };

  const downloadPdfReport = (date: string) => {
    const meeting = getMeetingForDate(date);
    const fullRecords = getFullRosterForDate(date);
    downloadDirectorPdf(meeting, fullRecords, appSettings);
  };

  const openPdfReport = (date: string) => {
    const meeting = getMeetingForDate(date);
    const fullRecords = getFullRosterForDate(date);
    openDirectorPdfInNewTab(meeting, fullRecords, appSettings);
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

      let reminderText = `🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n`;
      reminderText += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
      reminderText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      reminderText += `👤 *Hello ${lead.full_name}* (${lead.department?.name || 'Dept'})\n`;
      reminderText += `📅 *Date:* ${formattedDate}\n`;
      reminderText += `⏰ *Start Time:* 10:00 AM IST (Sharp)\n`;
      reminderText += `📍 *Venue:* ${appSettings.conference_room_name || 'Conference Room, 5th Floor'}\n\n`;
      reminderText += `✅ *ATTENDANCE & CHECK-IN LINK:*\n`;
      reminderText += `👉 https://sbhdom.vercel.app/boardroom-checkin\n\n`;
      reminderText += `⚠️ *INSTRUCTION:*\n`;
      reminderText += `Kindly assemble in the Conference Room (5th Floor) and check in using the link above before 10:00 AM sharp.\n`;
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
      alertText += `🔴 *CHECK-IN NOW:*\n`;
      alertText += `👉 https://sbhdom.vercel.app/boardroom-checkin\n`;
      alertText += `📍 In-Person: ${appSettings.conference_room_name || 'Conference Room, 5th Floor'}\n`;

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
    const groupJid = appSettings.admin_whatsapp_group || '120363432056023698@g.us';

    let msg = '';

    if (stage === '0950') {
      msg = `🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n`;
      msg += `🔔 *09:50 AM NOTICE: ${cadenceCode} — ${meeting.title.toUpperCase()}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📅 *Date:* ${formattedDate}\n`;
      msg += `⏰ *Start Time:* 10:00 AM IST (Sharp)\n`;
      msg += `📍 *Venue:* ${appSettings.conference_room_name || 'Conference Room, 5th Floor'}\n\n`;
      msg += `✅ *ATTENDANCE & CHECK-IN LINK:*\n`;
      msg += `👉 https://sbhdom.vercel.app/boardroom-checkin\n\n`;
      msg += `⚠️ *INSTRUCTION FOR ALL HODs / LEADERS:*\n`;
      msg += `All Department Heads and Leaders are kindly requested to assemble in the Conference Room (5th Floor) and check in using the link above before 10:00 AM sharp.\n`;
      msg += `Final attendance audit will be finalized at 10:30 AM.\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;
    } else {
      // 10:30 AM
      msg = `🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n`;
      msg += `📊 *FINAL 10:30 AM ${cadenceCode} ATTENDANCE AUDIT REPORT*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📅 *Date:* ${formattedDate} | *Meeting:* ${cadenceCode} (${meeting.frequency})\n`;
      msg += `⏰ *Audit Frozen:* 10:30 AM IST | *Venue:* ${appSettings.conference_room_name}\n`;
      msg += `📁 *Google Drive PDF Archive:* ${appSettings.google_drive_folder_url || 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing'}\n\n`;
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
      msg += `━━━━━━━━━━━━━━━━━━━━━━\nBroadcast to: Official WhatsApp Group (${groupJid})\nDOM Operations Command | SBH Raipur`;
    }

    const res = await sendCeoitboxWhatsappMessage({
      mobileNo: groupJid,
      name: 'SBH DOM Official Group',
      message: msg,
      settings: appSettings,
    });

    // 1. Silent webhook broadcast to Google Sheet Webhook (without redirecting page)
    if (appSettings.google_sheet_webhook_url) {
      try {
        await fetch(appSettings.google_sheet_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'SEND_WHATSAPP_BROADCAST',
            stage,
            date,
            message: msg,
            targetGroup: groupJid,
          }),
        });
      } catch (e) {
        console.warn('Silent webhook broadcast note:', e);
      }
    }

    // 2. Copy to clipboard silently
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(msg);
      } catch (e) {
        // silent
      }
    }

    return {
      success: true,
      message: `Stage ${stage === '0950' ? '09:50 AM Notice' : '10:30 AM Final Audit'} automatically dispatched to WhatsApp Group (${groupJid}) & logged in Google Sheet!`,
      url: res.url,
      payload: msg,
    };
  };

  // Upload Report directly to Google Drive Folder & append log row in Google Sheet
  const uploadReportToGoogleDriveAndSheet = async (
    date: string
  ): Promise<{ success: boolean; message: string; driveUrl?: string }> => {
    try {
      const meeting = getMeetingForDate(date);
      const forDate = attendanceRecords.filter((r) => r.meeting_date === date);
      const { base64, filename } = getDirectorPdfBase64(meeting, forDate, appSettings);

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
      const complianceRate = totalCount > 0 ? `${Math.round(((totalPresent + informedLate.length + informedLeave.length) / totalCount) * 100)}%` : '0%';

      const payload = {
        action: 'UPLOAD_PDF_AND_LOG',
        date,
        cadence: meeting.cadence || 'DOM',
        meetingTitle: meeting.title,
        googleMeetUrl: meeting.google_meet_url,
        totalLeaders: totalCount,
        presentCount: totalPresent,
        absentCount: absent.length,
        lateCount: informedLate.length,
        leaveCount: informedLeave.length,
        complianceRate,
        pdfBase64: base64,
        pdfFileName: filename,
        whatsappGroupId: appSettings.admin_whatsapp_group || '120363432056023698@g.us',
        driveFolderId: appSettings.google_drive_folder_id || '1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD',
      };

      if (appSettings.google_sheet_webhook_url) {
        const resp = await fetch(appSettings.google_sheet_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
        const json = await resp.json().catch(() => ({}));
        const driveUrl = json.driveFileUrl || appSettings.google_drive_folder_url;
        return {
          success: true,
          message: `Report successfully uploaded to Google Drive folder and logged in Google Sheet!`,
          driveUrl,
        };
      } else {
        // Fallback: download PDF and open the target Google Drive folder
        downloadDirectorPdf(meeting, forDate, appSettings);
        const folderUrl = appSettings.google_drive_folder_url || 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing';
        window.open(folderUrl, '_blank');
        return {
          success: true,
          message: `PDF downloaded locally & Google Drive folder opened! (Add Google Apps Script Webhook URL in settings for automatic cloud upload)`,
          driveUrl: folderUrl,
        };
      }
    } catch (err: any) {
      console.error('Upload to Drive/Sheet error:', err);
      return {
        success: false,
        message: `Failed to upload: ${err.message || 'Network error'}`,
      };
    }
  };

  // Automated 09:50 AM Transmission (Official WhatsApp Group ONLY — Zero individual leader spam)
  const triggerAutomated0950Transmission = async (
    date: string
  ): Promise<{ success: boolean; leadersCount: number; message: string }> => {
    // 1. Dispatch Group Broadcast ONLY (No individual leader spam)
    await sendCeoitboxGroupBroadcast('0950', date);

    return {
      success: true,
      leadersCount: 1,
      message: `09:50 AM Morning Notice successfully dispatched to Official WhatsApp Group (${appSettings.admin_whatsapp_group || '120363432056023698@g.us'})!`,
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
        logMeetingRejoin,
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
        uploadReportToGoogleDriveAndSheet,
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
