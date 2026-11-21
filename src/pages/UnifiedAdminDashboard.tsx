import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Video,
  Building,
  Calendar,
  Send,
  KeyRound,
  QrCode,
  Search,
  MessageSquare,
  HelpCircle,
  Check,
  AlertTriangle,
  Hospital,
  Sparkles,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  Clock,
  Settings2,
  Repeat,
  AlertCircle,
  TrendingUp,
  Copy,
  FileText,
  Download,
  Printer,
  Zap,
  Menu,
  ChevronDown,
  LayoutGrid,
  Plus,
  BarChart3,
  Home,
  ExternalLink,
  Share2,
  UserX,
  UserCheck,
  Loader2,
  X,
  List,
  Grid,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { useNavigate } from 'react-router-dom';
import { Leader, Department, AttendanceStatus, MeetingFrequency, CadenceType, AttendanceRecord } from '../types/database';
import { getCadenceInfo, formatLateDuration } from '../lib/meetingUtils';
import { MeetingCalendarView } from '../components/MeetingCalendarView';
import { AnalyticsReportsView } from '../components/AnalyticsReportsView';
import { generateDailyMeetingLink } from '../lib/meetingLinks';
import sbhLogo from '../assets/sbh-logo.png';
import { BoardroomQrPosterModal } from '../components/BoardroomQrPosterModal';
import { generateDirectorPdf } from '../lib/pdfGenerator';

const SidebarSystemClock: React.FC = React.memo(() => {
  const [timeStr, setTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-[12px] font-black font-mono text-[#1f2d2a]">
      {timeStr}
    </span>
  );
});

const LiveIndiaClockAndCountdown: React.FC<{ currentCadence: string }> = React.memo(({ currentCadence }) => {
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    const h = time.getHours();
    const m = time.getMinutes();
    const s = time.getSeconds();
    const nowSecs = h * 3600 + m * 60 + s;

    const target0950 = 9 * 3600 + 50 * 60; // 09:50 AM
    const target1000 = 10 * 3600;           // 10:00 AM
    const target1030 = 10 * 3600 + 30 * 60; // 10:30 AM

    const dayOfWeek = time.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isTodaySunday = dayOfWeek === 0;

    let diff = 0;
    let targetMilestone = '';
    let stageTitle = `Next ${currentCadence} Standup In`;

    if (isTodaySunday) {
      // Today is Sunday (Weekly Off) -> Next standup is Monday 10:00 AM IST
      diff = (24 * 3600 - nowSecs) + target1000;
      targetMilestone = 'Monday 10:00 AM IST';
      stageTitle = 'Sunday Off • Next DOM Standup';
    } else if (nowSecs < target0950) {
      diff = target0950 - nowSecs;
      targetMilestone = '09:50 AM IST';
    } else if (nowSecs < target1000) {
      diff = target1000 - nowSecs;
      targetMilestone = '10:00 AM IST';
    } else if (nowSecs < target1030) {
      diff = target1030 - nowSecs;
      targetMilestone = '10:30 AM IST';
    } else {
      // After 10:30 AM today:
      // If today is Saturday (6), tomorrow is Sunday (Weekly Off). Next standup is Monday (2 days away)!
      if (dayOfWeek === 6) {
        diff = (24 * 3600 - nowSecs) + (24 * 3600) + target1000;
        targetMilestone = 'Monday 10:00 AM IST';
        stageTitle = 'Next DOM Standup (Monday)';
      } else {
        diff = (24 * 3600 - nowSecs) + target1000;
        targetMilestone = 'Tomorrow 10:00 AM IST';
      }
    }

    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    const liveIndiaTime = time.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return {
      hoursStr: pad(hours),
      minsStr: pad(mins),
      secsStr: pad(secs),
      targetMilestone,
      stageTitle,
      liveIndiaTime,
    };
  }, [time, currentCadence]);

  return (
    <>
      {/* Card 1: Live India Time (IST) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-[#2e7d32]" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>Live India Time (IST)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-lg font-black font-mono text-[#1f2d2a] leading-tight">
            {countdown.liveIndiaTime}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Card 2: Next Standup Countdown */}
      <div className="bg-[#1f2d2a] p-3 rounded-xl border border-black/40 shadow-2xs text-white flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            {countdown.stageTitle}
          </div>
          <div className="text-xl font-black font-mono tracking-tight flex items-center gap-1 text-emerald-300 mt-0.5">
            <span>{countdown.hoursStr}</span><span className="text-slate-400 text-xs font-normal">HRS</span>
            <span className="text-slate-600">:</span>
            <span>{countdown.minsStr}</span><span className="text-slate-400 text-xs font-normal">MIN</span>
            <span className="text-slate-600">:</span>
            <span className="text-white">{countdown.secsStr}</span><span className="text-slate-400 text-xs font-normal">SEC</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-slate-200">
            Target: {countdown.targetMilestone}
          </span>
        </div>
      </div>
    </>
  );
});

// Haversine formula: Computes distance in meters from SBH Group of Hospital, Raipur (21.2514° N, 81.6296° E)
const calculateCampusDistanceMeters = (lat?: number, lon?: number): number | null => {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return null;
  const hospitalLat = 21.2514;
  const hospitalLon = 81.6296;
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (hospitalLat * Math.PI) / 180;
  const Δφ = ((hospitalLat - lat) * Math.PI) / 180;
  const Δλ = ((hospitalLon - lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export const UnifiedAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    logoutAdmin,
    updateAdminPassword,
    updateAdminProfileAndCredentials,
    adminName,
    adminProfile,
    fetchLiveAdminProfile,
  } = useAuthSession();
  const {
    leaders,
    departments,
    attendanceRecords,
    selectedDate,
    setSelectedDate,
    getMeetingForDate,
    updateMeetingSchedule,
    addDepartment,
    editDepartment,
    deleteDepartment,
    addLeader,
    editLeader,
    deleteLeader,
    approveAttendanceRecord,
    approveAllPendingRecords,
    rejectAttendanceRecord,
    markLeaderInformedLeave,
    markLeaderInformedLate,
    adminVerifyStatus,
    confirmInformedAbsence,
    sendDailyWhatsappReport,
    sendMeetingReminderNotice,
    sendNonAttendeesEscalationNotice,
    generateEmailReportDraft,
    downloadPdfReport,
    openPdfReport,
    downloadMonthlyPdfReport,
    downloadYearlyPdfReport,
    sendDirectorCeoitboxWhatsapp,
    sendDirectorPdfToWhatsappGroup,
    sendCeoitboxRemindersToAll,
    sendCeoitboxEscalationToNonAttendees,
    sendCeoitboxGroupBroadcast,
    triggerAutomated0950Transmission,
    uploadReportToGoogleDriveAndSheet,
    getFullRosterForDate,
    generateNonAttendeesEscalationEmail,
    appSettings,
    updateAppSettings,
  } = useDomApp();

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'primary' | 'warning' | 'danger' | 'success';
    isExecuting?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    type?: 'primary' | 'warning' | 'danger' | 'success';
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Confirm',
      type: opts.type || 'primary',
      onConfirm: opts.onConfirm,
    });
  };

  // Escalation Email Modal state
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationData, setEscalationData] = useState<{
    subject: string;
    body: string;
    toEmails: string[];
    mailtoUrl: string;
    absentCount: number;
  } | null>(null);

  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Automatic Daily Scheduled WhatsApp Group Broadcasts (Strictly 2 Stages: 09:50 AM & 10:30 AM)
  const [autoCeoitboxDispatch, setAutoCeoitboxDispatch] = useState<boolean>(() => {
    return localStorage.getItem('sbh_auto_ceoitbox_enabled') !== 'false';
  });

  // Automated background scheduler for 09:50 AM and 10:30 AM dispatches (Zero re-renders, silky smooth performance)
  useEffect(() => {
    if (!autoCeoitboxDispatch) return;

    const timer = setInterval(() => {
      const now = new Date();
      // Skip Sundays automatically: No DOM standup on Sunday
      if (now.getDay() === 0) return;

      const h = now.getHours();
      const m = now.getMinutes();
      const todayDate = now.toISOString().split('T')[0];

      // Stage 1: 09:50 AM Auto-Broadcast
      if (h === 9 && m === 50) {
        const key = `sbh_auto_group_0950_${todayDate}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, 'dispatched');
          triggerAutomated0950Transmission(todayDate);
          setToastAlert({
            type: 'success',
            text: '🔔 09:50 AM Automated Transmission Active: Notice broadcast to WhatsApp Group + all Leaders with 15-min Magic Links!',
          });
          setTimeout(() => setToastAlert(null), 8000);
        }
      }

      // Stage 2: 10:30 AM Auto-Broadcast
      if (h === 10 && m === 30) {
        const key = `sbh_auto_group_1030_${todayDate}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, 'dispatched');
          sendCeoitboxGroupBroadcast('1030', todayDate);
          setToastAlert({
            type: 'success',
            text: '📊 10:30 AM Final Leadership Audit Report automatically dispatched to WhatsApp Group!',
          });
          setTimeout(() => setToastAlert(null), 8000);
        }
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [autoCeoitboxDispatch]);

  const currentMeeting = getMeetingForDate(selectedDate);
  const currentCadence = currentMeeting.cadence || (currentMeeting.frequency === 'MONTHLY' ? 'MOM' : currentMeeting.frequency === 'WEEKLY' ? 'WOM' : 'DOM');

  // India Date & Time calculation for Mark Present business rules
  const [currentIstTime, setCurrentIstTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIstTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const todayIST = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(currentIstTime);
  }, [currentIstTime]);

  const isSelectedDateToday = selectedDate === todayIST;

  const isSunday = useMemo(() => {
    return new Date(selectedDate + 'T00:00:00').getDay() === 0;
  }, [selectedDate]);

  const isHolidayOrRemovedDom = currentMeeting.cadence === 'HOLIDAY' || Boolean(currentMeeting.is_holiday_or_shifted);

  const isAfter0930Am = useMemo(() => {
    const indiaParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(currentIstTime);
    const h = parseInt(indiaParts.find((p) => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(indiaParts.find((p) => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m >= 570; // 09:30 AM IST = 570 minutes
  }, [currentIstTime]);

  const canMarkPresent = isSelectedDateToday && !isSunday && !isHolidayOrRemovedDom && isAfter0930Am;

  // Active Tab: 'attendance' | 'calendar' | 'reports' | 'leaders' | 'departments' | 'settings' | 'links' | 'geo-history'
  const [activeTab, setActiveTab] = useState<
    'attendance' | 'calendar' | 'reports' | 'leaders' | 'departments' | 'settings' | 'links' | 'geo-history'
  >('attendance');

  // Attendance Geo-History Filter States
  const [geoSearchTerm, setGeoSearchTerm] = useState<string>('');
  const [geoModeFilter, setGeoModeFilter] = useState<'ALL' | 'PHYSICAL' | 'VIRTUAL'>('ALL');
  const [geoCampusFilter, setGeoCampusFilter] = useState<'ALL' | 'ON_CAMPUS' | 'REMOTE'>('ALL');
  const [geoDateFilter, setGeoDateFilter] = useState<string>(selectedDate);

  // Daily Meeting Links state
  const [copiedLeaderId, setCopiedLeaderId] = useState<string | null>(null);
  const [copiedAllLinks, setCopiedAllLinks] = useState<boolean>(false);
  const [showVirtualQrModal, setShowVirtualQrModal] = useState<boolean>(false);
  const [linksSearchTerm, setLinksSearchTerm] = useState<string>('');

  // Menu Dropdown State
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Modals
  const [showAddLeaderModal, setShowAddLeaderModal] = useState(false);
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null);
  const [isSavingLeader, setIsSavingLeader] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showQrDisplayModal, setShowQrDisplayModal] = useState(false);
  const [showScheduleEditModal, setShowScheduleEditModal] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [leaderSearchTerm, setLeaderSearchTerm] = useState('');
  const [leaderDeptFilter, setLeaderDeptFilter] = useState('ALL');
  const [leaderViewMode, setLeaderViewMode] = useState<'list' | 'grid'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [toastAlert, setToastAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string; url?: string } | null>(null);

  // Dedicated Group Dispatch Modal State (Guarantees messages go strictly to group and never to ex-employee)
  const [groupDispatchModal, setGroupDispatchModal] = useState<{
    isOpen: boolean;
    stage: '0950' | '1030';
    message: string;
    title: string;
  } | null>(null);
  const [copiedGroupNotice, setCopiedGroupNotice] = useState(false);

  // Informed Leave Modal State
  const [informedLeaveModal, setInformedLeaveModal] = useState<{
    isOpen: boolean;
    leaderId: string;
    leaderName: string;
    departmentName: string;
    informedTo: string;
    reason: string;
  }>({
    isOpen: false,
    leaderId: '',
    leaderName: '',
    departmentName: '',
    informedTo: 'Director Sir',
    reason: 'Emergency Hospital Duty',
  });

  // Informed Late Modal State (Leaders informing 10m, 15m, 30m late with Admin Approval)
  const [informedLateModal, setInformedLateModal] = useState<{
    isOpen: boolean;
    leaderId: string;
    leaderName: string;
    departmentName: string;
    lateMinutes: number;
    expectedTime: string;
    informedTo: string;
    reason: string;
    adminApproved: boolean;
  }>({
    isOpen: false,
    leaderId: '',
    leaderName: '',
    departmentName: '',
    lateMinutes: 15,
    expectedTime: '10:15 AM',
    informedTo: 'Director Sir',
    reason: 'Ward Rounds / Patient Emergency',
    adminApproved: true,
  });

  // Form states for Leader Add/Edit
  const [leaderForm, setLeaderForm] = useState<{
    full_name: string;
    email: string;
    phone: string;
    department_id: string;
    employee_code: string;
    expected_mode: 'PHYSICAL' | 'VIRTUAL';
    role: 'LEADER' | 'DIRECTOR' | 'ADMIN' | 'HR' | 'SUPER_ADMIN';
    is_active: boolean;
    initialPassword?: string;
  }>({
    full_name: '',
    email: '',
    phone: '',
    department_id: '',
    employee_code: '',
    expected_mode: 'PHYSICAL',
    role: 'LEADER',
    is_active: true,
    initialPassword: '123456',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Department Master Form State
  const [deptForm, setDeptForm] = useState<{ name: string; code: string; is_active: boolean }>({
    name: '',
    code: '',
    is_active: true,
  });
  const [deptFormError, setDeptFormError] = useState('');
  const [deptFormSuccess, setDeptFormSuccess] = useState('');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');

  // Meeting Schedule Edit Form State with DOM, WOM, MOM, HOLIDAY
  const [schedForm, setSchedForm] = useState<{
    title: string;
    frequency: MeetingFrequency;
    cadence: CadenceType;
    scheduled_time: string;
    is_holiday_or_shifted: boolean;
    shift_reason: string;
    google_meet_url: string;
  }>({
    title: currentMeeting.title,
    frequency: currentMeeting.frequency,
    cadence: currentCadence,
    scheduled_time: currentMeeting.scheduled_time,
    is_holiday_or_shifted: currentMeeting.is_holiday_or_shifted,
    shift_reason: currentMeeting.shift_reason || '',
    google_meet_url: currentMeeting.google_meet_url,
  });

  // Admin Credentials & Profile State (Stored in Supabase SQL)
  const [adminUsernameInput, setAdminUsernameInput] = useState(adminProfile?.username || 'admin');
  const [adminFullNameInput, setAdminFullNameInput] = useState(adminProfile?.full_name || 'Administrator');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ success?: boolean; text?: string } | null>(null);

  // Synchronize inputs when modal opens
  useEffect(() => {
    if (showPasswordModal && adminProfile) {
      setAdminUsernameInput(adminProfile.username || 'admin');
      setAdminFullNameInput(adminProfile.full_name || 'Administrator');
      setOldPass('');
      setNewPass('');
      setPassMsg(null);
    }
  }, [showPasswordModal, adminProfile]);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Helper functions for Attendance Classification (strictly mutually exclusive)
  const isPresentRecord = (r: AttendanceRecord) =>
    r.verification_status !== 'REJECTED' &&
    r.status !== 'LEAVE' &&
    r.status !== 'INFORMED_ABSENT' &&
    (Boolean(r.admin_verified_attendance) ||
      r.verification_status === 'VERIFIED' ||
      r.status === 'PRESENT' ||
      (r.selected_mode !== 'NONE' && r.status !== 'ABSENT'));

  const isPhysicalRecord = (r: AttendanceRecord) =>
    isPresentRecord(r) && r.selected_mode === 'PHYSICAL';

  const isVirtualRecord = (r: AttendanceRecord) =>
    isPresentRecord(r) && r.selected_mode === 'VIRTUAL';

  const isLateRecord = (r: AttendanceRecord) =>
    r.status === 'INFORMED_LATE' || ((r.late_minutes ?? 0) > 0 && isPresentRecord(r));

  const isLeaveRecord = (r: AttendanceRecord) =>
    r.status === 'LEAVE' || r.status === 'INFORMED_ABSENT';

  const isAbsentRecord = (r: AttendanceRecord) =>
    !isPresentRecord(r) &&
    !isLeaveRecord(r) &&
    r.status !== 'INFORMED_LATE' &&
    (r.status === 'ABSENT' ||
      r.verification_status === 'REJECTED' ||
      (r.status === 'PENDING' && r.selected_mode === 'NONE'));

  // Complete official roster for selected date (all active leaders represented)
  const recordsForDate = getFullRosterForDate(selectedDate);
  const filteredRecords = recordsForDate.filter((r) => {
    const nameMatch =
      r.leader?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.leader?.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.leader?.employee_code && r.leader.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const statusMatch =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PRESENT'
          ? isPresentRecord(r)
          : statusFilter === 'PHYSICAL'
            ? isPhysicalRecord(r)
            : statusFilter === 'VIRTUAL'
              ? isVirtualRecord(r)
              : statusFilter === 'INFORMED_LATE'
                ? isLateRecord(r)
                : statusFilter === 'LEAVE' || statusFilter === 'INFORMED_ABSENT'
                  ? isLeaveRecord(r)
                  : statusFilter === 'ABSENT'
                    ? isAbsentRecord(r)
                    : r.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Calculate live statistics
  const totalLeaders = leaders.length;
  const countPresent = recordsForDate.filter(isPresentRecord).length;
  const countPhysical = recordsForDate.filter(isPhysicalRecord).length;
  const countVirtual = recordsForDate.filter(isVirtualRecord).length;
  const countLate = recordsForDate.filter(isLateRecord).length;
  const countInformed = recordsForDate.filter(isLeaveRecord).length;
  const countAbsent = recordsForDate.filter(isAbsentRecord).length;
  const turnoutPercent = totalLeaders > 0 ? Math.round((countPresent / totalLeaders) * 100) : 0;

  // Handle Leader Add / Edit Submit with Loading Animation
  const handleSaveLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSavingLeader(true);

    try {
      if (editingLeader) {
        const res = await editLeader(editingLeader.id, leaderForm);
        setIsSavingLeader(false);
        if (res.success) {
          setFormSuccess(res.message);
          setTimeout(() => {
            setShowAddLeaderModal(false);
            setEditingLeader(null);
          }, 1000);
        } else {
          setFormError(res.message);
        }
      } else {
        const res = await addLeader(leaderForm, leaderForm.initialPassword);
        setIsSavingLeader(false);
        if (res.success) {
          setFormSuccess(res.message);
          setTimeout(() => {
            setShowAddLeaderModal(false);
            setLeaderForm({
              full_name: '',
              email: '',
              phone: '',
              department_id: departments[0]?.id || '',
              employee_code: '',
              expected_mode: 'PHYSICAL',
              role: 'LEADER',
              is_active: true,
              initialPassword: '123456',
            });
          }, 1000);
        } else {
          setFormError(res.message);
        }
      }
    } catch (err: any) {
      setIsSavingLeader(false);
      setFormError('Unable to save leader details. Please check the information.');
    }
  };

  const handleToggleLeaderStatus = async (leader: Leader) => {
    const nextStatus = !leader.is_active;
    const actionLabel = nextStatus ? 'ACTIVATE' : 'DISABLE';
    if (
      window.confirm(
        `Are you sure you want to ${actionLabel} ${leader.full_name}?\n\n${
          nextStatus
            ? 'This leader will be restored to the attendance register and notifications.'
            : 'This leader will be hidden from daily attendance and excluded from reminders.'
        }`
      )
    ) {
      const res = await editLeader(leader.id, { is_active: nextStatus });
      if (res.success) {
        setToastAlert({
          type: 'success',
          text: `${leader.full_name} is now ${nextStatus ? 'ACTIVE' : 'DISABLED'}.`,
        });
        setTimeout(() => setToastAlert(null), 3500);
      } else {
        alert(res.message);
      }
    }
  };

  const openEditLeaderModal = (leader: Leader) => {
    setEditingLeader(leader);
    const matchedDept = departments.find(
      (d) =>
        d.id === leader.department_id ||
        d.id === leader.department?.id ||
        (leader.department?.name && d.name.trim().toLowerCase() === leader.department.name.trim().toLowerCase()) ||
        (leader.department?.code && d.code.trim().toLowerCase() === leader.department.code.trim().toLowerCase()) ||
        (leader.employee_code && (leader.employee_code === '20251' || leader.employee_code.includes('IT')) && d.code === 'IT') ||
        (leader.email && leader.email.toLowerCase().includes('it@') && d.code === 'IT') ||
        (leader.full_name && leader.full_name.toLowerCase().includes('naman') && d.code === 'IT')
    );
    setLeaderForm({
      full_name: leader.full_name,
      email: leader.email,
      phone: leader.phone,
      department_id: matchedDept?.id || leader.department_id || leader.department?.id || (departments[0]?.id || ''),
      employee_code: leader.employee_code || '',
      expected_mode: leader.expected_mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL',
      role: leader.role,
      is_active: leader.is_active ?? true,
      initialPassword: leader.password || '123456',
    });
    setFormError('');
    setFormSuccess('');
    setShowAddLeaderModal(true);
  };

  const handleDeleteLeader = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from hospital leadership list?`)) {
      const res = await deleteLeader(id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  // Department Master Handlers
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFormError('');
    setDeptFormSuccess('');
    setIsSavingDept(true);

    try {
      if (editingDept) {
        const res = await editDepartment(editingDept.id, deptForm);
        setIsSavingDept(false);
        if (res.success) {
          setDeptFormSuccess(res.message);
          setTimeout(() => {
            setShowAddDeptModal(false);
            setEditingDept(null);
          }, 1000);
        } else {
          setDeptFormError(res.message);
        }
      } else {
        const res = await addDepartment({ name: deptForm.name, code: deptForm.code });
        setIsSavingDept(false);
        if (res.success) {
          setDeptFormSuccess(res.message);
          setTimeout(() => {
            setShowAddDeptModal(false);
            setDeptForm({ name: '', code: '', is_active: true });
          }, 1000);
        } else {
          setDeptFormError(res.message);
        }
      }
    } catch (err: any) {
      setIsSavingDept(false);
      setDeptFormError('Unable to save department. Please try again.');
    }
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      is_active: dept.is_active ?? true,
    });
    setDeptFormError('');
    setDeptFormSuccess('');
    setShowAddDeptModal(true);
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete department "${name}" from Master?`)) {
      const res = await deleteDepartment(id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setIsSavingAdmin(true);
    try {
      const res = await updateAdminProfileAndCredentials({
        username: adminUsernameInput,
        full_name: adminFullNameInput,
        oldPass,
        newPass: newPass && newPass.trim().length >= 4 ? newPass.trim() : undefined,
      });
      setPassMsg({ success: res.success, text: res.message });
      if (res.success) {
        setOldPass('');
        setNewPass('');
      }
    } catch (err: any) {
      setPassMsg({ success: false, text: err?.message || 'Error updating administrator credentials.' });
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    updateMeetingSchedule(selectedDate, schedForm);
    setShowScheduleEditModal(false);
  };

  const handleCadenceSelectionInModal = (cad: CadenceType) => {
    const info = getCadenceInfo(cad);
    setSchedForm((prev) => ({
      ...prev,
      cadence: cad,
      frequency: info.frequency,
      title: info.defaultTitle,
      is_holiday_or_shifted: cad === 'HOLIDAY',
      shift_reason: cad === 'HOLIDAY' ? 'Operations Stand-down / Public Holiday' : '',
    }));
  };

  const handleSendReminderNotice = () => {
    sendMeetingReminderNotice(selectedDate);
  };

  const handleCeoitboxDirectorReport = async () => {
    setToastAlert({ type: 'info', text: 'Broadcasting official report to Director Sir via CEOITBOX WhatsApp API...' });
    const res = await sendDirectorCeoitboxWhatsapp(selectedDate);
    setToastAlert({ type: 'success', text: res.message, url: res.url });
    setTimeout(() => setToastAlert(null), 6000);
  };

  const handleCeoitboxBroadcastReminders = async () => {
    setToastAlert({ type: 'info', text: `Broadcasting reminders to ${leaders.length} leaders via CEOITBOX WhatsApp API...` });
    const res = await sendCeoitboxRemindersToAll(selectedDate);
    setToastAlert({ type: 'success', text: res.message });
    setTimeout(() => setToastAlert(null), 6000);
  };

  const handleCeoitboxEscalateNonAttendees = async () => {
    setToastAlert({ type: 'info', text: 'Broadcasting "Kindly Join" alert to non-attendees via CEOITBOX WhatsApp API...' });
    const res = await sendCeoitboxEscalationToNonAttendees(selectedDate);
    setToastAlert({ type: 'success', text: res.message });
    setTimeout(() => setToastAlert(null), 6000);
  };

  const handleTriggerAutomatedTransmission = async () => {
    setToastAlert({
      type: 'info',
      text: '⚡ Dispatching 09:50 AM Morning Notice to Official WhatsApp Group...',
    });
    try {
      const res = await triggerAutomated0950Transmission(selectedDate);
      setToastAlert({
        type: 'success',
        text: res.message,
      });
      setTimeout(() => setToastAlert(null), 8000);
    } catch (err: any) {
      setToastAlert({
        type: 'error',
        text: 'Automated transmission failed: ' + (err?.message || 'Check network / API'),
      });
      setTimeout(() => setToastAlert(null), 6000);
    }
  };

  const handleSendGroupCeoitbox = async (stage: '0950' | '1030') => {
    setToastAlert({
      type: 'info',
      text: `Broadcasting ${stage === '0950' ? '09:50 AM Notice' : '10:30 AM Report'} to Official WhatsApp Group...`,
    });
    try {
      const res = await sendCeoitboxGroupBroadcast(stage, selectedDate);
      setToastAlert({
        type: 'success',
        text: res.message,
        url: res.url,
      });
      setTimeout(() => setToastAlert(null), 8000);
    } catch (err: any) {
      setToastAlert({
        type: 'error',
        text: 'Group broadcast failed: ' + (err?.message || 'Check connection'),
      });
      setTimeout(() => setToastAlert(null), 5000);
    }
  };

  // Direct PDF Sharing into WhatsApp Group (CEOITBOX Direct API + Native OS share)
  const handleSharePdfDirectly = async (date: string) => {
    try {
      const meeting = getMeetingForDate(date);
      const forDate = getFullRosterForDate(date);
      const doc = generateDirectorPdf(meeting, forDate, appSettings);
      const pdfBlob = doc.output('blob');
      const cadence = meeting.cadence || 'DOM';
      const filename = `SBH_${cadence}_Report_${date}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Structured WhatsApp Caption
      const captionText = `🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\n📊 *OFFICIAL ${cadence} LEADERSHIP ATTENDANCE REPORT (${date})*\n━━━━━━━━━━━━━━━━━━━━━━\n• Total Expected: ${forDate.length}\n• Attended: ${forDate.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length}\n• Approved Late: ${forDate.filter((r) => r.status === 'INFORMED_LATE' || (r.late_minutes && r.late_minutes > 0)).length}\n• Approved Leave: ${forDate.filter((r) => r.status === 'LEAVE').length}\n• Absent / Unreported: ${forDate.filter((r) => r.status === 'ABSENT' || (!r.admin_verified_attendance && r.status === 'PENDING' && r.selected_mode === 'NONE')).length}\n\n📄 *Official Signed Director Attendance PDF Report Attached*\n━━━━━━━━━━━━━━━━━━━━━━\nDOM Operations Command | SBH Raipur`;

      // 1. Direct Ceoitbox PDF Dispatch to WhatsApp Group (120363432056023698@g.us) via /api/v1/message/create
      const dispatchPromise = sendDirectorPdfToWhatsappGroup(date);
      uploadReportToGoogleDriveAndSheet(date).catch((e) => console.warn('Background sync note:', e));

      // 2. If mobile Native Web Share is available, invoke it simultaneously
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `SBH Hospital ${cadence} Report - ${date}`,
            text: captionText,
            files: [pdfFile],
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.warn('Web Share note:', shareErr);
          }
        }
      }

      const res = await dispatchPromise;
      if (res.success) {
        setToastAlert({
          type: 'success',
          text: `🎉 Official PDF Report directly dispatched to WhatsApp Group (${appSettings.admin_whatsapp_group || '120363432056023698@g.us'}) via Ceoitbox API!`,
        });
      } else {
        setToastAlert({
          type: 'info',
          text: `PDF dispatched: ${res.message}`,
        });
      }
      setTimeout(() => setToastAlert(null), 6000);
    } catch (err: any) {
      console.error('Error in handleSharePdfDirectly:', err);
      setToastAlert({
        type: 'error',
        text: `Share error: ${err.message}`,
      });
      setTimeout(() => setToastAlert(null), 5000);
    }
  };

  const handleUploadToDriveAndSheet = async () => {
    setIsSyncingDrive(true);
    setToastAlert({
      type: 'info',
      text: 'Generating official PDF report & archiving to Supabase database...',
    });
    try {
      const res = await uploadReportToGoogleDriveAndSheet(selectedDate);
      if (res.success) {
        setToastAlert({
          type: 'success',
          text: res.message,
          url: res.driveUrl,
        });
      } else {
        setToastAlert({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setToastAlert({
        type: 'error',
        text: `Archive error: ${err.message || 'Check network connection'}`,
      });
    } finally {
      setIsSyncingDrive(false);
      setTimeout(() => setToastAlert(null), 9000);
    }
  };

  // Filtered departments for Master view
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearchTerm.toLowerCase())
  );

  const renderSidebarNav = (isMobile: boolean = false) => (
    <>
      {/* Sidebar Header: Hospital Emblem & Title */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200 bg-white/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 border border-[#dcdcdc] shadow-xs">
            <img src={sbhLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-[#1f2d2a] tracking-tight uppercase leading-none">
              SBH <span className="text-[#2e7d32]">DOM PORTAL</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">
              Daily Operations Meeting
            </span>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Live Clock Pill inside Sidebar */}
      <div className="p-3 mx-2 my-2 rounded-2xl bg-white border border-[#dcdcdc] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-[#2e7d32] text-white">
              <Clock size={11} strokeWidth={3} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Clock</span>
          </div>
          <SidebarSystemClock />
        </div>
      </div>

      {/* Sidebar Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
        <div className="px-3 pt-2 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Command Center
          </span>
        </div>

        {/* 🏠 Homepage Button: Live Attendance Register */}
        <button
          onClick={() => {
            setActiveTab('attendance');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Home size={18} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} className={activeTab === 'attendance' ? 'text-white' : 'text-[#2e7d32] flex-shrink-0'} />
            <span className="truncate">Live Attendance Register</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-[#cfead6] text-[#2e7d32] border border-[#2e7d32]/20'}`}>
            Live
          </span>
        </button>

        {/* 🔗 Daily Meeting Links Button */}
        <button
          onClick={() => {
            setActiveTab('links');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'links'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Video size={18} strokeWidth={activeTab === 'links' ? 2.5 : 2} className={activeTab === 'links' ? 'text-white' : 'text-teal-600 flex-shrink-0'} />
            <span className="truncate">Daily Meeting Links</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'links' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            Meet
          </span>
        </button>

        {/* 📍 Attendance Geo-History Button */}
        <button
          onClick={() => {
            setActiveTab('geo-history');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'geo-history'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <MapPin size={18} strokeWidth={activeTab === 'geo-history' ? 2.5 : 2} className={activeTab === 'geo-history' ? 'text-white' : 'text-rose-600 flex-shrink-0'} />
            <span className="truncate">Attendance Geo-History</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'geo-history' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            Geo Log
          </span>
        </button>

        {/* 👥 Leaders Roster Button */}
        <button
          onClick={() => {
            setActiveTab('leaders');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'leaders'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users size={18} strokeWidth={activeTab === 'leaders' ? 2.5 : 2} className={activeTab === 'leaders' ? 'text-white' : 'text-[#2e7d32] flex-shrink-0'} />
            <span className="truncate">Hospital Leaders Roster</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'leaders' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            {leaders.length}
          </span>
        </button>

        {/* 🏢 Departments Master Button */}
        <button
          onClick={() => {
            setActiveTab('departments');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Building size={18} strokeWidth={activeTab === 'departments' ? 2.5 : 2} className={activeTab === 'departments' ? 'text-white' : 'text-blue-600 flex-shrink-0'} />
            <span className="truncate">Departments Master</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'departments' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            {departments.length}
          </span>
        </button>

        {/* 📅 DOM / WOM / MOM Calendar Button */}
        <button
          onClick={() => {
            setActiveTab('calendar');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Calendar size={18} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} className={activeTab === 'calendar' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
            <span className="truncate">Cadence Calendar</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'calendar' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            {currentCadence}
          </span>
        </button>

        {/* 📊 Graphical Analytics Button */}
        <button
          onClick={() => {
            setActiveTab('reports');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <BarChart3 size={18} strokeWidth={activeTab === 'reports' ? 2.5 : 2} className={activeTab === 'reports' ? 'text-white' : 'text-purple-600 flex-shrink-0'} />
            <span className="truncate">Graphical Analytics</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            Graphs
          </span>
        </button>

        {/* ⚙️ WhatsApp & Settings Button */}
        <button
          onClick={() => {
            setActiveTab('settings');
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#2e7d32] text-white shadow-md shadow-emerald-700/20 transform scale-[1.01]'
              : 'text-[#1f2d2a] hover:bg-[#cfead6]/40 hover:text-[#2e7d32]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Shield size={18} strokeWidth={activeTab === 'settings' ? 2.5 : 2} className={activeTab === 'settings' ? 'text-white' : 'text-emerald-600 flex-shrink-0'} />
            <span className="truncate">WhatsApp & Gateway</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
            Config
          </span>
        </button>

        {/* PDF Reports Section */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Download PDF Reports
          </span>
        </div>

        <button
          onClick={() => downloadPdfReport(selectedDate)}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#1f2d2a] hover:bg-slate-100 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
        >
          <Download size={16} className="text-[#2e7d32] shrink-0" />
          <span className="truncate">Daily Attendance PDF</span>
        </button>
        <button
          onClick={() => downloadMonthlyPdfReport('October 2026')}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#1f2d2a] hover:bg-slate-100 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
        >
          <Download size={16} className="text-[#2e7d32] shrink-0" />
          <span className="truncate">Monthly MOM Audit PDF</span>
        </button>
        <button
          onClick={() => downloadYearlyPdfReport(2026)}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#1f2d2a] hover:bg-slate-100 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
        >
          <Download size={16} className="text-[#2e7d32] shrink-0" />
          <span className="truncate">Annual Hospital Audit PDF</span>
        </button>
      </div>

      {/* Sidebar Footer with Admin Controls & Clean Logout */}
      <div className="p-3 border-t border-slate-200 bg-white/50 space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-[#cfead6] text-[#2e7d32] flex items-center justify-center font-black text-xs border border-[#2e7d32]/20">
            <Shield size={16} className="text-[#2e7d32]" />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="truncate font-black text-[#1f2d2a] text-xs leading-tight">
              {adminProfile?.full_name || 'Administrator'}
            </div>
            <div className="text-[9px] text-[#2e7d32] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="truncate">Operations Command • SBH Raipur</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              setShowQrDisplayModal(true);
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-[#1f2d2a] border border-[#dcdcdc] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs hover:border-[#2e7d32]"
            title="Boardroom Static QR"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Room QR</span>
          </button>
          <button
            onClick={() => {
              setShowPasswordModal(true);
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-[#1f2d2a] border border-[#dcdcdc] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs hover:border-[#2e7d32]"
            title="Change Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Password</span>
          </button>
        </div>
        <button
          onClick={() => {
            logoutAdmin();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2.5 p-3 bg-white text-rose-600 font-bold text-[12px] tracking-wider rounded-2xl border border-rose-100 hover:bg-rose-50 transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8faf9] flex font-sans antialiased text-[#1f2d2a]">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex w-68 xl:w-72 bg-slate-50 text-[#1f2d2a] shrink-0 sticky top-0 h-[calc(100vh-2.5rem)] flex-col border-r border-[#dcdcdc] z-30 shadow-sm overflow-hidden">
        {renderSidebarNav(false)}
      </aside>

      {/* Mobile Drawer Navigation (Slide-in) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div
            className="fixed inset-0 modal-backdrop transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-50 flex flex-col border-r border-[#dcdcdc] shadow-2xl overflow-hidden z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarNav(true)}
          </aside>
        </div>
      )}

      {/* ================= RIGHT DASHBOARD CONTENT AREA ================= */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-[#f8faf9] pb-16">
        {/* Mobile Top Navbar (lg:hidden) */}
        <div className="lg:hidden sticky top-0 z-40 w-full bg-white border-b border-[#dcdcdc] px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl text-[#1f2d2a] hover:bg-slate-100 border border-[#dcdcdc] cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg p-1 border border-[#dcdcdc] shadow-2xs">
                <img src={sbhLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-[#1f2d2a] leading-none">
                  SBH <span className="text-[#2e7d32]">DOM PORTAL</span>
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Live Sync v2.1
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
              {selectedDate}
            </div>
            <a
              href={currentMeeting.google_meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-[#2e7d32] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
              title="Google Meet"
            >
              <Video size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">Meet</span>
            </a>
          </div>
        </div>

        {/* Toast Alert Banner */}
        {toastAlert && (
          <div className={`p-3 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-40 transition-all ${toastAlert.type === 'success'
              ? 'bg-[#2e7d32] text-white shadow-md'
              : toastAlert.type === 'info'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-rose-600 text-white shadow-md'
            }`}>
            <Zap className="w-4 h-4 animate-bounce" />
            <span>{toastAlert.text}</span>
            {toastAlert.url && (
              <a
                href={toastAlert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-mono text-[11px] ml-2 bg-white/20 px-2 py-0.5 rounded hover:bg-white/30"
              >
                Verify Transmission &rarr;
              </a>
            )}
            <button
              onClick={() => setToastAlert(null)}
              className="ml-4 font-black hover:opacity-80 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Bar Attached to Dashboard */}
        <header className="sticky top-0 z-[100] w-full bg-white border-b border-[#dcdcdc] shadow-sm">
          <div className="px-4 sm:px-6 py-3.5 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1f2d2a] tracking-tight flex items-center gap-3 uppercase">
                  {activeTab === 'attendance' && (
                    <>
                      Daily Attendance <span className="text-[#2e7d32]">Register ({currentCadence})</span>
                      <span className="px-3 py-1 rounded-xl bg-[#cfead6] border border-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] tracking-wider whitespace-nowrap uppercase">
                        Live Sync v2.1
                      </span>
                    </>
                  )}
                  {activeTab === 'links' && (
                    <>
                      Daily Meeting <span className="text-[#2e7d32]">Links & Tracker</span>
                      <span className="px-3 py-1 rounded-xl bg-[#cfead6] border border-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] tracking-wider whitespace-nowrap uppercase">
                        {selectedDate}
                      </span>
                    </>
                  )}
                  {activeTab === 'geo-history' && (
                    <>
                      Attendance <span className="text-[#2e7d32]">Geo-History & Location Logs</span>
                      <span className="px-3 py-1 rounded-xl bg-[#cfead6] border border-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] tracking-wider whitespace-nowrap uppercase">
                        Live GPS Verification
                      </span>
                    </>
                  )}
                  {activeTab === 'calendar' && (
                    <>
                      Cadence <span className="text-[#2e7d32]">Calendar (DOM / WOM / MOM)</span>
                    </>
                  )}
                  {activeTab === 'reports' && (
                    <>
                      Graphical <span className="text-[#2e7d32]">Analytics & Absenteeism</span>
                    </>
                  )}
                  {activeTab === 'leaders' && (
                    <>
                      Hospital Leaders <span className="text-[#2e7d32]">Roster</span>
                      <span className="px-3 py-1 rounded-xl bg-[#cfead6] border border-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] tracking-wider whitespace-nowrap uppercase">
                        {leaders.length} Leaders
                      </span>
                    </>
                  )}
                  {activeTab === 'departments' && (
                    <>
                      Hospital <span className="text-[#2e7d32]">Departments Master</span>
                      <span className="px-3 py-1 rounded-xl bg-[#cfead6] border border-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] tracking-wider whitespace-nowrap uppercase">
                        {departments.length} Depts
                      </span>
                    </>
                  )}
                  {activeTab === 'settings' && (
                    <>
                      WhatsApp Gateway <span className="text-[#2e7d32]">& Settings</span>
                    </>
                  )}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-80">
                  Raipur Hospital Operations • Venue: {appSettings.conference_room_name}
                </p>
              </div>
            </div>

            {/* Right Header: Date Selector and Google Meet button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-[#dcdcdc] shadow-xs">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-[11px] font-bold text-slate-600">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-[#1f2d2a] text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
              </div>

              <a
                href={currentMeeting.google_meet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase cursor-pointer"
                title="Open Google Meet"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Google Meet</span>
              </a>
            </div>
          </div>
        </header>

        {/* Main Body Container Attached Directly to the Right of Sidebar */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Top Meeting Header for Non-Attendance Tabs */}
          {activeTab !== 'attendance' && (
            <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-xs px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-xs text-xs shrink-0 ${
                    currentCadence === 'MOM'
                      ? 'bg-purple-600'
                      : currentCadence === 'WOM'
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-br from-[#2e7d32] to-teal-700'
                  }`}
                >
                  {currentCadence}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {currentCadence} Cadence
                    </span>
                    <span className="text-sm font-bold text-[#1f2d2a]">{currentMeeting.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Scheduled: {currentMeeting.scheduled_time} • Raipur Hospital Operations
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSchedForm({
                      title: currentMeeting.title,
                      frequency: currentMeeting.frequency,
                      cadence: currentCadence,
                      scheduled_time: currentMeeting.scheduled_time,
                      is_holiday_or_shifted: currentMeeting.is_holiday_or_shifted,
                      shift_reason: currentMeeting.shift_reason || '',
                      google_meet_url: currentMeeting.google_meet_url,
                    });
                    setShowScheduleEditModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Modify Cadence</span>
                </button>

                <button
                  onClick={handleSendReminderNotice}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Notice</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 1: ATTENDANCE REGISTER ================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Executive Command Center */}
              <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-xs relative overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 absolute top-0 left-0" />

                {/* Row 1: Meeting Cadence, Title, Time, Meet Link & Header Actions */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-sm text-sm shrink-0 ${
                        currentCadence === 'MOM'
                          ? 'bg-purple-600'
                          : currentCadence === 'WOM'
                            ? 'bg-blue-600'
                            : currentMeeting.is_holiday_or_shifted
                              ? 'bg-amber-600'
                              : 'bg-gradient-to-br from-[#2e7d32] to-teal-700'
                      }`}
                    >
                      {currentCadence}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-[#cfead6] border border-[#2e7d32]/25 px-2.5 py-0.5 rounded-full">
                          {currentCadence === 'MOM' && 'MOM Strategic'}
                          {currentCadence === 'WOM' && 'WOM Review'}
                          {currentCadence === 'DOM' && 'DOM — Daily Operations Standup'}
                          {currentCadence === 'HOLIDAY' && 'Holiday'}
                        </span>
                        {currentMeeting.is_holiday_or_shifted && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Shifted
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#1f2d2a] tracking-tight">{currentMeeting.title}</h2>
                      <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-bold text-[#1f2d2a] font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#2e7d32]" />
                          Scheduled: {currentMeeting.scheduled_time}
                        </span>
                        <span className="text-slate-300">•</span>
                        <a
                          href={currentMeeting.google_meet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors text-xs"
                        >
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          <span>Meet Link</span>
                        </a>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium text-xs">Venue: {appSettings.conference_room_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
                    <button
                      onClick={() => {
                        setSchedForm({
                          title: currentMeeting.title,
                          frequency: currentMeeting.frequency,
                          cadence: currentCadence,
                          scheduled_time: currentMeeting.scheduled_time,
                          is_holiday_or_shifted: currentMeeting.is_holiday_or_shifted,
                          shift_reason: currentMeeting.shift_reason || '',
                          google_meet_url: currentMeeting.google_meet_url,
                        });
                        setShowScheduleEditModal(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Modify Date / Cadence</span>
                    </button>

                    <button
                      onClick={handleSendReminderNotice}
                      className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send {currentCadence} WhatsApp Notice</span>
                    </button>

                    <button
                      onClick={() => sendNonAttendeesEscalationNotice(selectedDate)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Escalate Non-Attendees</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Live India Time (IST), Countdown, and Daily Operations Action Bar */}
                <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  {/* Isolated Live India Time & Standup Countdown (Zero re-renders on parent dashboard) */}
                  <LiveIndiaClockAndCountdown currentCadence={currentCadence} />

                  {/* Card 3: Action Buttons & Auto Broadcast Engine */}
                  <div className="flex flex-wrap items-center justify-start md:justify-end gap-1.5">
                    <button
                      onClick={() =>
                        openConfirm({
                          title: 'Broadcast 09:50 AM Morning Notice',
                          message:
                            'Broadcast official 09:50 AM assembly notice with the boardroom check-in link to the Official WhatsApp Group?',
                          type: 'primary',
                          confirmText: 'Send Broadcast',
                          onConfirm: handleTriggerAutomatedTransmission,
                        })
                      }
                      className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                      title="Broadcast 09:50 AM Notice to Official WhatsApp Group"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                      <span>09:50 AM Broadcast</span>
                    </button>

                    <button
                      onClick={() =>
                        openConfirm({
                          title: 'Approve All Joined Leaders',
                          message: `Verify and approve attendance for all pending leaders who joined today (${selectedDate})?`,
                          type: 'success',
                          confirmText: 'Approve All',
                          onConfirm: async () => {
                            const res = await approveAllPendingRecords(selectedDate);
                            setToastAlert({ type: 'success', text: res.message });
                            setTimeout(() => setToastAlert(null), 5000);
                          },
                        })
                      }
                      className="px-2.5 py-1.5 bg-[#cfead6] hover:bg-[#b8e4c3] text-[#2e7d32] border border-[#2e7d32]/25 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all duration-150"
                      title="Approve all leaders who have joined on this date"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                      <span>Approve Joined</span>
                    </button>

                    <button
                      onClick={() =>
                        openConfirm({
                          title: 'Submit & Direct Share PDF to WhatsApp Group',
                          message: `Directly share official signed DOM attendance PDF report for ${selectedDate} to the Official WhatsApp Group (${appSettings.admin_whatsapp_group || '120363432056023698@g.us'})?\n\n• Total Scheduled: ${totalLeaders}\n• Total Joined: ${countPresent}\n• Late: ${countLate}\n• Approved Leave: ${countInformed}\n• Absent / Unreported: ${countAbsent}`,
                          type: 'primary',
                          confirmText: 'Share PDF to Group',
                          onConfirm: () => handleSharePdfDirectly(selectedDate),
                        })
                      }
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                      title="Directly Share Signed PDF Report to Official WhatsApp Group"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Send Group Report</span>
                    </button>

                    {/* Quick Remove / Enable DOM Toggle */}
                    {currentMeeting.cadence === 'HOLIDAY' || currentMeeting.is_holiday_or_shifted ? (
                      <button
                        onClick={() =>
                          openConfirm({
                            title: 'Re-instate / Enable DOM',
                            message: `Re-instate Daily Operations Meeting (DOM) for ${selectedDate}?\n\n• Leaders will be scheduled for daily attendance standup.\n• Change is saved directly into Supabase SQL database.`,
                            type: 'success',
                            confirmText: 'Enable DOM',
                            onConfirm: () => {
                              updateMeetingSchedule(selectedDate, {
                                cadence: 'DOM',
                                title: 'DOM — Daily Operations Meeting',
                                is_holiday_or_shifted: false,
                              });
                              setToastAlert({ type: 'success', text: `DOM Standup enabled for ${selectedDate} in Supabase SQL!` });
                              setTimeout(() => setToastAlert(null), 4000);
                            },
                          })
                        }
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                        title="Re-instate DOM Standup"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Enable DOM</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          openConfirm({
                            title: 'Remove DOM for this Date',
                            message: `Remove Daily Operations Meeting (DOM) for ${selectedDate}?\n\n• No leaders will be penalized or marked absent.\n• Absentees count will be 0.\n• Change is saved directly in Supabase SQL database.`,
                            type: 'danger',
                            confirmText: 'Remove DOM',
                            onConfirm: () => {
                              updateMeetingSchedule(selectedDate, {
                                cadence: 'HOLIDAY',
                                title: 'NO DOM — Standup Cancelled / Removed by Admin',
                                is_holiday_or_shifted: true,
                                shift_reason: 'DOM Removed by Admin',
                              });
                              setToastAlert({ type: 'info', text: `DOM removed for ${selectedDate} (Saved to Supabase SQL)!` });
                              setTimeout(() => setToastAlert(null), 4000);
                            },
                          })
                        }
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all duration-150"
                        title="Remove DOM for this date (Zero absentees will be counted)"
                      >
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        <span>Remove DOM</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const nextState = !autoCeoitboxDispatch;
                        setAutoCeoitboxDispatch(nextState);
                        localStorage.setItem('sbh_auto_ceoitbox_enabled', nextState.toString());
                        setToastAlert({
                          type: nextState ? 'success' : 'info',
                          text: nextState
                            ? '⚡ Daily Auto-Dispatch (09:50 AM & 10:30 AM) is ACTIVE!'
                            : 'Daily Auto-Dispatch paused. You can still trigger via buttons.',
                        });
                        setTimeout(() => setToastAlert(null), 4000);
                      }}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all duration-150 border shrink-0 ${
                        autoCeoitboxDispatch
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                      title="Auto-Scheduler Toggle"
                    >
                      <Clock className={`w-3.5 h-3.5 ${autoCeoitboxDispatch ? 'text-[#2e7d32]' : 'text-slate-400'}`} />
                      <span>Auto: {autoCeoitboxDispatch ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sunday or Removed DOM / Holiday Banner */}
              {(currentMeeting.cadence === 'HOLIDAY' || currentMeeting.is_holiday_or_shifted || new Date(selectedDate).getDay() === 0) && (
                <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950">
                        {new Date(selectedDate).getDay() === 0 ? '🏖️ Official Weekly Off (Sunday)' : '🛑 Standup Removed / Holiday (No DOM Scheduled)'}
                      </h4>
                      <p className="text-xs text-amber-800/90 mt-0.5">
                        {new Date(selectedDate).getDay() === 0
                          ? 'Sundays are official hospital off days and are never counted in DOM attendance. Zero absentees recorded.'
                          : currentMeeting.shift_reason || 'DOM meeting has been removed for this date by administrator. Zero absentees recorded.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-200/70 text-amber-900 px-3 py-1 rounded-lg shrink-0 self-start sm:self-auto">
                    NO DOM • 0 ABSENT
                  </span>
                </div>
              )}

              {/* 7 Colorful Enterprise Matrix Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {/* 1. Scheduled Today */}
                <div
                  onClick={() => setStatusFilter('ALL')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'ALL'
                      ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase tracking-wider font-mono">
                      Roster
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1f2d2a] leading-none mb-0.5 tracking-tight">{totalLeaders}</div>
                  <div className="text-[10px] font-bold text-indigo-900 tracking-wider uppercase">Scheduled</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Total Registered</div>
                </div>

                {/* 2. Total Joined (Turnout Recorded) */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'PRESENT'
                      ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-600 ring-2 ring-emerald-600/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'PRESENT' ? 'bg-[#2e7d32] text-white' : 'bg-[#cfead6] text-[#2e7d32]'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider font-mono">
                      {turnoutPercent}%
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 leading-none mb-0.5 tracking-tight">{countPresent}</div>
                  <div className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase">Total Joined</div>
                  <div className="text-[9px] text-emerald-600 font-bold mt-0.5">Turnout Recorded</div>
                </div>

                {/* 3. In-Person (Physical Room) */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'PHYSICAL' ? 'ALL' : 'PHYSICAL')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'PHYSICAL'
                      ? 'bg-gradient-to-br from-amber-50 to-white border-amber-600 ring-2 ring-amber-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'PHYSICAL' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      <Building className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 uppercase tracking-wider font-mono">
                      5th Flr
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 leading-none mb-0.5 tracking-tight">{countPhysical}</div>
                  <div className="text-[10px] font-bold text-amber-800 tracking-wider uppercase">In-Person</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Conference Room</div>
                </div>

                {/* 4. Virtual (Meet) */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'VIRTUAL' ? 'ALL' : 'VIRTUAL')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'VIRTUAL'
                      ? 'bg-gradient-to-br from-sky-50 to-white border-sky-600 ring-2 ring-sky-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'VIRTUAL' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-800'
                    }`}>
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 uppercase tracking-wider font-mono">
                      Online
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-700 leading-none mb-0.5 tracking-tight">{countVirtual}</div>
                  <div className="text-[10px] font-bold text-sky-800 tracking-wider uppercase">Virtual</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Google Meet</div>
                </div>

                {/* 5. Late (Approved) */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'INFORMED_LATE' ? 'ALL' : 'INFORMED_LATE')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'INFORMED_LATE'
                      ? 'bg-gradient-to-br from-yellow-50 to-white border-yellow-600 ring-2 ring-yellow-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-yellow-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'INFORMED_LATE' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-800 uppercase tracking-wider font-mono">
                      Delay
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-yellow-700 leading-none mb-0.5 tracking-tight">{countLate}</div>
                  <div className="text-[10px] font-bold text-yellow-800 tracking-wider uppercase">Informed Late</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Admin Approved</div>
                </div>

                {/* 6. Approved Leave */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'LEAVE' ? 'ALL' : 'LEAVE')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'LEAVE'
                      ? 'bg-gradient-to-br from-purple-50 to-white border-purple-600 ring-2 ring-purple-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'LEAVE' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                    }`}>
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase tracking-wider font-mono">
                      Leave
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-700 leading-none mb-0.5 tracking-tight">{countInformed}</div>
                  <div className="text-[10px] font-bold text-purple-800 tracking-wider uppercase">On Leave</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Official Sanction</div>
                </div>

                {/* 7. Absent */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    statusFilter === 'ABSENT'
                      ? 'bg-gradient-to-br from-rose-50 to-white border-rose-600 ring-2 ring-rose-500/30 shadow-md scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 duration-200 ${
                      statusFilter === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                      <XCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase tracking-wider font-mono">
                      {countAbsent > 0 ? 'Action' : 'Zero'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-600 leading-none mb-0.5 tracking-tight">{countAbsent}</div>
                  <div className="text-[10px] font-bold text-rose-700 tracking-wider uppercase">Absent</div>
                  <div className="text-[9px] text-rose-500 font-semibold mt-0.5">{countAbsent > 0 ? 'Unexcused' : 'Full Attendance'}</div>
                </div>
              </div>

              {/* Active Matrix Filter Indicator Pill */}
              {statusFilter !== 'ALL' && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-emerald-900 text-xs">Active Matrix Filter:</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                      {statusFilter === 'PRESENT' && `Total Joined (${countPresent} Leaders)`}
                      {statusFilter === 'PHYSICAL' && `In-Person Room (${countPhysical} Leaders)`}
                      {statusFilter === 'VIRTUAL' && `Virtual Meet (${countVirtual} Leaders)`}
                      {statusFilter === 'INFORMED_LATE' && `Informed Late (${countLate} Leaders)`}
                      {statusFilter === 'LEAVE' && `On Leave (${countInformed} Leaders)`}
                      {statusFilter === 'ABSENT' && `Absent (${countAbsent} Leaders)`}
                    </span>
                    <span className="text-slate-500 text-[11px]">(Showing {filteredRecords.length} of {recordsForDate.length} leaders)</span>
                  </div>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className="flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-xs shadow-2xs cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Clear Filter</span>
                  </button>
                </div>
              )}

              {/* Filter & Dispatch Action Bar */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-[#dcdcdc] shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search leader by name, department, or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] placeholder-slate-400 font-semibold focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-[#dcdcdc] text-[#1f2d2a] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#2e7d32] font-bold cursor-pointer"
                  >
                    <option value="ALL">All Leaders ({totalLeaders})</option>
                    <option value="PRESENT">Total Joined / Present ({countPresent})</option>
                    <option value="PHYSICAL">In-Person (Room 5th Flr) ({countPhysical})</option>
                    <option value="VIRTUAL">Virtual (Google Meet) ({countVirtual})</option>
                    <option value="INFORMED_LATE">Informed Late ({countLate})</option>
                    <option value="LEAVE">Approved Leave ({countInformed})</option>
                    <option value="ABSENT">Absent ({countAbsent})</option>
                  </select>
                </div>

                {/* Action Buttons: PDF Download, Print & Email Report & Drive Sync */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    onClick={() =>
                      openConfirm({
                        title: 'Save & Archive Report',
                        message:
                          `Archive official DOM attendance report for ${selectedDate} directly to Supabase SQL database, download signed PDF, and dispatch audit summary to Official WhatsApp Group (${appSettings.admin_whatsapp_group || '120363432056023698@g.us'})?`,
                        type: 'primary',
                        confirmText: 'Save & Archive',
                        onConfirm: handleUploadToDriveAndSheet,
                      })
                    }
                    disabled={isSyncingDrive}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Archive report directly to Supabase SQL Database & dispatch to WhatsApp Group"
                  >
                    {isSyncingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>Save & Archive Report</span>
                  </button>

                  <button
                    onClick={() =>
                      openConfirm({
                        title: 'Direct Share PDF to WhatsApp Group',
                        message: `Directly share official signed Director Attendance PDF report for ${selectedDate} to the Official WhatsApp Group (${appSettings.admin_whatsapp_group || '120363432056023698@g.us'})?`,
                        type: 'primary',
                        confirmText: 'Share PDF Now',
                        onConfirm: () => handleSharePdfDirectly(selectedDate),
                      })
                    }
                    className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Directly share signed PDF Report to WhatsApp Group"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Share PDF to Group</span>
                  </button>

                  <button
                    onClick={() => downloadPdfReport(selectedDate)}
                    className="px-2.5 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Download Official PDF Report for Director Sir"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Director PDF</span>
                  </button>

                  <button
                    onClick={() => openPdfReport(selectedDate)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Print official PDF report"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-600" />
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      const esc = generateNonAttendeesEscalationEmail(selectedDate);
                      setEscalationData(esc);
                      setShowEscalationModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Send official absence explanation notice to all unreported leaders"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span>Email Non-Attendees ({countAbsent})</span>
                  </button>

                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Report Draft</span>
                  </button>
                </div>
              </div>

              {/* Attendance Register Table */}
              <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[#1f2d2a] font-bold border-b border-[#dcdcdc]">
                        <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">Leader Name</th>
                        <th className="py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider">Department</th>
                        <th className="py-3.5 px-4 text-center font-bold text-[11px] uppercase tracking-wider">Expected Mode</th>
                        <th className="py-3.5 px-4 text-center font-bold text-[11px] uppercase tracking-wider">Actual Join Mode</th>
                        <th className="py-3.5 px-4 text-center font-bold text-[11px] uppercase tracking-wider">Accurate Join Time</th>
                        <th className="py-3.5 px-4 text-center font-bold text-[11px] uppercase tracking-wider">Status</th>
                        <th className="py-3.5 px-4 text-right font-bold text-[11px] uppercase tracking-wider">Verification Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold text-sm">
                            No leaders match the current search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-[#f0f9f1] transition-colors border-b border-slate-100">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#1f2d2a] text-sm">{rec.leader?.full_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono font-medium">{rec.leader?.employee_code}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-semibold text-xs">
                              {rec.leader?.department?.name || 'Department'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold border border-slate-200">
                                {rec.leader?.expected_mode || 'PHYSICAL'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {rec.evidence_source === 'ADMIN_MANUAL' ? (
                                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Shield className="w-3.5 h-3.5 text-emerald-700" /> Admin Manual (In-Person)
                                </span>
                              ) : rec.selected_mode === 'PHYSICAL' ? (
                                <span className="text-[11px] font-bold text-[#2e7d32] bg-[#cfead6] px-2.5 py-0.5 rounded-full border border-[#2e7d32]/20 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" /> Physical (5th Flr)
                                </span>
                              ) : rec.selected_mode === 'VIRTUAL' ? (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 inline-flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5 text-blue-600" /> Virtual (Meet)
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-semibold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs text-[#1f2d2a] font-bold">
                              {rec.check_in_at ? (
                                new Date(rec.check_in_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true,
                                })
                              ) : (
                                <span className="text-slate-400 font-semibold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {rec.verification_status === 'REJECTED' || rec.verification_note?.includes('Disapproved') || rec.verification_note?.includes('No Inform') ? (
                                <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full border border-rose-300 inline-flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>ABSENT (No Inform)</span>
                                </span>
                              ) : rec.status === 'LEAVE' || (rec.status === 'INFORMED_ABSENT' && rec.informed_confirmed) ? (
                                <span className="text-[11px] bg-purple-100 text-purple-900 font-bold px-2.5 py-1 rounded-full border border-purple-300 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                  <span>APPROVED LEAVE {rec.informed_to_person ? `(${rec.informed_to_person})` : ''}</span>
                                </span>
                              ) : rec.status === 'INFORMED_ABSENT' && !rec.informed_confirmed ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                    <span>Informed Awaiting Approval</span>
                                  </span>
                                  <span className="text-[10px] text-amber-800 font-medium">
                                    To: {rec.informed_to_person || 'Authority'}
                                  </span>
                                </div>
                              ) : (rec.admin_verified_attendance || rec.verification_status === 'VERIFIED') && rec.evidence_source === 'ADMIN_MANUAL' ? (
                                <span className="text-[11px] bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs" title={rec.verification_note || 'Marked Present by Admin'}>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>PRESENT (Marked by Admin)</span>
                                  {rec.late_minutes && rec.late_minutes > 0 ? (
                                    <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-black tracking-wide">
                                      {formatLateDuration(rec.late_minutes)}
                                    </span>
                                  ) : null}
                                </span>
                              ) : rec.admin_verified_attendance || rec.verification_status === 'VERIFIED' ? (
                                <span className="text-[11px] bg-[#cfead6] text-[#2e7d32] font-bold px-2.5 py-1 rounded-full border border-[#2e7d32]/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                                  <span>PRESENT (Approved)</span>
                                  {rec.late_minutes && rec.late_minutes > 0 ? (
                                    <span className="text-[10px] bg-[#2e7d32] text-white px-1.5 py-0.5 rounded font-black tracking-wide">
                                      {formatLateDuration(rec.late_minutes)}
                                    </span>
                                  ) : null}
                                </span>
                              ) : !rec.admin_verified_attendance &&
                                (rec.status === 'PRESENT' || rec.status === 'INFORMED_LATE' || rec.selected_mode !== 'NONE') ? (
                                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                  <span>Approval Pending</span>
                                  {rec.late_minutes && rec.late_minutes > 0 ? (
                                    <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black tracking-wide">
                                      {formatLateDuration(rec.late_minutes)}
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-full border border-rose-200 inline-flex items-center gap-1">
                                  <span>ABSENT</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* If Leader submitted Informed Notice awaiting Admin confirmation */}
                                {rec.status === 'INFORMED_ABSENT' && !rec.informed_confirmed && (
                                  <>
                                    <button
                                      onClick={() =>
                                        openConfirm({
                                          title: 'Approve Informed Leave',
                                          message: `Confirm that ${rec.leader?.full_name} had informed ${rec.informed_to_person || 'Authority'}? Status will be marked as APPROVED LEAVE.`,
                                          type: 'success',
                                          confirmText: 'Approve Leave',
                                          onConfirm: async () => {
                                            await confirmInformedAbsence(rec.id, true);
                                            setToastAlert({ type: 'success', text: `Leave approved for ${rec.leader?.full_name}!` });
                                            setTimeout(() => setToastAlert(null), 3000);
                                          },
                                        })
                                      }
                                      className="px-2.5 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Confirm & Approve Leave"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve Leave</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        openConfirm({
                                          title: 'Disapprove Inform (Mark Absent)',
                                          message: `Reject ${rec.leader?.full_name}'s informed claim? (Admin confirms they did not inform). Status will be marked as ABSENT (No Inform).`,
                                          type: 'danger',
                                          confirmText: 'No Inform (Mark Absent)',
                                          onConfirm: async () => {
                                            await confirmInformedAbsence(rec.id, false);
                                            setToastAlert({ type: 'error', text: `${rec.leader?.full_name} marked as ABSENT (No Inform)!` });
                                            setTimeout(() => setToastAlert(null), 3000);
                                          },
                                        })
                                      }
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Admin Disapproves: Did not inform"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>No Inform</span>
                                    </button>
                                  </>
                                )}

                                {/* Attendance locked once marked/verified: Cannot be marked again! */}
                                {(rec.status === 'PRESENT' || rec.admin_verified_attendance || rec.verification_status === 'VERIFIED') ? (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{rec.evidence_source === 'ADMIN_MANUAL' ? 'Admin Marked (Locked)' : 'Verified (Locked)'}</span>
                                  </span>
                                ) : (
                                  <>
                                    {/* Admin Direct Approval Button for pending attendance */}
                                    {!rec.admin_verified_attendance &&
                                      (rec.status === 'INFORMED_LATE' || (rec.selected_mode !== 'NONE' && rec.status !== 'LEAVE')) && (
                                        <button
                                          onClick={() =>
                                            openConfirm({
                                              title: 'Approve Attendance',
                                              message: `Verify and confirm attendance for ${rec.leader?.full_name}?`,
                                              type: 'success',
                                              confirmText: 'Confirm Approve',
                                              onConfirm: async () => {
                                                const res = await approveAttendanceRecord(rec.id);
                                                setToastAlert({ type: 'success', text: res.message });
                                                setTimeout(() => setToastAlert(null), 4000);
                                              },
                                            })
                                          }
                                          className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                                          title="Approve Leader Attendance"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Approve</span>
                                        </button>
                                      )}

                                    {/* Admin Manual Mark Present with 6 business rules enforced */}
                                    {rec.status !== 'INFORMED_ABSENT' && (
                                      canMarkPresent ? (
                                        <button
                                          onClick={() =>
                                            openConfirm({
                                              title: 'Mark Present (Admin Manual)',
                                              message: `Mark ${rec.leader?.full_name} as Present (Conference Room In-Person)? This will be recorded as Marked by Admin and locked.`,
                                              type: 'success',
                                              confirmText: 'Mark Present',
                                              onConfirm: async () => {
                                                const res = await adminVerifyStatus(rec.id, 'PRESENT', true, 'Marked Present by Admin (Manual Check)');
                                                if (res && res.success === false) {
                                                  setToastAlert({ type: 'error', text: res.message });
                                                } else {
                                                  setToastAlert({ type: 'success', text: `${rec.leader?.full_name} marked as Present by Admin!` });
                                                }
                                                setTimeout(() => setToastAlert(null), 3000);
                                              },
                                            })
                                          }
                                          className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                          title="Mark Present & Verified by Admin"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          <span>Mark Present</span>
                                        </button>
                                      ) : (
                                        <button
                                          disabled
                                          className="px-2.5 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold border border-slate-200 cursor-not-allowed flex items-center gap-1 opacity-75"
                                          title={
                                            !isSelectedDateToday
                                              ? `Mark Present is only allowed on today's date (${todayIST})`
                                              : isSunday
                                              ? 'Sunday is official weekly off. Standup attendance is disabled.'
                                              : isHolidayOrRemovedDom
                                              ? 'DOM meeting is not scheduled or has been removed for this date.'
                                              : 'Mark Present unlocks at 09:30 AM IST on DOM standup day.'
                                          }
                                        >
                                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                                          <span>
                                            {!isSelectedDateToday
                                              ? 'Today Only'
                                              : isSunday
                                              ? 'Sunday Off'
                                              : isHolidayOrRemovedDom
                                              ? 'No DOM'
                                              : 'At 09:30 AM'}
                                          </span>
                                        </button>
                                      )
                                    )}

                                    {rec.status !== 'INFORMED_LATE' && rec.status !== 'INFORMED_ABSENT' && (
                                      <button
                                        onClick={() => {
                                          setInformedLateModal({
                                            isOpen: true,
                                            leaderId: rec.leader_id,
                                            leaderName: rec.leader?.full_name || 'Leader',
                                            departmentName: rec.leader?.department?.name || 'Hospital Staff',
                                            lateMinutes: 15,
                                            expectedTime: '10:15 AM',
                                            informedTo: rec.informed_to_person || 'Director Sir',
                                            reason: rec.late_reason || 'Ward Rounds / Patient Emergency',
                                            adminApproved: true,
                                          });
                                        }}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                                        title="Document Late Arrival (Admin Approval Required)"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Informed Late</span>
                                      </button>
                                    )}

                                    {rec.status !== 'LEAVE' && rec.status !== 'INFORMED_ABSENT' && (
                                      <button
                                        onClick={() => {
                                          setInformedLeaveModal({
                                            isOpen: true,
                                            leaderId: rec.leader_id,
                                            leaderName: rec.leader?.full_name || 'Leader',
                                            departmentName: rec.leader?.department?.name || 'Hospital Staff',
                                            informedTo: rec.informed_to_person || 'Director Sir',
                                            reason: rec.informed_reason || 'Emergency Hospital Duty',
                                          });
                                        }}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                                        title="Mark Informed Leave (Admin Verified)"
                                      >
                                        Leave
                                      </button>
                                    )}
                                  </>
                                )}

                                {rec.status !== 'ABSENT' && rec.status !== 'INFORMED_ABSENT' && (
                                  <button
                                    onClick={() =>
                                      openConfirm({
                                        title: 'Mark Absent',
                                        message: `Mark ${rec.leader?.full_name} as Absent?`,
                                        type: 'danger',
                                        confirmText: 'Mark Absent',
                                        onConfirm: async () => {
                                          const res = await rejectAttendanceRecord(rec.id, 'Unexcused / Rejected by Admin');
                                          setToastAlert({ type: 'info', text: res.message });
                                          setTimeout(() => setToastAlert(null), 4000);
                                        },
                                      })
                                    }
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                                    title="Reject Attendance / Mark Absent"
                                  >
                                    Mark Absent
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: INTERACTIVE MEETING CALENDAR ================= */}
          {activeTab === 'calendar' && (
            <MeetingCalendarView
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onOpenReschedule={() => {
                const m = getMeetingForDate(selectedDate);
                setSchedForm({
                  title: m.title,
                  frequency: m.frequency,
                  cadence: m.cadence || 'DOM',
                  scheduled_time: m.scheduled_time,
                  is_holiday_or_shifted: m.is_holiday_or_shifted,
                  shift_reason: m.shift_reason || '',
                  google_meet_url: m.google_meet_url,
                });
                setShowScheduleEditModal(true);
              }}
            />
          )}

          {/* ================= TAB 3: GRAPHICAL ANALYTICS & AUDITS ================= */}
          {activeTab === 'reports' && (
            <AnalyticsReportsView selectedDate={selectedDate} />
          )}

          {/* ================= TAB 4: LEADERS & EMPLOYEES ROSTER ================= */}
          {activeTab === 'leaders' && (() => {
            const filteredLeaders = leaders.filter((lead) => {
              if (rosterStatusFilter === 'ACTIVE' && lead.is_active === false) return false;
              if (rosterStatusFilter === 'DISABLED' && lead.is_active !== false) return false;

              if (leaderDeptFilter !== 'ALL') {
                const leadDeptId = lead.department_id || lead.department?.id;
                const leadDeptName = lead.department?.name?.trim().toLowerCase();
                const leadDeptCode = lead.department?.code?.trim().toLowerCase();
                const targetDept = departments.find((d) => d.id === leaderDeptFilter);
                const targetName = targetDept?.name.trim().toLowerCase();
                const targetCode = targetDept?.code.trim().toLowerCase();

                const matches =
                  leadDeptId === leaderDeptFilter ||
                  (targetName && leadDeptName === targetName) ||
                  (targetCode && leadDeptCode === targetCode);
                if (!matches) return false;
              }

              if (leaderSearchTerm.trim()) {
                const q = leaderSearchTerm.toLowerCase();
                const matchName = lead.full_name?.toLowerCase().includes(q);
                const matchEmail = lead.email?.toLowerCase().includes(q);
                const matchPhone = lead.phone?.toLowerCase().includes(q);
                const matchCode = lead.employee_code?.toLowerCase().includes(q);
                const matchDept = lead.department?.name?.toLowerCase().includes(q) || lead.department?.code?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchPhone && !matchCode && !matchDept) return false;
              }

              return true;
            });

            return (
              <div className="space-y-5">
                {/* Header & Controls Bar */}
                <div className="bg-white rounded-2xl p-5 border border-[#dcdcdc] shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-[#1f2d2a] flex items-center gap-2 uppercase tracking-tight">
                        <Users className="w-5 h-5 text-[#2e7d32]" />
                        <span>Hospital Leaders <span className="text-[#2e7d32]">Roster</span></span>
                        <span className="text-[10px] bg-[#cfead6] text-[#2e7d32] font-bold px-2.5 py-0.5 rounded-full border border-[#2e7d32]/20">
                          {leaders.length} Registered
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          Active: {leaders.filter((l) => l.is_active !== false).length}
                        </span>
                        {leaders.filter((l) => l.is_active === false).length > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Disabled: {leaders.filter((l) => l.is_active === false).length}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Official hospital leadership team. Active leaders participate in morning DOM standup and receive automated notices.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingLeader(null);
                        setLeaderForm({
                          full_name: '',
                          email: '',
                          phone: '',
                          department_id: departments[0]?.id || '',
                          employee_code: `SBH-${Date.now().toString().slice(-4)}`,
                          expected_mode: 'PHYSICAL',
                          role: 'LEADER',
                          is_active: true,
                          initialPassword: '123456',
                        });
                        setFormError('');
                        setFormSuccess('');
                        setShowAddLeaderModal(true);
                      }}
                      className="px-5 py-2.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add New Leader</span>
                    </button>
                  </div>

                  {/* Search, Department Filter, Status Filter & View Toggle */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search leader by name, code, email, phone, or department..."
                          value={leaderSearchTerm}
                          onChange={(e) => setLeaderSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] placeholder-slate-400 focus:outline-none focus:border-[#2e7d32] font-semibold"
                        />
                        {leaderSearchTerm && (
                          <button
                            onClick={() => setLeaderSearchTerm('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Department Filter Dropdown */}
                      <div className="sm:w-56">
                        <select
                          value={leaderDeptFilter}
                          onChange={(e) => setLeaderDeptFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] font-bold focus:outline-none focus:border-[#2e7d32] cursor-pointer"
                        >
                          <option value="ALL">All Departments ({departments.length})</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      {/* Status Filter Tabs */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setRosterStatusFilter('ALL')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            rosterStatusFilter === 'ALL'
                              ? 'bg-white text-[#1f2d2a] shadow-xs'
                              : 'text-slate-500 hover:text-[#1f2d2a]'
                          }`}
                        >
                          All ({leaders.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRosterStatusFilter('ACTIVE')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            rosterStatusFilter === 'ACTIVE'
                              ? 'bg-[#2e7d32] text-white shadow-xs'
                              : 'text-slate-500 hover:text-[#2e7d32]'
                          }`}
                        >
                          Active ({leaders.filter((l) => l.is_active !== false).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRosterStatusFilter('DISABLED')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            rosterStatusFilter === 'DISABLED'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Disabled ({leaders.filter((l) => l.is_active === false).length})
                        </button>
                      </div>

                      {/* View Mode Toggle (List vs Grid) */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setLeaderViewMode('list')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            leaderViewMode === 'list'
                              ? 'bg-white text-[#2e7d32] shadow-xs'
                              : 'text-slate-400 hover:text-[#1f2d2a]'
                          }`}
                          title="Detailed List / Table View"
                        >
                          <List size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            leaderViewMode === 'grid'
                              ? 'bg-white text-[#2e7d32] shadow-xs'
                              : 'text-slate-400 hover:text-[#1f2d2a]'
                          }`}
                          title="Grid Cards View"
                        >
                          <Grid size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* No Results Message */}
                {filteredLeaders.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 border border-[#dcdcdc] text-center space-y-3">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-base font-bold text-[#1f2d2a]">No Leaders Found</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      No leader matches the current search or filter criteria. Try clearing search filters or add a new leader.
                    </p>
                    <button
                      onClick={() => {
                        setLeaderSearchTerm('');
                        setLeaderDeptFilter('ALL');
                        setRosterStatusFilter('ALL');
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {/* View 1: Detailed List / Table View (Crisp, High-Legibility) */}
                {leaderViewMode === 'list' && filteredLeaders.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-sm overflow-hidden">
                    <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[760px]">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-[#dcdcdc] text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">Leader Profile</th>
                            <th className="py-3 px-4">Department Master</th>
                            <th className="py-3 px-4">Contact (Email & WhatsApp)</th>
                            <th className="py-3 px-4">Expected Mode</th>
                            <th className="py-3 px-4">Login Password</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLeaders.map((lead) => (
                            <tr
                              key={lead.id}
                              className={`transition-colors hover:bg-slate-50/60 ${
                                lead.is_active === false ? 'opacity-65 bg-slate-50/40' : ''
                              }`}
                            >
                              {/* Leader Name, Role, Employee ID */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#cfead6] text-[#2e7d32] font-black text-xs flex items-center justify-center shrink-0 border border-[#2e7d32]/20 shadow-2xs">
                                    {lead.full_name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-[#1f2d2a] text-sm leading-snug">
                                      {lead.full_name}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                        {lead.employee_code || 'ID-N/A'}
                                      </span>
                                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                        {lead.role || 'LEADER'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-[#cfead6]/70 border border-[#2e7d32]/20 px-2.5 py-1 rounded-lg">
                                  <Building size={13} className="text-[#2e7d32]" />
                                  <span>{lead.department?.name || 'Department'}</span>
                                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                    ({lead.department?.code || 'DEPT'})
                                  </span>
                                </span>
                              </td>

                              {/* Contact Info */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1 text-xs font-mono">
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="flex items-center gap-1.5 text-slate-600 hover:text-orange-600 truncate max-w-[220px]"
                                    title={lead.email}
                                  >
                                    <Mail size={13} className="text-orange-500 shrink-0" />
                                    <span className="truncate">{lead.email}</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-slate-600 hover:text-emerald-600"
                                  >
                                    <Phone size={13} className="text-[#2e7d32] shrink-0" />
                                    <span>{lead.phone || 'No Phone'}</span>
                                  </a>
                                </div>
                              </td>

                              {/* Expected Attendance Mode */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                                    lead.expected_mode === 'VIRTUAL'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-orange-50 text-orange-800 border-orange-200'
                                  }`}
                                >
                                  {lead.expected_mode === 'VIRTUAL' ? <Video size={13} /> : <Building size={13} />}
                                  <span>{lead.expected_mode === 'VIRTUAL' ? 'Virtual (Meet)' : 'Physical (Room)'}</span>
                                </span>
                              </td>

                              {/* Portal Password (from Supabase leaders table) */}
                              <td className="py-3.5 px-4">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200 text-amber-950 rounded-lg shadow-2xs font-mono text-xs">
                                  <KeyRound size={12} className="text-amber-600 shrink-0" />
                                  <span className="font-bold tracking-wider">{lead.password || '123456'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(lead.password || '123456');
                                      setToastAlert({ type: 'success', text: `Password for ${lead.full_name} copied: ${lead.password || '123456'}` });
                                      setTimeout(() => setToastAlert(null), 3000);
                                    }}
                                    className="p-0.5 hover:bg-amber-100 rounded text-amber-700 cursor-pointer ml-1 transition-colors"
                                    title="Copy Password"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </td>

                              {/* Status Toggle */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLeaderStatus(lead)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${
                                    lead.is_active !== false
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-slate-200 text-slate-700 border-slate-300'
                                  }`}
                                  title={lead.is_active !== false ? 'Click to Disable' : 'Click to Activate'}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${lead.is_active !== false ? 'bg-[#2e7d32] animate-pulse' : 'bg-slate-400'}`} />
                                  <span>{lead.is_active !== false ? 'Active' : 'Disabled'}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditLeaderModal(lead)}
                                    className="p-1.5 text-slate-600 hover:text-[#2e7d32] hover:bg-[#cfead6]/30 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#2e7d32]/20"
                                    title="Edit Leader Profile"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLeader(lead.id, lead.full_name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                    title="Delete Leader"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* View 2: Grid View (Cards) */}
                {leaderViewMode === 'grid' && filteredLeaders.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeaders.map((lead) => (
                      <div
                        key={lead.id}
                        className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between hover:border-[#2e7d32] shadow-sm ${
                          lead.is_active !== false ? 'border-[#dcdcdc]' : 'border-slate-300 opacity-75 bg-slate-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                                {lead.role || 'LEADER'}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  lead.is_active !== false
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}
                              >
                                {lead.is_active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 font-bold">{lead.employee_code}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="w-10 h-10 rounded-xl bg-[#cfead6] text-[#2e7d32] font-black text-sm flex items-center justify-center shrink-0 border border-[#2e7d32]/20">
                              {lead.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-[#1f2d2a] truncate">{lead.full_name}</h4>
                              <p className="text-xs text-slate-600 font-semibold flex items-center gap-1 mt-0.5 truncate">
                                <Building className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" />
                                <span className="truncate">{lead.department?.name || 'Department'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-mono">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" />
                              <span>{lead.phone || 'No Phone'}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 mt-2 bg-amber-50/80 border border-amber-200 text-amber-950 rounded-xl text-xs font-mono">
                              <div className="flex items-center gap-1.5 font-bold">
                                <KeyRound size={13} className="text-amber-600 shrink-0" />
                                <span className="text-[11px] text-slate-500 font-sans">Pass:</span>
                                <span className="font-bold tracking-wider">{lead.password || '123456'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(lead.password || '123456');
                                  setToastAlert({ type: 'success', text: `Password for ${lead.full_name} copied: ${lead.password || '123456'}` });
                                  setTimeout(() => setToastAlert(null), 3000);
                                }}
                                className="p-1 hover:bg-amber-100 text-amber-700 rounded transition-colors cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Expected: <strong className="text-[#1f2d2a]">{lead.expected_mode}</strong>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleLeaderStatus(lead)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                lead.is_active !== false
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={lead.is_active !== false ? 'Disable Leader' : 'Activate Leader'}
                            >
                              {lead.is_active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => openEditLeaderModal(lead)}
                              className="p-1.5 text-slate-500 hover:text-[#2e7d32] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Leader"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLeader(lead.id, lead.full_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Leader"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================= TAB 5: DEPARTMENTS MASTER (24 OFFICIAL DEPARTMENTS) ================= */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-[#dcdcdc] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1f2d2a] flex items-center gap-2 uppercase tracking-tight">
                    <Building className="w-5 h-5 text-[#2e7d32]" />
                    <span>Hospital Departments <span className="text-[#2e7d32]">Master</span> ({departments.length})</span>
                    <span className="text-[10px] bg-[#cfead6] text-[#2e7d32] font-bold px-2.5 py-0.5 rounded-full border border-[#2e7d32]/20">
                      Official 24 Departments Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official hospital departments roster. View assigned leaders, add new departments, or assign leaders to a department.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search departments..."
                      value={deptSearchTerm}
                      onChange={(e) => setDeptSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] placeholder-slate-400 focus:outline-none focus:border-[#2e7d32] font-semibold"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: '', code: '', is_active: true });
                      setDeptFormError('');
                      setDeptFormSuccess('');
                      setShowAddDeptModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Department</span>
                  </button>
                </div>
              </div>

              {/* Departments Grid with Assigned Leaders List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDepartments.map((dept, idx) => {
                  const deptLeaders = leaders.filter(
                    (l) =>
                      l.department_id === dept.id ||
                      l.department?.id === dept.id ||
                      (l.department?.name && l.department.name.trim().toLowerCase() === dept.name.trim().toLowerCase()) ||
                      (l.department?.code && l.department.code.trim().toLowerCase() === dept.code.trim().toLowerCase())
                  );

                  return (
                    <div
                      key={dept.id}
                      className="bg-white p-5 rounded-2xl border border-[#dcdcdc] hover:border-[#2e7d32] shadow-sm flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {dept.code || `DEP-${idx + 1}`}
                          </span>
                          <span className="text-[10px] bg-[#cfead6] text-[#2e7d32] font-bold px-2 py-0.5 rounded-full border border-[#2e7d32]/20">
                            Active
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-[#1f2d2a] mt-2.5 truncate" title={dept.name}>
                          {dept.name}
                        </h4>

                        <div className="mt-2 text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500">Assigned Leaders:</span>
                          <span className={`font-black px-2 py-0.5 rounded-md text-xs border ${
                            deptLeaders.length > 0
                              ? 'bg-[#cfead6] text-[#2e7d32] border-[#2e7d32]/20'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}>
                            {deptLeaders.length}
                          </span>
                        </div>

                        {/* List of Leaders in this Department */}
                        <div className="mt-3">
                          {deptLeaders.length > 0 ? (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                              {deptLeaders.map((lead) => (
                                <div
                                  key={lead.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-[#2e7d32]/40 transition-all text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-[#cfead6] text-[#2e7d32] font-black text-[10px] flex items-center justify-center shrink-0">
                                      {lead.full_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#1f2d2a] truncate text-xs">{lead.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono truncate">{lead.employee_code} • {lead.expected_mode}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                                      lead.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {lead.is_active !== false ? 'Active' : 'Off'}
                                    </span>
                                    <button
                                      onClick={() => openEditLeaderModal(lead)}
                                      className="p-1 text-slate-400 hover:text-[#2e7d32] hover:bg-slate-100 rounded-md cursor-pointer"
                                      title="Edit Leader"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                              <p className="text-[11px] text-slate-400 font-medium">No leader assigned yet</p>
                              <button
                                onClick={() => {
                                  setEditingLeader(null);
                                  setLeaderForm({
                                    full_name: '',
                                    email: '',
                                    phone: '',
                                    department_id: dept.id,
                                    employee_code: `SBH-${dept.code}-${Date.now().toString().slice(-4)}`,
                                    expected_mode: 'PHYSICAL',
                                    role: 'LEADER',
                                    is_active: true,
                                    initialPassword: '123456',
                                  });
                                  setFormError('');
                                  setFormSuccess('');
                                  setShowAddLeaderModal(true);
                                }}
                                className="mt-1.5 text-[10px] font-bold text-[#2e7d32] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} /> Assign Leader
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setEditingLeader(null);
                            setLeaderForm({
                              full_name: '',
                              email: '',
                              phone: '',
                              department_id: dept.id,
                              employee_code: `SBH-${dept.code}-${Date.now().toString().slice(-4)}`,
                              expected_mode: 'PHYSICAL',
                              role: 'LEADER',
                              is_active: true,
                              initialPassword: '123456',
                            });
                            setFormError('');
                            setFormSuccess('');
                            setShowAddLeaderModal(true);
                          }}
                          className="text-[10px] font-bold text-[#2e7d32] hover:text-[#256628] flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus size={12} />
                          <span>+ Add Leader</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDeptModal(dept)}
                            className="p-1.5 text-slate-500 hover:text-[#2e7d32] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 7: DAILY MEETING LINKS & VIRTUAL TRACKING ================= */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Top Overview Banner & Live Stats */}
              <div className="fluent-card p-6 rounded-3xl border-2 border-teal-500/30 bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/50 shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100 text-teal-800 border border-teal-300">
                        {currentCadence} Cadence
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {currentMeeting.frequency}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Video className="w-5 h-5 text-teal-600" />
                      Daily Meeting Links & Virtual Attendance Hub
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Every leader receives an individual tracking link. Clicks and QR code verifications are recorded
                      user-wise and date-wise.
                    </p>
                  </div>

                  {/* Target Google Meet Link & Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Target Google Meet</div>
                        <a
                          href={currentMeeting.google_meet_url || appSettings.google_meet_url || 'https://meet.google.com/jrz-jfku-gir'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 underline"
                        >
                          {currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowVirtualQrModal(true)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <QrCode className="w-4 h-4 text-teal-400" />
                      <span>Project Virtual Screen QR</span>
                    </button>
                  </div>
                </div>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Leaders</span>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">{leaders.length}</div>
                    <span className="text-[11px] text-slate-500 font-medium">Scheduled in Roster</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">Virtual Clicks Logged</span>
                    <div className="text-2xl font-black text-teal-600 mt-0.5">
                      {
                        attendanceRecords.filter(
                          (r) =>
                            r.meeting_date === selectedDate &&
                            ((r.virtual_clicks_count || 0) > 0 || r.selected_mode === 'VIRTUAL')
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Unique Daily Links Opened</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">QR Verified (Virtual)</span>
                    <div className="text-2xl font-black text-emerald-600 mt-0.5">
                      {
                        attendanceRecords.filter(
                          (r) =>
                            r.meeting_date === selectedDate &&
                            (r.evidence_source === 'VIRTUAL_QR_VERIFIED' || r.qr_scanned_at)
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Confirmed by Camera Scan</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">In-Person Boardroom</span>
                    <div className="text-2xl font-black text-orange-600 mt-0.5">
                      {
                        attendanceRecords.filter(
                          (r) =>
                            r.meeting_date === selectedDate &&
                            r.selected_mode === 'PHYSICAL' &&
                            (r.status === 'PRESENT' || r.admin_verified_attendance)
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">5th Floor Conference Room</span>
                  </div>
                </div>
              </div>

              {/* Action Bar & Filter */}
              <div className="fluent-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search leader or department..."
                    value={linksSearchTerm}
                    onChange={(e) => setLinksSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const allLinksText = leaders
                        .map((lead, idx) => {
                          const { url } = generateDailyMeetingLink(
                            lead,
                            selectedDate,
                            undefined,
                            currentMeeting.google_meet_url || appSettings.google_meet_url
                          );
                          return `${idx + 1}. ${lead.full_name} (${lead.department?.name || 'Dept'}): ${url}`;
                        })
                        .join('\n\n');

                      navigator.clipboard.writeText(allLinksText);
                      setCopiedAllLinks(true);
                      setTimeout(() => setCopiedAllLinks(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  >
                    {copiedAllLinks ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedAllLinks ? 'All Links Copied!' : 'Copy All Daily Links'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCeoitboxBroadcastReminders}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast on WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Table of Leaders & Individual Meeting Links */}
              <div className="fluent-card rounded-3xl overflow-hidden border border-slate-200 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                        <th className="py-3.5 px-4">Leader & Department</th>
                        <th className="py-3.5 px-3">Expected Mode</th>
                        <th className="py-3.5 px-3">Dedicated Daily Meet Link</th>
                        <th className="py-3.5 px-3 text-center">Click Count</th>
                        <th className="py-3.5 px-3">Attendance Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaders
                        .filter(
                          (l) =>
                            l.full_name.toLowerCase().includes(linksSearchTerm.toLowerCase()) ||
                            l.department?.name.toLowerCase().includes(linksSearchTerm.toLowerCase()) ||
                            l.phone?.includes(linksSearchTerm)
                        )
                        .map((lead) => {
                          const { url: personalMeetUrl } = generateDailyMeetingLink(
                            lead,
                            selectedDate,
                            undefined,
                            currentMeeting.google_meet_url || appSettings.google_meet_url
                          );

                          const record = attendanceRecords.find(
                            (r) => r.leader_id === lead.id && r.meeting_date === selectedDate
                          );

                          const isVirtualClicked =
                            (record?.virtual_clicks_count || 0) > 0 || record?.evidence_source === 'GOOGLE_MEET_REDIRECT';
                          const isQrScanned =
                            record?.evidence_source === 'VIRTUAL_QR_VERIFIED' || !!record?.qr_scanned_at;
                          const isPhysical =
                            record?.selected_mode === 'PHYSICAL' &&
                            (record.status === 'PRESENT' || record.admin_verified_attendance);

                          const clicks = record?.virtual_clicks_count || (isVirtualClicked ? 1 : 0);

                          const waMsg = `🏥 *SBH GROUP OF HOSPITAL, RAIPUR*\n🔔 *DAILY OPERATIONS MEETING (DOM) — ${selectedDate}*\n\nDear ${lead.full_name},\nYour personal meeting tracking link for today is ready:\n👉 ${personalMeetUrl}\n\nTap above to enter Google Meet and auto-record your virtual attendance.\n\nDOM Operations Command | SBH Raipur`;
                          const waUrl = `https://api.whatsapp.com/send?phone=91${lead.phone?.replace(/\D/g, '')}&text=${encodeURIComponent(
                            waMsg
                          )}`;

                          return (
                            <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Leader Info */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                                    {lead.full_name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-900">{lead.full_name}</div>
                                    <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                                      <span className="text-teal-700">{lead.department?.name || 'Leadership'}</span>
                                      <span>•</span>
                                      <span className="font-mono text-slate-400">{lead.phone}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Expected Mode */}
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lead.expected_mode === 'VIRTUAL'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                >
                                  {lead.expected_mode}
                                </span>
                              </td>

                              {/* Dedicated Daily Link */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 max-w-xs">
                                  <input
                                    type="text"
                                    readOnly
                                    value={personalMeetUrl}
                                    className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-mono text-slate-700 w-48 truncate border border-slate-200 select-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(personalMeetUrl);
                                      setCopiedLeaderId(lead.id);
                                      setTimeout(() => setCopiedLeaderId(null), 2500);
                                    }}
                                    title="Copy personal daily join link"
                                    className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                                  >
                                    {copiedLeaderId === lead.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={personalMeetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open link in new tab"
                                    className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>

                              {/* Click Count */}
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black inline-block ${clicks > 0
                                      ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                      : 'bg-slate-100 text-slate-400'
                                    }`}
                                >
                                  {clicks} {clicks === 1 ? 'click' : 'clicks'}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3">
                                {record?.admin_verified_attendance ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Present (Approved)</span>
                                    {record.late_minutes && record.late_minutes > 0 ? (
                                      <span className="text-[9px] bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded font-black">
                                        {formatLateDuration(record.late_minutes)}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : isVirtualClicked || isQrScanned || isPhysical ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>Approval Pending from Admin</span>
                                    {record?.late_minutes && record.late_minutes > 0 ? (
                                      <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black">
                                        {formatLateDuration(record.late_minutes)}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                    <Clock className="w-3 h-3 text-slate-400" /> Not Joined
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {record && !record.admin_verified_attendance && (isVirtualClicked || isQrScanned || isPhysical) && (
                                    <button
                                      onClick={async () => {
                                        const res = await approveAttendanceRecord(record.id);
                                        setToastAlert({ type: 'success', text: res.message });
                                        setTimeout(() => setToastAlert(null), 4000);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl shadow-xs transition-colors cursor-pointer"
                                      title="Approve Leader Attendance"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                  )}
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 transition-colors"
                                  >
                                    <Share2 className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="fluent-card p-6 rounded-2xl space-y-4 border-2 border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    CEOITBOX WhatsApp Gateway Integration
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Active Gateway
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Automated official WhatsApp message delivery service for DOM/WOM/MOM reminders, Director reports, and non-attendee alerts.
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Director WhatsApp Mobile Number
                      </label>
                      <input
                        type="text"
                        value={appSettings.director_whatsapp}
                        onChange={(e) => updateAppSettings({ director_whatsapp: e.target.value })}
                        placeholder="9644404741"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Director Name / Salutation
                      </label>
                      <input
                        type="text"
                        value={appSettings.director_name}
                        onChange={(e) => updateAppSettings({ director_name: e.target.value })}
                        placeholder="Director Sir"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official WhatsApp Group ID (JID)
                      </label>
                      <input
                        type="text"
                        value={appSettings.admin_whatsapp_group}
                        onChange={(e) => updateAppSettings({ admin_whatsapp_group: e.target.value })}
                        placeholder="120363432056023698@g.us"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>Target Group: Official DOM Operations ({appSettings.admin_whatsapp_group || '120363432056023698@g.us'})</span>
                        <a
                          href={`https://app.ceoitbox.com/customer/channel/23642/group/${appSettings.admin_whatsapp_group || '120363432056023698@g.us'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 font-bold underline"
                        >
                          Open in CEOITBOX ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                      <span>CEOITBOX Production Endpoint</span>
                      <span className="font-mono text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                        https://app.ceoitbox.com/message/new
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleSendGroupCeoitbox('0950')}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Send Test Notice to WhatsApp Group</span>
                      </button>

                      <button
                        onClick={handleCeoitboxDirectorReport}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Test Broadcast to Director</span>
                      </button>

                      <button
                        onClick={handleCeoitboxBroadcastReminders}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Broadcast Reminders to Staff</span>
                      </button>

                      <button
                        onClick={handleCeoitboxEscalateNonAttendees}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Broadcast Non-Attendees Alert</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Drive & Google Sheet Cloud Automation Hub */}
              <div className="fluent-card p-6 rounded-2xl space-y-4 border border-teal-200/80 bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Google Drive & Google Sheet Pipeline</h3>
                      <p className="text-xs text-slate-500">Automated 10:30 AM PDF archiving in Drive, Sheet logging & WhatsApp Broadcast</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSharePdfDirectly(selectedDate)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Direct Share PDF to WhatsApp Group</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Official Google Drive Folder</span>
                      <a
                        href={appSettings.google_drive_folder_url || 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                      >
                        <span>Open Drive ↗</span>
                      </a>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate bg-slate-50 p-2 rounded-lg border border-slate-200">
                      Folder ID: {appSettings.google_drive_folder_id || '1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD'}
                    </div>
                    <p className="text-[11px] text-slate-500">All daily 10:30 AM PDF leadership audit reports are archived in this folder.</p>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Official WhatsApp Group (Broadcast Target)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Group JID
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-700 truncate bg-slate-50 p-2 rounded-lg border border-slate-200 font-bold">
                      {appSettings.admin_whatsapp_group || '120363432056023698@g.us'}
                    </div>
                    <p className="text-[11px] text-slate-500">09:50 AM notice & 10:30 AM final PDF report are dispatched to this group.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Apps Script Webhook URL (from your Google Sheet)
                  </label>
                  <input
                    type="url"
                    value={appSettings.google_sheet_webhook_url || ''}
                    onChange={(e) => updateAppSettings({ google_sheet_webhook_url: e.target.value })}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Paste your Google Apps Script Web App URL here for automatic 1-click cloud sync into your Google Sheet & Google Drive.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleUploadToDriveAndSheet}
                    disabled={isSyncingDrive}
                    className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSyncingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    <span>Sync Today's Report to Drive & Sheet Now</span>
                  </button>

                  <a
                    href={appSettings.google_drive_folder_url || 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-teal-700" />
                    <span>View Drive Folder</span>
                  </a>
                </div>
              </div>

              {/* General Settings */}
              <div className="fluent-card p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-orange-600" />
                  Hospital Meeting & Domain Settings
                </h3>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Google Meet Room Link</label>
                    <input
                      type="url"
                      value={appSettings.google_meet_url}
                      onChange={(e) => updateAppSettings({ google_meet_url: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Allowed Domain</label>
                      <input
                        type="text"
                        value={appSettings.allowed_domain}
                        onChange={(e) => updateAppSettings({ allowed_domain: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Boardroom Name</label>
                      <input
                        type="text"
                        value={appSettings.conference_room_name}
                        onChange={(e) => updateAppSettings({ conference_room_name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: ATTENDANCE GEO-HISTORY ================= */}
          {activeTab === 'geo-history' && (() => {
            const targetDate = geoDateFilter;
            const recordsList = targetDate === 'ALL'
              ? attendanceRecords
              : attendanceRecords.filter((r) => r.meeting_date === (targetDate || selectedDate));

            let totalWithGps = 0;
            let onCampusCount = 0;
            let offCampusCount = 0;
            let qrVerifiedCount = 0;

            recordsList.forEach((r) => {
              if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
                totalWithGps++;
                const dist = calculateCampusDistanceMeters(r.latitude, r.longitude);
                if (dist !== null && dist <= 350) {
                  onCampusCount++;
                } else if (dist !== null) {
                  offCampusCount++;
                }
              }
              if (r.evidence_source === 'ROOM_STATIC_QR' || r.qr_scanned_at) {
                qrVerifiedCount++;
              }
            });

            const filteredGeoRecords = recordsList.filter((r) => {
              const leader = leaders.find((l) => l.id === r.leader_id);
              const dept = leader?.department || departments.find((d) => d.id === leader?.department_id);
              const q = geoSearchTerm.toLowerCase();
              const matchSearch =
                !geoSearchTerm ||
                (leader?.full_name && leader.full_name.toLowerCase().includes(q)) ||
                (dept?.name && dept.name.toLowerCase().includes(q)) ||
                (leader?.employee_code && leader.employee_code.toLowerCase().includes(q)) ||
                (leader?.phone && leader.phone.includes(q));

              const isPhysical = r.evidence_source === 'ROOM_STATIC_QR' || r.selected_mode === 'PHYSICAL';
              const isVirtual = r.evidence_source === 'GOOGLE_MEET_REDIRECT' || r.selected_mode === 'VIRTUAL';

              const matchMode =
                geoModeFilter === 'ALL' ||
                (geoModeFilter === 'PHYSICAL' && isPhysical) ||
                (geoModeFilter === 'VIRTUAL' && isVirtual);

              let matchCampus = true;
              if (geoCampusFilter !== 'ALL') {
                const dist = calculateCampusDistanceMeters(r.latitude, r.longitude);
                if (geoCampusFilter === 'ON_CAMPUS') {
                  matchCampus = dist !== null && dist <= 350;
                } else if (geoCampusFilter === 'REMOTE') {
                  matchCampus = dist !== null && dist > 350;
                }
              }

              return matchSearch && matchMode && matchCampus;
            });

            return (
              <div className="space-y-6">
                {/* 4 Executive Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Check-In Logs</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">{recordsList.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{totalWithGps} with GPS Coordinates</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">On-Campus Verified</div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">{onCampusCount}</div>
                      <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Within 350m of SBH Hospital</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-xs text-amber-800 font-bold uppercase tracking-wider">Remote / Off-Campus</div>
                      <div className="text-2xl font-black text-amber-600 mt-1">{offCampusCount}</div>
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5">Outside Hospital Geofence</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                      <Navigation className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-xs text-teal-800 font-bold uppercase tracking-wider">Room QR Scans</div>
                      <div className="text-2xl font-black text-teal-700 mt-1">{qrVerifiedCount}</div>
                      <div className="text-[11px] text-teal-600 font-medium mt-0.5">5th Floor Conference Room</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700">
                      <QrCode className="w-6 h-6 text-teal-600" />
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-[#dcdcdc] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search leader by name, phone, dept..."
                        value={geoSearchTerm}
                        onChange={(e) => setGeoSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] placeholder-slate-400 font-semibold focus:outline-none focus:border-[#2e7d32]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500">Date:</span>
                      <input
                        type="date"
                        value={geoDateFilter === 'ALL' ? '' : geoDateFilter}
                        onChange={(e) => setGeoDateFilter(e.target.value || 'ALL')}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      />
                      {geoDateFilter !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => setGeoDateFilter('ALL')}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 ml-1 underline cursor-pointer"
                        >
                          All Dates
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGeoDateFilter(selectedDate)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 ml-1 underline cursor-pointer"
                        >
                          Today
                        </button>
                      )}
                    </div>

                    <select
                      value={geoModeFilter}
                      onChange={(e) => setGeoModeFilter(e.target.value as any)}
                      className="bg-slate-50 border border-[#dcdcdc] text-xs font-bold text-[#1f2d2a] px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Modes (Physical & Virtual)</option>
                      <option value="PHYSICAL">Physical Room QR Only</option>
                      <option value="VIRTUAL">Virtual Google Meet Only</option>
                    </select>

                    <select
                      value={geoCampusFilter}
                      onChange={(e) => setGeoCampusFilter(e.target.value as any)}
                      className="bg-slate-50 border border-[#dcdcdc] text-xs font-bold text-[#1f2d2a] px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Locations</option>
                      <option value="ON_CAMPUS">On-Campus Only (Within 350m)</option>
                      <option value="REMOTE">Remote / Off-Campus Only</option>
                    </select>
                  </div>

                  <div className="text-xs font-bold text-slate-500 self-end md:self-center">
                    Showing <span className="text-slate-900 font-black">{filteredGeoRecords.length}</span> log records
                  </div>
                </div>

                {/* Geo-History Table */}
                <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Leader Name & Phone</th>
                          <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Department</th>
                          <th className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">Date & Time</th>
                          <th className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">Join Mode</th>
                          <th className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">GPS Coordinates</th>
                          <th className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">Campus Verification</th>
                          <th className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">Google Maps Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredGeoRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-400">
                              <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <div className="text-sm font-bold text-slate-600">No Check-in Geolocation Logs Found</div>
                              <div className="text-xs text-slate-400 mt-1">Try selecting a different date or clearing your search filters.</div>
                            </td>
                          </tr>
                        ) : (
                          filteredGeoRecords.map((rec) => {
                            const leader = leaders.find((l) => l.id === rec.leader_id);
                            const dept = leader?.department || departments.find((d) => d.id === leader?.department_id);
                            const dist = calculateCampusDistanceMeters(rec.latitude, rec.longitude);
                            const hasCoords = typeof rec.latitude === 'number' && typeof rec.longitude === 'number';
                            const isPhysical = rec.evidence_source === 'ROOM_STATIC_QR' || rec.selected_mode === 'PHYSICAL';

                            return (
                              <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 text-xs">
                                    {leader?.full_name || 'Leader ' + rec.leader_id.slice(0, 8)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    {leader?.employee_code || 'ID: ' + rec.leader_id.slice(0, 8)} • {leader?.phone || '—'}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                    {dept?.name || 'Hospital Leader'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center font-mono">
                                  <div className="font-bold text-slate-800 text-xs">{rec.meeting_date}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {rec.check_in_at
                                      ? new Date(rec.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                      : rec.first_event_at || '—'}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  {rec.evidence_source === 'ADMIN_MANUAL' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>Admin Manual</span>
                                    </span>
                                  ) : isPhysical ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>In-Person (Room QR)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                      <Video className="w-3.5 h-3.5 text-blue-700" />
                                      <span>Virtual (Meet)</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center font-mono text-[11px]">
                                  {hasCoords ? (
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        {rec.latitude!.toFixed(5)}, {rec.longitude!.toFixed(5)}
                                      </span>
                                      {rec.accuracy && (
                                        <span className="text-[10px] text-slate-400 block">
                                          Accuracy: ±{rec.accuracy}m
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">No GPS Logged</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  {dist !== null ? (
                                    dist <= 350 ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                        <span>On-Campus (~{dist}m)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                        <Navigation className="w-3.5 h-3.5 text-amber-700" />
                                        <span>Remote (~{(dist / 1000).toFixed(1)} km)</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">GPS Unavailable</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  {hasCoords ? (
                                    <a
                                      href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                                      title="Open coordinates in Google Maps"
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>View on Google Maps</span>
                                      <ExternalLink className="w-3 h-3 opacity-80" />
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-mono">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* ================= MODAL: RESCHEDULE / CADENCE EDIT ================= */}
      {showScheduleEditModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>Modify Date Cadence & Schedule: {selectedDate}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select whether this date is <b>DOM</b>, <b>WOM</b>, <b>MOM</b>, or <b>HOLIDAY</b>.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              {/* 4 Prominent Cadence Toggle Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Select Meeting Cadence</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCadenceSelectionInModal('DOM')}
                    className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${schedForm.cadence === 'DOM' && !schedForm.is_holiday_or_shifted
                        ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                        : 'bg-slate-50 hover:bg-orange-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    <div>
                      <span className="block text-xs font-black">DOM</span>
                      <span className="block text-[10px] opacity-80 font-normal">Daily Operations Meeting</span>
                    </div>
                    {schedForm.cadence === 'DOM' && !schedForm.is_holiday_or_shifted && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCadenceSelectionInModal('WOM')}
                    className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${schedForm.cadence === 'WOM' && !schedForm.is_holiday_or_shifted
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    <div>
                      <span className="block text-xs font-black">WOM</span>
                      <span className="block text-[10px] opacity-80 font-normal">Weekly Review (Every Monday)</span>
                    </div>
                    {schedForm.cadence === 'WOM' && !schedForm.is_holiday_or_shifted && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCadenceSelectionInModal('MOM')}
                    className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${schedForm.cadence === 'MOM' && !schedForm.is_holiday_or_shifted
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                        : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    <div>
                      <span className="block text-xs font-black">MOM</span>
                      <span className="block text-[10px] opacity-80 font-normal">Monthly Review (1st Monday)</span>
                    </div>
                    {schedForm.cadence === 'MOM' && !schedForm.is_holiday_or_shifted && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCadenceSelectionInModal('HOLIDAY')}
                    className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${schedForm.cadence === 'HOLIDAY' || schedForm.is_holiday_or_shifted
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                        : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    <div>
                      <span className="block text-xs font-black">HOLIDAY / OFF</span>
                      <span className="block text-[10px] opacity-80 font-normal">Hospital Stand-down</span>
                    </div>
                    {(schedForm.cadence === 'HOLIDAY' || schedForm.is_holiday_or_shifted) && <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={schedForm.title}
                  onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    required
                    value={schedForm.scheduled_time}
                    onChange={(e) => setSchedForm({ ...schedForm, scheduled_time: e.target.value })}
                    placeholder="10:00 AM IST"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Meet URL</label>
                  <input
                    type="url"
                    required
                    value={schedForm.google_meet_url}
                    onChange={(e) => setSchedForm({ ...schedForm, google_meet_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {schedForm.is_holiday_or_shifted && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900 mb-1">Holiday / Shift Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Rescheduled due to Public Holiday"
                    value={schedForm.shift_reason}
                    onChange={(e) => setSchedForm({ ...schedForm, shift_reason: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 cursor-pointer"
                >
                  Save Schedule & Cadence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT LEADER ================= */}
      {showAddLeaderModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#cfead6] text-[#2e7d32] rounded-2xl border border-[#2e7d32]/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1f2d2a]">
                    {editingLeader ? 'Edit Hospital Leader Profile' : 'Add New Hospital Leader'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Configure leader credentials, department, and active roster participation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLeaderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-pulse">
                <Check className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveLeader} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr Naman Mishra"
                  value={leaderForm.full_name}
                  onChange={(e) => setLeaderForm({ ...leaderForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@domain.com"
                    value={leaderForm.email}
                    onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Mobile</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={leaderForm.phone}
                    onChange={(e) => setLeaderForm({ ...leaderForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Master</label>
                  <select
                    value={leaderForm.department_id}
                    onChange={(e) => setLeaderForm({ ...leaderForm, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-bold cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                    {leaderForm.department_id && !departments.some((d) => d.id === leaderForm.department_id) && (
                      <option value={leaderForm.department_id}>
                        {editingLeader?.department?.name || 'Assigned Department'} ({editingLeader?.department?.code || 'DEPT'})
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Leader ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SBH-LEAD-101"
                    value={leaderForm.employee_code}
                    onChange={(e) => setLeaderForm({ ...leaderForm, employee_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Mode</label>
                  <select
                    value={leaderForm.expected_mode}
                    onChange={(e) => setLeaderForm({ ...leaderForm, expected_mode: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-bold cursor-pointer"
                  >
                    <option value="PHYSICAL">Physical (In-Person)</option>
                    <option value="VIRTUAL">Virtual (Google Meet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingLeader ? 'Change Password (Optional)' : 'Initial Password'}
                  </label>
                  <input
                    type="text"
                    placeholder={editingLeader ? 'Leave empty to keep current' : '123456'}
                    value={leaderForm.initialPassword}
                    onChange={(e) => setLeaderForm({ ...leaderForm, initialPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1f2d2a] focus:outline-none focus:border-[#2e7d32] font-mono"
                  />
                </div>
              </div>

              {/* ACTIVE STATUS TOGGLE / DISABLE USER OPTION */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <span>Account Participation Status:</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        leaderForm.is_active
                          ? 'bg-[#cfead6] text-[#2e7d32] border-[#2e7d32]/20'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {leaderForm.is_active ? 'Active' : 'Disabled (Inactive)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    {leaderForm.is_active
                      ? 'Participates in DOM daily attendance register & receives automated morning WhatsApp notices.'
                      : 'Disabled leaders are hidden from the attendance register and excluded from reminder broadcasts.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLeaderForm({ ...leaderForm, is_active: !leaderForm.is_active })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    leaderForm.is_active ? 'bg-[#2e7d32]' : 'bg-slate-300'
                  }`}
                  title={leaderForm.is_active ? 'Click to Disable' : 'Click to Activate'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      leaderForm.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLeaderModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeader}
                  className="px-6 py-2.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  {isSavingLeader ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingLeader ? 'Updating Profile...' : 'Saving Leader...'}</span>
                    </>
                  ) : (
                    <span>{editingLeader ? 'Update Leader Profile' : 'Save Leader'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT DEPARTMENT MASTER ================= */}
      {showAddDeptModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Building className="w-5 h-5 text-orange-600" />
              <span>{editingDept ? 'Edit Hospital Department' : 'Add New Hospital Department'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter official department name and abbreviated code for the hospital roster.
            </p>

            {deptFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-3 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deptFormError}</span>
              </div>
            )}

            {deptFormSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-3 flex items-center gap-2 font-bold animate-pulse">
                <Check className="w-4 h-4 shrink-0" />
                <span>{deptFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveDepartment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CARDIOLOGY, DIALYSIS, RADIOLOGY"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  placeholder="e.g. CARDIO, DIAL"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDept}
                  className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 cursor-pointer disabled:opacity-60 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  {isSavingDept ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingDept ? 'Updating Department...' : 'Adding Department...'}</span>
                    </>
                  ) : (
                    <span>{editingDept ? 'Update Department' : 'Add to Master'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE ADMIN CREDENTIALS & USERNAME (STORED IN SUPABASE SQL) ================= */}
      {showPasswordModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-orange-600" />
              Administrator Profile & Security
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Stored 100% in Supabase SQL database. Update your admin username, name and security password.
            </p>

            {passMsg && (
              <div
                className={`p-3 text-xs rounded-xl mb-3 font-semibold ${passMsg.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
              >
                {passMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrator Username (SQL Database)
                </label>
                <input
                  type="text"
                  required
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="e.g. admin or naman"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Designation
                </label>
                <input
                  type="text"
                  required
                  value={adminFullNameInput}
                  onChange={(e) => setAdminFullNameInput(e.target.value)}
                  placeholder="e.g. Administrator (Mr. Naman Mishra)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password (Required)</label>
                <input
                  type="password"
                  required
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Enter new password (optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdmin}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  {isSavingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSavingAdmin ? 'Saving to SQL...' : 'Save to SQL Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: OFFICIAL SBH BOARDROOM A4 PRINTABLE QR POSTER ================= */}
      <BoardroomQrPosterModal
        isOpen={showQrDisplayModal}
        onClose={() => setShowQrDisplayModal(false)}
        selectedDate={selectedDate}
      />

      {/* ================= MODAL: GOOGLE MEET VIRTUAL SCREEN QR CODE ================= */}
      {showVirtualQrModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 sm:p-8 text-center shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowVirtualQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-full bg-slate-100 cursor-pointer text-sm"
            >
              ✕
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 border border-teal-300 mb-3">
              <QrCode className="w-3.5 h-3.5 text-teal-600" /> Virtual Attendance Screen QR
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Google Meet Live Projection QR
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Share your screen in Google Meet. Virtual attendees scan this QR code with their mobile camera to verify attendance.
            </p>

            {/* Huge QR Code */}
            <div className="my-6 p-5 bg-slate-50 rounded-3xl inline-block shadow-inner border-2 border-teal-500/30">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `SBH-DOM-SESSION-${selectedDate}`
                )}`}
                alt="Google Meet Projection QR Code"
                className="w-64 h-64 mx-auto rounded-xl shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span>Session: {currentCadence} ({selectedDate})</span>
                <span className="text-teal-700">Code: SBH-DOM-{selectedDate}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Attendees scanning this will be marked <strong>Verified (Virtual)</strong> in the official DOM registry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN INFORMED LEAVE VERIFICATION ================= */}
      {informedLeaveModal.isOpen && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Document Informed Leave</h3>
                  <p className="text-[11px] text-slate-500">Record prior communication for attendance audit</p>
                </div>
              </div>
              <button
                onClick={() => setInformedLeaveModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hospital Leader / Staff
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {informedLeaveModal.leaderName}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Department: {informedLeaveModal.departmentName}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Informed To (Official / Person) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={informedLeaveModal.informedTo}
                  onChange={(e) => setInformedLeaveModal((prev) => ({ ...prev, informedTo: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="Director Sir">Director Sir</option>
                  <option value="Medical Superintendent">Medical Superintendent (MS)</option>
                  <option value="Chief Operating Officer (COO)">Chief Operating Officer (COO)</option>
                  <option value="HR & Admin Desk">HR & Admin Desk</option>
                  <option value="Department Head / HOD">Department Head / HOD</option>
                  <option value="Verbal Communication">Verbal Call / WhatsApp Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Absence / Leave <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency OT Duty, Hospital Emergency, Medical Sick Leave"
                  value={informedLeaveModal.reason}
                  onChange={(e) => setInformedLeaveModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-[11px] text-purple-800 font-semibold">
                  This will mark status as <strong>APPROVED LEAVE</strong> verified by Admin in today's register and WhatsApp report.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setInformedLeaveModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await markLeaderInformedLeave(
                    informedLeaveModal.leaderId,
                    selectedDate,
                    informedLeaveModal.informedTo,
                    informedLeaveModal.reason
                  );
                  setInformedLeaveModal((prev) => ({ ...prev, isOpen: false }));
                  setToastAlert({
                    type: 'success',
                    text: `Informed leave verified for ${informedLeaveModal.leaderName}!`,
                  });
                  setTimeout(() => setToastAlert(null), 3000);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Verify & Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN INFORMED LATE VERIFICATION & APPROVAL ================= */}
      {informedLateModal.isOpen && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Document & Approve Late Arrival</h3>
                  <p className="text-[11px] text-slate-500">Record prior late notice with required Admin Approval</p>
                </div>
              </div>
              <button
                onClick={() => setInformedLateModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hospital Leader / Staff
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {informedLateModal.leaderName}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Department: {informedLateModal.departmentName}
                </span>
              </div>

              {/* Late Minutes Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Delay Duration (Minutes Late)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        const h = 10;
                        const m = mins;
                        const etaStr = `${h}:${m < 10 ? '0' + m : m} AM`;
                        setInformedLateModal((prev) => ({
                          ...prev,
                          lateMinutes: mins,
                          expectedTime: etaStr,
                        }));
                      }}
                      className={`py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all border ${informedLateModal.lateMinutes === mins
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                    >
                      +{mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Arrival Time Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Late Minutes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={informedLateModal.lateMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value) || 0;
                      setInformedLateModal((prev) => ({
                        ...prev,
                        lateMinutes: mins,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expected ETA Time
                  </label>
                  <input
                    type="text"
                    value={informedLateModal.expectedTime}
                    onChange={(e) => setInformedLateModal((prev) => ({ ...prev, expectedTime: e.target.value }))}
                    placeholder="e.g. 10:15 AM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Informed To (Official / Person) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={informedLateModal.informedTo}
                  onChange={(e) => setInformedLateModal((prev) => ({ ...prev, informedTo: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="Director Sir">Director Sir</option>
                  <option value="Medical Superintendent">Medical Superintendent (MS)</option>
                  <option value="Chief Operating Officer (COO)">Chief Operating Officer (COO)</option>
                  <option value="Admin Desk">Admin Desk</option>
                  <option value="Department Head / HOD">Department Head / HOD</option>
                  <option value="WhatsApp Group Notice">WhatsApp Group Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Late Arrival <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward Rounds, Patient Emergency, Traffic Delay, OT Case"
                  value={informedLateModal.reason}
                  onChange={(e) => setInformedLateModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Mandatory Admin Approval Switch */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={informedLateModal.adminApproved}
                    onChange={(e) => setInformedLateModal((prev) => ({ ...prev, adminApproved: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-black text-amber-900">
                    Admin Approval Granted (Required to validate Informed Late)
                  </span>
                </label>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Per hospital protocol, late arrivals are only recognized as validly informed once verified by Admin. Unapproved delays remain classified as absent.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setInformedLateModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!informedLateModal.adminApproved}
                onClick={async () => {
                  await markLeaderInformedLate(
                    informedLateModal.leaderId,
                    selectedDate,
                    informedLateModal.lateMinutes,
                    informedLateModal.expectedTime,
                    informedLateModal.informedTo,
                    informedLateModal.reason
                  );
                  setInformedLateModal((prev) => ({ ...prev, isOpen: false }));
                  setToastAlert({
                    type: 'success',
                    text: `Late arrival (+${informedLateModal.lateMinutes}m ETA ${informedLateModal.expectedTime}) approved for ${informedLateModal.leaderName}!`,
                  });
                  setTimeout(() => setToastAlert(null), 4000);
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all ${informedLateModal.adminApproved
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                  }`}
              >
                Confirm & Approve Late Arrival
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECTOR FORMAL EMAIL REPORT ================= */}
      {showEmailModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Official Attendance Email Report
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Complete formal register with accurate timestamps for Director Sir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 block">Subject:</span>
              <span className="text-xs font-mono font-bold text-slate-800 select-all">
                {generateEmailReportDraft(selectedDate).subject}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              <pre className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] font-mono text-slate-800 whitespace-pre-wrap select-all">
                {generateEmailReportDraft(selectedDate).body}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateEmailReportDraft(selectedDate).body);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Full Report Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendDailyWhatsappReport(selectedDate)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to WhatsApp</span>
                </button>

                <a
                  href={generateEmailReportDraft(selectedDate).mailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Email Client</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ================= MODAL: GOOGLE APPS SCRIPT CODE & SETUP GUIDE ================= */}
      {false && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[9999] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Google Sheet & Google Drive Automation Script
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connects your Google Sheet to auto-save PDFs in Drive and post to WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick 3-Step Setup Instructions */}
            <div className="my-3 p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2 text-xs text-teal-950">
              <div className="font-black text-teal-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>3-Minute Setup Guide for Google Sheet:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-teal-900">
                <li>Create or open your official <b>Google Sheet</b>.</li>
                <li>Click <b>Extensions</b> &gt; <b>Apps Script</b> in Google Sheet top menu.</li>
                <li>Delete existing code, paste the script below, and click <b>Deploy &gt; New deployment</b>.</li>
                <li>Select <b>Web app</b>, set <i>Execute as: Me</i>, and <i>Who has access: Anyone</i>, then click Deploy.</li>
                <li>Copy the generated <b>Web App URL</b> and paste it into the Webhook box in Settings!</li>
              </ol>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Google Apps Script Code (Drive Folder & Group ID Pre-Configured):</span>
                <span className="text-[11px] text-teal-700 font-mono font-bold">Code.gs</span>
              </div>
              <pre className="bg-slate-900 text-teal-300 p-4 rounded-2xl border border-slate-800 text-[11px] font-mono whitespace-pre-wrap select-all overflow-x-auto">
{`/**
 * =======================================================================
 * SBH GROUP OF HOSPITALS, RAIPUR — DOM AUTOMATION PIPELINE (APPS SCRIPT)
 * Target Drive Folder: https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing
 * Target WhatsApp Group ID: 120363432056023698@g.us
 * =======================================================================
 */

const DRIVE_FOLDER_ID = "1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD";
const WHATSAPP_GROUP_ID = "120363432056023698@g.us";
const GOOGLE_MEET_URL = "https://meet.google.com/jrz-jfku-gir";

/**
 * 1. Webhook Endpoint: Receives PDF & Attendance from DOM Portal
 */
function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const data = JSON.parse(rawData);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("DOM_Daily_Log");
    
    // Auto-create sheet tab & headers if not exists
    if (!sheet) {
      sheet = ss.insertSheet("DOM_Daily_Log");
      sheet.appendRow([
        "Timestamp",
        "Meeting Date",
        "Cadence",
        "Meeting Title",
        "Total Leaders",
        "Present",
        "Absent",
        "Late",
        "Leave",
        "Compliance %",
        "Google Drive PDF Link",
        "Google Meet Link"
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#1b5e20").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    let driveFileUrl = "https://drive.google.com/drive/folders/" + DRIVE_FOLDER_ID;
    
    // Save generated PDF file into Google Drive Folder
    if (data.pdfBase64 && data.pdfFileName) {
      const decodedBytes = Utilities.base64Decode(data.pdfBase64);
      const blob = Utilities.newBlob(decodedBytes, "application/pdf", data.pdfFileName);
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileUrl = file.getUrl();
    }
    
    // Append row to Google Sheet
    sheet.appendRow([
      new Date(),
      data.date,
      data.cadence || "DOM",
      data.meetingTitle || "Daily Operations Meeting",
      data.totalLeaders || 21,
      data.presentCount || 0,
      data.absentCount || 0,
      data.lateCount || 0,
      data.leaveCount || 0,
      data.complianceRate || "0%",
      driveFileUrl,
      data.googleMeetUrl || GOOGLE_MEET_URL
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Report saved to Google Drive and logged in Sheet!",
      driveFileUrl: driveFileUrl,
      sheetRow: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. 09:50 AM Daily Automated Reminder Trigger
 * Set a Daily Time-driven trigger in Apps Script: 9:00 AM - 10:00 AM
 */
function sendDaily0950Notice() {
  const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd-MMM-yyyy");
  const msg = "🏥 *SBH GROUP OF HOSPITALS, RAIPUR*\\n" +
              "🔔 *09:50 AM NOTICE: DAILY OPERATIONS MEETING (DOM)*\\n" +
              "━━━━━━━━━━━━━━━━━━━━━━\\n" +
              "📅 *Date:* " + todayStr + "\\n" +
              "⏰ *Time:* Sharp 10:00 AM IST\\n" +
              "📍 *Venue:* Conference Room, 5th Floor\\n" +
              "💻 *Google Meet Link:* " + GOOGLE_MEET_URL + "\\n\\n" +
              "⚠️ All department leaders please assemble in-person or join Google Meet before 10:00 AM sharp.\\n" +
              "DOM Operations Command | SBH Raipur";
              
  Logger.log("Notice: " + msg);
}`}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <button
                onClick={() => {
                  const codeToCopy = `const DRIVE_FOLDER_ID = "1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD";
const WHATSAPP_GROUP_ID = "120363432056023698@g.us";
const GOOGLE_MEET_URL = "https://meet.google.com/jrz-jfku-gir";

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const data = JSON.parse(rawData);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("DOM_Daily_Log");
    
    if (!sheet) {
      sheet = ss.insertSheet("DOM_Daily_Log");
      sheet.appendRow([
        "Timestamp",
        "Meeting Date",
        "Cadence",
        "Meeting Title",
        "Total Leaders",
        "Present",
        "Absent",
        "Late",
        "Leave",
        "Compliance %",
        "Google Drive PDF Link",
        "Google Meet Link"
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#1b5e20").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    let driveFileUrl = "https://drive.google.com/drive/folders/" + DRIVE_FOLDER_ID;
    
    if (data.pdfBase64 && data.pdfFileName) {
      const decodedBytes = Utilities.base64Decode(data.pdfBase64);
      const blob = Utilities.newBlob(decodedBytes, "application/pdf", data.pdfFileName);
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileUrl = file.getUrl();
    }
    
    sheet.appendRow([
      new Date(),
      data.date,
      data.cadence || "DOM",
      data.meetingTitle || "Daily Operations Meeting",
      data.totalLeaders || 21,
      data.presentCount || 0,
      data.absentCount || 0,
      data.lateCount || 0,
      data.leaveCount || 0,
      data.complianceRate || "0%",
      driveFileUrl,
      data.googleMeetUrl || GOOGLE_MEET_URL
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Report saved to Google Drive and logged in Sheet!",
      driveFileUrl: driveFileUrl,
      sheetRow: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                  navigator.clipboard.writeText(codeToCopy);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Apps Script Code Copied!' : 'Copy Code to Clipboard'}</span>
              </button>

              <a
                href={appSettings.google_drive_folder_url || 'https://drive.google.com/drive/folders/1spy873NXbS_tP-aLSNfHYjAS3Ws4k9VD?usp=sharing'}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-teal-700" />
                <span>Open Google Drive Folder ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Action Modal with Animated Feedback */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[10001] p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmModal.type === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : confirmModal.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {confirmModal.type === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : confirmModal.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : confirmModal.type === 'warning' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 font-medium">Please confirm before proceeding</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-5 whitespace-pre-line leading-relaxed">
              {confirmModal.message}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={confirmModal.isExecuting}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmModal.isExecuting}
                onClick={async () => {
                  setConfirmModal((prev) => ({ ...prev, isExecuting: true }));
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setConfirmModal((prev) => ({ ...prev, isOpen: false, isExecuting: false }));
                  }
                }}
                className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : confirmModal.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : confirmModal.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-[#2e7d32] hover:bg-[#256628] shadow-[#2e7d32]/30'
                }`}
              >
                {confirmModal.isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmModal.confirmText || 'Confirm'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-Attendees Absence Escalation Email Modal */}
      {showEscalationModal && escalationData && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[10001] p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Email Non-Attendees Escalation Notice</h3>
                  <p className="text-xs text-slate-500">
                    Official absence explanation notice to all {escalationData.absentCount} unreported leaders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEscalationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Emails ({escalationData.toEmails.length} Leaders with Email)
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 max-h-24 overflow-y-auto">
                  {escalationData.toEmails.length > 0 ? (
                    escalationData.toEmails.join(', ')
                  ) : (
                    <span className="text-rose-500 font-sans">
                      No leader email addresses found in roster. Update email in Leaders master.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  readOnly
                  value={escalationData.subject}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Escalation Notice Body</label>
                <textarea
                  rows={10}
                  readOnly
                  value={escalationData.body}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(escalationData.body);
                  setToastAlert({ type: 'success', text: 'Escalation notice copied to clipboard!' });
                  setTimeout(() => setToastAlert(null), 3000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Notice Text</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = escalationData.mailtoUrl;
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open Email Client (mailto:)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
