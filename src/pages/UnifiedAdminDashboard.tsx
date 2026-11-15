import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { useNavigate } from 'react-router-dom';
import { Leader, Department, AttendanceStatus, MeetingFrequency, CadenceType } from '../types/database';
import { getCadenceInfo } from '../lib/meetingUtils';
import { MeetingCalendarView } from '../components/MeetingCalendarView';
import { AnalyticsReportsView } from '../components/AnalyticsReportsView';
import { generateDailyMeetingLink } from '../lib/meetingLinks';
import sbhLogo from '../assets/sbh-logo.png';
import { BoardroomQrPosterModal } from '../components/BoardroomQrPosterModal';

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
    sendCeoitboxRemindersToAll,
    sendCeoitboxEscalationToNonAttendees,
    sendCeoitboxGroupBroadcast,
    triggerAutomated0950Transmission,
    appSettings,
    updateAppSettings,
  } = useDomApp();

  // Automatic Daily Scheduled WhatsApp Group Broadcasts (Strictly 2 Stages: 09:50 AM & 10:30 AM)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [autoCeoitboxDispatch, setAutoCeoitboxDispatch] = useState<boolean>(() => {
    return localStorage.getItem('sbh_auto_ceoitbox_enabled') !== 'false';
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Skip Sundays automatically: No DOM standup / reminders on Sunday
      if (now.getDay() === 0) return;

      if (autoCeoitboxDispatch) {
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();
        const todayDate = now.toISOString().split('T')[0];

        // Stage 1: 09:50 AM Auto-Broadcast (Group + 24 Leaders with 15-min Magic Links)
        if (h === 9 && m === 50 && s === 0) {
          const key = `sbh_auto_group_0950_${todayDate}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, 'dispatched');
            triggerAutomated0950Transmission(todayDate);
            setToastAlert({
              type: 'success',
              text: '🔔 09:50 AM Automated Transmission Active: Notice broadcast to WhatsApp Group + all 24 Leaders with 15-min Magic Links!',
            });
            setTimeout(() => setToastAlert(null), 8000);
          }
        }

        // Stage 2: 10:30 AM Auto-Broadcast (Audit frozen & sent to Group)
        if (h === 10 && m === 30 && s === 0) {
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
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoCeoitboxDispatch, selectedDate]);

  // Real-time second-by-second countdown calculation & Live India Time details
  const countdown = (() => {
    // Current IST hours, minutes, seconds
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const s = currentTime.getSeconds();
    const nowSecs = h * 3600 + m * 60 + s;

    const target0950 = 9 * 3600 + 50 * 60; // 09:50 AM (35400s)
    const target1000 = 10 * 3600;           // 10:00 AM (36000s)
    const target1030 = 10 * 3600 + 30 * 60; // 10:30 AM (37800s)

    let diff = 0;
    let statusBadge = '';
    let statusColor: 'blue' | 'amber' | 'emerald' | 'purple' = 'blue';
    let countdownForTitle = '';
    let countdownForDescription = '';
    let targetMilestone = '';
    let stageTitle = '';
    let subtext = '';

    if (nowSecs < target0950) {
      diff = target0950 - nowSecs;
      statusBadge = '09:50 AM NOTICE BROADCAST';
      statusColor = 'blue';
      targetMilestone = '09:50 AM IST';
      stageTitle = 'Notice & 15-Minute Attendance Links Broadcast in';
      countdownForTitle = '09:50 AM Standup Notice & 15-Minute Quick Attendance Links';
      countdownForDescription = 'Automated transmission of official meeting agenda, Google Meet links, and personalized 15-minute quick attendance links to the WhatsApp Group and all 24 Department Leaders.';
      subtext = 'Automated alert broadcast to WhatsApp Group & Leaders 10 minutes prior to session';
    } else if (nowSecs < target1000) {
      diff = target1000 - nowSecs;
      statusBadge = '🚨 10:00 AM MEETING START';
      statusColor = 'amber';
      targetMilestone = '10:00 AM IST';
      stageTitle = '10:00 AM Sharp DOM Standup Starts in';
      countdownForTitle = '10:00 AM DOM Standup Assembly — All 24 Department Heads';
      countdownForDescription = 'All 24 hospital department leaders assemble in-person at Conference Room, 5th Floor or verify attendance virtually via Google Meet before 10:00 AM sharp.';
      subtext = 'All Department Leaders assemble in Boardroom / Virtual Meet';
    } else if (nowSecs < target1030) {
      diff = target1030 - nowSecs;
      statusBadge = '⏱️ 10:30 AM AUDIT FREEZE';
      statusColor = 'emerald';
      targetMilestone = '10:30 AM IST';
      stageTitle = 'Attendance Audit Freezes in';
      countdownForTitle = '10:30 AM Final Attendance Audit & Director Report';
      countdownForDescription = 'Meeting session actively underway. Late arrival verification and mode audit in progress. Executive compliance report freezes at 10:30 AM.';
      subtext = 'Late arrival verification in progress • Final audit frozen at 10:30 AM';
    } else {
      diff = (24 * 3600 - nowSecs) + target1000;
      statusBadge = 'TOMORROW 10:00 AM DOM';
      statusColor = 'purple';
      targetMilestone = 'Tomorrow 10:00 AM IST';
      stageTitle = 'Next Daily Operations Standup in';
      countdownForTitle = 'Next Daily Operations Standup (DOM) — Tomorrow 10:00 AM IST';
      countdownForDescription = "Today's attendance audit has concluded and recorded. The next Daily Operations Standup will commence tomorrow at sharp 10:00 AM IST.";
      subtext = "Today's Attendance Audit successfully completed and recorded";
    }

    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    const liveIndiaTime = currentTime.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const liveIndiaDate = currentTime.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      hoursStr: pad(hours),
      minsStr: pad(mins),
      secsStr: pad(secs),
      statusBadge,
      statusColor,
      stageTitle,
      subtext,
      countdownForTitle,
      countdownForDescription,
      targetMilestone,
      liveIndiaTime,
      liveIndiaDate,
    };
  })();

  const currentMeeting = getMeetingForDate(selectedDate);
  const currentCadence = currentMeeting.cadence || (currentMeeting.frequency === 'MONTHLY' ? 'MOM' : currentMeeting.frequency === 'WEEKLY' ? 'WOM' : 'DOM');

  // Active Tab: 'attendance' | 'calendar' | 'reports' | 'leaders' | 'departments' | 'settings' | 'links'
  const [activeTab, setActiveTab] = useState<
    'attendance' | 'calendar' | 'reports' | 'leaders' | 'departments' | 'settings' | 'links'
  >('attendance');

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

  // Filter records for the selected date
  const recordsForDate = attendanceRecords.filter((r) => r.meeting_date === selectedDate);
  const filteredRecords = recordsForDate.filter((r) => {
    const nameMatch =
      r.leader?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.leader?.department?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PHYSICAL'
          ? r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
          : statusFilter === 'VIRTUAL'
            ? r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT'
            : statusFilter === 'INFORMED_LATE'
              ? r.status === 'INFORMED_LATE'
              : statusFilter === 'LEAVE' || statusFilter === 'INFORMED_ABSENT'
                ? r.status === 'INFORMED_ABSENT' || r.status === 'LEAVE'
                : statusFilter === 'ABSENT'
                  ? r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
                  : r.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Calculate live statistics
  const totalLeaders = leaders.length;
  const countPhysical = recordsForDate.filter(
    (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
  ).length;
  const countVirtual = recordsForDate.filter((r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT').length;
  const countLate = recordsForDate.filter((r) => r.status === 'INFORMED_LATE' && r.late_approved_by_admin).length;
  const countInformed = recordsForDate.filter((r) => r.status === 'INFORMED_ABSENT' || r.status === 'LEAVE').length;
  const countAbsent = recordsForDate.filter(
    (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
  ).length;

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
    setLeaderForm({
      full_name: leader.full_name,
      email: leader.email,
      phone: leader.phone,
      department_id: leader.department_id || leader.department?.id || '',
      employee_code: leader.employee_code || '',
      expected_mode: leader.expected_mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL',
      role: leader.role,
      is_active: leader.is_active ?? true,
      initialPassword: '',
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
      text: '⚡ Launching 09:50 AM Automated Transmission to WhatsApp Group and all 24 Leaders with 15-Minute Magic Links...',
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

  // Filtered departments for Master view
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8faf9] flex font-sans antialiased text-[#1f2d2a]">
      {/* ================= PERMANENT FIXED LEFT SIDEBAR (Matching SBH PORTAL Design) ================= */}
      <aside className="w-68 xl:w-72 bg-slate-50 text-[#1f2d2a] shrink-0 sticky top-0 h-[calc(100vh-2.5rem)] flex flex-col border-r border-[#dcdcdc] z-30 shadow-sm overflow-hidden">
        {/* Sidebar Header: Hospital Emblem & Title */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200 bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 border border-[#dcdcdc] shadow-xs">
              <img src={sbhLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-[#1f2d2a] tracking-tight uppercase leading-none">
                SBH <span className="text-orange-600">DOM PORTAL</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                Daily Operations Meeting
              </span>
            </div>
          </div>
        </div>

        {/* Live Clock Pill inside Sidebar */}
        <div className="p-3 mx-2 my-2 rounded-2xl bg-white border border-[#dcdcdc] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-emerald-600 text-white">
                <Clock size={11} strokeWidth={3} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Clock</span>
            </div>
            <span className="text-[12px] font-black font-mono text-[#1f2d2a]">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Menu (Matching SBH Portal Orange Active & Green Legible Theme) */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Command Center
            </span>
          </div>

          {/* 🏠 Homepage Button: Live Attendance Register */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home size={18} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} className={activeTab === 'attendance' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
              <span className="truncate">Live Attendance Register</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              Live
            </span>
          </button>

          {/* 🔗 Daily Meeting Links Button */}
          <button
            onClick={() => setActiveTab('links')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'links'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <Video size={18} strokeWidth={activeTab === 'links' ? 2.5 : 2} className={activeTab === 'links' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
              <span className="truncate">Daily Meeting Links</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'links' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
              Meet
            </span>
          </button>

          {/* 👥 Leaders Roster Button */}
          <button
            onClick={() => setActiveTab('leaders')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'leaders'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} strokeWidth={activeTab === 'leaders' ? 2.5 : 2} className={activeTab === 'leaders' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
              <span className="truncate">Hospital Leaders Roster</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'leaders' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
              {leaders.length}
            </span>
          </button>

          {/* 🏢 Departments Master Button */}
          <button
            onClick={() => setActiveTab('departments')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building size={18} strokeWidth={activeTab === 'departments' ? 2.5 : 2} className={activeTab === 'departments' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
              <span className="truncate">Departments Master</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'departments' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
              {departments.length}
            </span>
          </button>

          {/* 📅 DOM / WOM / MOM Calendar Button */}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
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
            onClick={() => setActiveTab('reports')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 size={18} strokeWidth={activeTab === 'reports' ? 2.5 : 2} className={activeTab === 'reports' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
              <span className="truncate">Graphical Analytics</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'}`}>
              Graphs
            </span>
          </button>

          {/* ⚙️ WhatsApp & Settings Button */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`relative flex items-center justify-between w-full transition-[background-color,color,transform] duration-200 font-semibold tracking-wide text-[13px] px-4 py-3 rounded-xl cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50 transform scale-[1.02]'
                : 'text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 opacity-90 hover:opacity-100 hover:translate-x-1'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield size={18} strokeWidth={activeTab === 'settings' ? 2.5 : 2} className={activeTab === 'settings' ? 'text-white' : 'text-orange-500 flex-shrink-0'} />
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
            className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
          >
            <Download size={16} className="text-orange-500 shrink-0" />
            <span className="truncate">Daily Attendance PDF</span>
          </button>
          <button
            onClick={() => downloadMonthlyPdfReport('October 2026')}
            className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
          >
            <Download size={16} className="text-orange-500 shrink-0" />
            <span className="truncate">Monthly MOM Audit PDF</span>
          </button>
          <button
            onClick={() => downloadYearlyPdfReport(2026)}
            className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-emerald-950/80 hover:bg-orange-50 hover:text-orange-950 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
          >
            <Download size={16} className="text-orange-500 shrink-0" />
            <span className="truncate">Annual Hospital Audit PDF</span>
          </button>
        </div>

        {/* Sidebar Footer with Admin Controls & Clean Logout */}
        <div className="p-3 border-t border-slate-200 bg-white/50 space-y-2 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-100">
              <Shield size={16} className="text-[#2e7d32]" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="truncate font-black text-[#1f2d2a] text-xs leading-tight">
                {adminProfile?.full_name || 'Administrator'}
              </div>
              <div className="text-[9px] text-[#2e7d32] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span className="truncate">{adminProfile?.username || 'admin'} • Supabase SQL</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setShowQrDisplayModal(true)}
              className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-[#1f2d2a] border border-[#dcdcdc] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs hover:border-[#2e7d32]"
              title="Boardroom Static QR"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Room QR</span>
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
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
      </aside>

      {/* ================= RIGHT DASHBOARD CONTENT AREA (Attached to Sidebar) ================= */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-[#f8faf9] pb-16">
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
          {/* Meeting Type & Schedule Header Banner (Clean High-Contrast Reference Theme) */}
          <div className="bg-white rounded-2xl border border-[#dcdcdc] shadow-sm p-5 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-[#2e7d32] to-teal-500 absolute top-0 left-0" />
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-sm text-sm shrink-0 ${
                  currentCadence === 'MOM'
                    ? 'bg-purple-600'
                    : currentCadence === 'WOM'
                      ? 'bg-blue-600'
                      : currentMeeting.is_holiday_or_shifted
                        ? 'bg-amber-600'
                        : 'bg-gradient-to-br from-orange-500 to-amber-600'
                }`}
              >
                {currentCadence}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-orange-900 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    {currentCadence === 'MOM' && 'MOM — Monthly Strategic Session (1st Monday)'}
                    {currentCadence === 'WOM' && 'WOM — Weekly Review Session (Every Monday)'}
                    {currentCadence === 'DOM' && 'DOM — Daily Operations Standup'}
                    {currentCadence === 'HOLIDAY' && 'HOLIDAY — Standing Off-Day'}
                  </span>
                  {currentMeeting.is_holiday_or_shifted && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Rescheduled / Shifted
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1f2d2a] mt-1 tracking-tight">{currentMeeting.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#1f2d2a] bg-slate-100 px-2.5 py-1 rounded-lg border border-[#dcdcdc] font-mono">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    Scheduled: {currentMeeting.scheduled_time}
                  </span>
                  <span className="text-slate-300">•</span>
                  <a
                    href={currentMeeting.google_meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Meet: {currentMeeting.google_meet_url}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-orange-600" />
                <span>Modify Date / Cadence</span>
              </button>

              <button
                onClick={handleSendReminderNotice}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send {currentCadence} WhatsApp Notice</span>
              </button>

              <button
                onClick={() => sendNonAttendeesEscalationNotice(selectedDate)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Escalate Non-Attendees</span>
              </button>
            </div>
          </div>

          {/* ================= TAB 1: ATTENDANCE REGISTER ================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Live Command Center Countdown Banner (Crisp White + Clean High-Contrast Theme) */}
              <div className="p-5 rounded-2xl bg-white border border-[#dcdcdc] shadow-sm relative overflow-hidden space-y-4">
                <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/40 to-emerald-50/15 pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Top Row: Digital Clock (IST) + Modern Tabular Countdown + Target Milestone */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Digital Clock Box showing Live India Standard Time (IST) */}
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-[#dcdcdc] shadow-2xs shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#cfead6] text-[#2e7d32] flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-[#2e7d32] animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#2e7d32] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-ping" />
                          <span>Live India Time (IST)</span>
                          <span className="text-[9px] font-mono bg-white text-slate-700 px-1.5 py-0.2 rounded border border-[#dcdcdc] font-bold">Asia/Kolkata</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-black text-[#1f2d2a] tracking-wider">
                          {countdown.liveIndiaTime}
                        </div>
                        <div className="text-[10px] text-slate-600 font-semibold">
                          {countdown.liveIndiaDate}
                        </div>
                      </div>
                    </div>

                    {/* Real-time Second-by-Second Countdown Display (Executive Dark Card) */}
                    <div className="flex items-center justify-center gap-3 bg-[#1f2d2a] text-white px-6 py-2.5 rounded-xl shadow-sm border border-black/40">
                      <div className="text-center min-w-[42px]">
                        <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-wider">
                          {countdown.hoursStr}
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-wider">HRS</div>
                      </div>
                      <span className="text-2xl font-mono font-bold text-slate-500 animate-pulse">:</span>
                      <div className="text-center min-w-[42px]">
                        <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-wider">
                          {countdown.minsStr}
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-wider">MIN</div>
                      </div>
                      <span className="text-2xl font-mono font-bold text-slate-500 animate-pulse">:</span>
                      <div className="text-center min-w-[42px]">
                        <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-wider">
                          {countdown.secsStr}
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-wider">SEC</div>
                      </div>
                    </div>

                    {/* Active Target Milestone Badge */}
                    <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-[#dcdcdc] shadow-2xs flex flex-col justify-center min-w-[210px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          countdown.statusColor === 'amber'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : countdown.statusColor === 'blue'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : countdown.statusColor === 'purple'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-[#cfead6] text-[#2e7d32] border-[#2e7d32]/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${countdown.statusColor === 'amber' ? 'bg-amber-500 animate-ping' : 'bg-[#2e7d32] animate-ping'}`} />
                          {countdown.statusBadge}
                        </span>
                        <span className="text-[11px] text-[#1f2d2a] font-bold bg-white px-2 py-0.5 rounded border border-[#dcdcdc]">
                          Target: {countdown.targetMilestone}
                        </span>
                      </div>
                      <div className="text-xs text-[#1f2d2a] font-bold mt-1 truncate">
                        {countdown.stageTitle}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium truncate">
                        {countdown.subtext}
                      </div>
                    </div>
                  </div>

                  {/* Operations Action Bar with Clean Enterprise Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#dcdcdc]">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Master Automated 09:50 AM Trigger Button */}
                      <button
                        onClick={handleTriggerAutomatedTransmission}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        title={`Broadcast 09:50 AM Alerts to WhatsApp Group and all ${leaders.length} registered leaders with 15-Minute Magic Links`}
                      >
                        <Zap className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                        <span>⚡ Auto-Broadcast 09:50 AM (Group + {leaders.length} {leaders.length === 1 ? 'Leader' : 'Leaders'})</span>
                      </button>

                      {/* Approve All Pending Attendance Button */}
                      <button
                        onClick={async () => {
                          const res = await approveAllPendingRecords(selectedDate);
                          setToastAlert({ type: 'success', text: res.message });
                          setTimeout(() => setToastAlert(null), 5000);
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-[#2e7d32] border border-[#dcdcdc] hover:border-[#2e7d32] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        title="Approve all leaders who have joined on this date"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                        <span>Approve All Joined Today</span>
                      </button>

                      {/* Stage 1 (09:50 AM) Manual Button */}
                      <button
                        onClick={() => handleSendGroupCeoitbox('0950')}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Send 09:50 AM Meeting Reminder to Official WhatsApp Group"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-500" />
                        <span>Send 09:50 AM Reminder</span>
                      </button>

                      {/* Stage 2 (10:30 AM) Button */}
                      <button
                        onClick={() => handleSendGroupCeoitbox('1030')}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Send 10:30 AM Final Attendance & Absentee Audit to WhatsApp Group"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                        <span>Send 10:30 AM Report</span>
                      </button>

                      {/* Official WhatsApp Group Modal Link */}
                      <button
                        onClick={() => handleSendGroupCeoitbox('0950')}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Open Official WhatsApp Group Broadcast Center"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#2e7d32]" />
                        <span>Official WhatsApp Group</span>
                      </button>
                    </div>

                    {/* Auto-Scheduler Status Pill */}
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border shrink-0 ${
                        autoCeoitboxDispatch
                          ? 'bg-[#cfead6] text-[#2e7d32] border-[#2e7d32]/30 hover:bg-[#d6f5e3]'
                          : 'bg-white text-slate-700 border-[#dcdcdc] hover:text-[#1f2d2a]'
                      }`}
                    >
                      <Clock className={`w-3.5 h-3.5 ${autoCeoitboxDispatch ? 'text-[#2e7d32]' : 'text-slate-400'}`} />
                      <span>Auto-Scheduler: {autoCeoitboxDispatch ? 'ACTIVE' : 'PAUSED'}</span>
                    </button>
                  </div>

                  {/* OPERATIONS PURPOSE EXPLANATION & MILESTONES CARD */}
                  <div className="pt-3 border-t border-[#dcdcdc] bg-slate-50 -mx-5 -mb-5 px-5 py-3.5 rounded-b-2xl space-y-2.5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start sm:items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#2e7d32] text-white font-bold text-[11px] shadow-2xs shrink-0">
                          🎯 ACTIVE SESSION OBJECTIVE:
                        </span>
                        <span className="font-bold text-[#1f2d2a] text-xs">
                          {countdown.countdownForTitle}
                        </span>
                        <span className="text-slate-600 text-xs hidden xl:inline font-medium">
                          — {countdown.countdownForDescription}
                        </span>
                      </div>

                      {/* Venue & Leader Assembly Details */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700 shrink-0">
                        <span className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-md border border-[#dcdcdc] font-semibold">
                          📍 <strong className="text-[#1f2d2a]">Venue:</strong> Conference Room, 5th Floor
                        </span>
                        <span className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-md border border-[#dcdcdc] font-semibold">
                          👥 <strong className="text-[#1f2d2a]">Leaders:</strong> {leaders.length} Registered {leaders.length === 1 ? 'Leader' : 'Leaders'}
                        </span>
                        <span className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-md border border-[#dcdcdc] font-semibold">
                          💻 <strong className="text-[#1f2d2a]">Meet:</strong> Virtual Check-In
                        </span>
                      </div>
                    </div>

                    {/* 3-Step Milestone Schedule Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#dcdcdc] text-[11px]">
                      <div className="flex items-center gap-2 text-[#1f2d2a]">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0 border border-blue-200">1</span>
                        <span><strong>09:50 AM:</strong> Automated Notice Broadcast & Attendance Links</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#1f2d2a]">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-950 font-bold flex items-center justify-center text-[10px] shrink-0 border border-orange-200">2</span>
                        <span><strong>10:00 AM Sharp:</strong> DOM Standup Starts (Conference Room 5th Floor)</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#1f2d2a]">
                        <span className="w-5 h-5 rounded-full bg-[#cfead6] text-[#2e7d32] font-bold flex items-center justify-center text-[10px] shrink-0 border border-[#2e7d32]/20">3</span>
                        <span><strong>10:30 AM:</strong> Final Attendance Audit Frozen & Sent to Director</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Stat Cards (6 States: Scheduled, Physical, Virtual, Late Approved, Leave, Absent) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Scheduled */}
                <div
                  onClick={() => setStatusFilter('ALL')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-50 border-[#2e7d32] ring-2 ring-[#2e7d32]/10 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-[#2e7d32] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-slate-100 text-[#1f2d2a] transition-transform group-hover:scale-110 duration-200">
                      <Users className="w-5 h-5 text-slate-700" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                      Official {currentCadence}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{totalLeaders}</div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase opacity-80">Scheduled</div>
                </div>

                {/* 2. In-Person */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'PHYSICAL' ? 'ALL' : 'PHYSICAL')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'PHYSICAL'
                      ? 'bg-emerald-50/50 border-[#2e7d32] ring-2 ring-[#2e7d32]/20 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-[#2e7d32] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-[#cfead6] text-[#2e7d32] transition-transform group-hover:scale-110 duration-200">
                      <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#cfead6] text-[#2e7d32] uppercase tracking-wider border border-[#2e7d32]/20">
                      5th Floor Conf.
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{countPhysical}</div>
                  <div className="text-[10px] font-bold text-[#2e7d32] tracking-wider uppercase">In-Person</div>
                </div>

                {/* 3. Virtual */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'VIRTUAL' ? 'ALL' : 'VIRTUAL')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'VIRTUAL'
                      ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-blue-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 transition-transform group-hover:scale-110 duration-200">
                      <Video className="w-5 h-5 text-blue-700" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200">
                      Google Meet
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{countVirtual}</div>
                  <div className="text-[10px] font-bold text-blue-700 tracking-wider uppercase">Virtual</div>
                </div>

                {/* 4. Late (Approved) */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'INFORMED_LATE' ? 'ALL' : 'INFORMED_LATE')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'INFORMED_LATE'
                      ? 'bg-amber-50/50 border-amber-600 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-amber-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800 transition-transform group-hover:scale-110 duration-200">
                      <Clock className="w-5 h-5 text-amber-700" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">
                      Admin Approved
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{countLate}</div>
                  <div className="text-[10px] font-bold text-amber-800 tracking-wider uppercase">Late (Approved)</div>
                </div>

                {/* 5. Approved Leave */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'LEAVE' ? 'ALL' : 'LEAVE')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'LEAVE'
                      ? 'bg-purple-50/50 border-purple-600 ring-2 ring-purple-500/20 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-purple-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-800 transition-transform group-hover:scale-110 duration-200">
                      <HelpCircle className="w-5 h-5 text-purple-700" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider border border-purple-200">
                      Permission
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{countInformed}</div>
                  <div className="text-[10px] font-bold text-purple-800 tracking-wider uppercase">Approved Leave</div>
                </div>

                {/* 6. Absent */}
                <div
                  onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    statusFilter === 'ABSENT'
                      ? 'bg-rose-50/50 border-rose-600 ring-2 ring-rose-500/20 shadow-sm'
                      : 'bg-white border-[#dcdcdc] hover:border-rose-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-700 transition-transform group-hover:scale-110 duration-200">
                      <XCircle className="w-5 h-5 text-rose-700" />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase tracking-wider border border-rose-200">
                      Unexcused
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#1f2d2a] leading-none mb-1 tracking-tighter">{countAbsent}</div>
                  <div className="text-[10px] font-bold text-rose-700 tracking-wider uppercase">Absent</div>
                </div>
              </div>

              {/* Filter & Dispatch Action Bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#dcdcdc] shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search leader by name or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#dcdcdc] rounded-xl text-xs text-[#1f2d2a] placeholder-slate-400 font-semibold focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-[#dcdcdc] text-[#1f2d2a] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#2e7d32] font-bold"
                  >
                    <option value="ALL">All States</option>
                    <option value="PHYSICAL">In-Person (Physical 5th Flr)</option>
                    <option value="VIRTUAL">Virtual (Google Meet)</option>
                    <option value="PRESENT">Present (Verified)</option>
                    <option value="INFORMED_LATE">Informed Late (Admin Approved)</option>
                    <option value="CHECKED_IN">QR Scanned (Pending)</option>
                    <option value="INFORMED_ABSENT">Informed Leave</option>
                    <option value="LEAVE">Approved Leave</option>
                    <option value="PENDING">Pending / Unresolved</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                </div>

                {/* Action Buttons: PDF Download, Print & Email Report */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    onClick={() => downloadPdfReport(selectedDate)}
                    className="px-3.5 py-2 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Download Official PDF Report for Director Sir"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Director PDF</span>
                  </button>

                  <button
                    onClick={() => openPdfReport(selectedDate)}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-[#1f2d2a] border border-[#dcdcdc] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Print official PDF report"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-600" />
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
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
                              {rec.selected_mode === 'PHYSICAL' ? (
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
                              {!rec.admin_verified_attendance &&
                                (rec.status === 'PRESENT' || rec.status === 'INFORMED_LATE' || rec.selected_mode !== 'NONE') ? (
                                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                  <span>Approval Pending from Admin</span>
                                  {rec.late_minutes && rec.late_minutes > 0 ? (
                                    <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-black">
                                      +{rec.late_minutes}m Late
                                    </span>
                                  ) : null}
                                </span>
                              ) : rec.admin_verified_attendance ? (
                                <span className="text-[11px] bg-[#cfead6] text-[#2e7d32] font-bold px-2.5 py-0.5 rounded-full border border-[#2e7d32]/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                                  <span>PRESENT (Approved)</span>
                                  {rec.late_minutes && rec.late_minutes > 0 ? (
                                    <span className="text-[9px] bg-[#2e7d32] text-white px-1.5 py-0.2 rounded font-black">
                                      +{rec.late_minutes}m Late
                                    </span>
                                  ) : null}
                                </span>
                              ) : rec.status === 'LEAVE' ? (
                                <span className="text-[11px] bg-purple-100 text-purple-900 font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                                  APPROVED LEAVE {rec.informed_to_person ? `(${rec.informed_to_person})` : ''}
                                </span>
                              ) : rec.status === 'INFORMED_ABSENT' ? (
                                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                                  INFORMED ({rec.informed_to_person || 'Admin'})
                                </span>
                              ) : (
                                <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                                  ABSENT
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Admin Direct Approval Button for pending attendance */}
                                {!rec.admin_verified_attendance &&
                                  (rec.status === 'PRESENT' || rec.status === 'INFORMED_LATE' || rec.selected_mode !== 'NONE') && (
                                    <button
                                      onClick={async () => {
                                        const res = await approveAttendanceRecord(rec.id);
                                        setToastAlert({ type: 'success', text: res.message });
                                        setTimeout(() => setToastAlert(null), 4000);
                                      }}
                                      className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Approve Leader Attendance"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>
                                  )}

                                {rec.status !== 'PRESENT' && !rec.admin_verified_attendance && (
                                  <button
                                    onClick={() => adminVerifyStatus(rec.id, 'PRESENT', true, 'Manual Conference Room Check')}
                                    className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                                    title="Mark Present & Verified"
                                  >
                                    Mark Present
                                  </button>
                                )}
                                {rec.status !== 'INFORMED_LATE' && rec.status !== 'PRESENT' && (
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
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                    title="Document Late Arrival (Admin Approval Required)"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Informed Late</span>
                                  </button>
                                )}
                                {rec.status !== 'LEAVE' && (
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
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                    title="Mark Informed Leave (Admin Verified)"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Informed Leave</span>
                                  </button>
                                )}
                                {rec.status === 'INFORMED_ABSENT' && (
                                  <button
                                    onClick={() => confirmInformedAbsence(rec.id, true)}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                                    title="Approve Leave"
                                  >
                                    Approve Leave
                                  </button>
                                )}
                                {rec.status !== 'ABSENT' && (
                                  <button
                                    onClick={async () => {
                                      const res = await rejectAttendanceRecord(rec.id, 'Unexcused / Rejected by Admin');
                                      setToastAlert({ type: 'info', text: res.message });
                                      setTimeout(() => setToastAlert(null), 4000);
                                    }}
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
          {activeTab === 'leaders' && (
            <div className="space-y-6">
              <div className="fluent-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    <span>Hospital Leaders Directory ({leaders.length})</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Active: {leaders.filter((l) => l.is_active !== false).length}
                    </span>
                    {leaders.filter((l) => l.is_active === false).length > 0 && (
                      <span className="text-[11px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-300">
                        Disabled: {leaders.filter((l) => l.is_active === false).length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official hospital leaders. Only active leaders participate in DOM attendance register & receive notifications.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Status Filter */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRosterStatusFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        rosterStatusFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({leaders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterStatusFilter('ACTIVE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        rosterStatusFilter === 'ACTIVE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700'
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
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Disabled ({leaders.filter((l) => l.is_active === false).length})
                    </button>
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Leader</span>
                  </button>
                </div>
              </div>

              {/* Leaders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaders
                  .filter((lead) => {
                    if (rosterStatusFilter === 'ACTIVE') return lead.is_active !== false;
                    if (rosterStatusFilter === 'DISABLED') return lead.is_active === false;
                    return true;
                  })
                  .map((lead) => (
                    <div
                      key={lead.id}
                      className={`fluent-card p-5 rounded-2xl border-t-4 ${
                        lead.is_active !== false ? 'border-t-orange-500' : 'border-t-slate-400 opacity-75 bg-slate-50/70'
                      } flex flex-col justify-between fluent-card-hover transition-all`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">
                              {lead.role}
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
                          <span className="text-xs font-mono text-slate-400 font-semibold">{lead.employee_code}</span>
                        </div>

                        <h4 className="text-base font-black text-slate-900 mt-3">{lead.full_name}</h4>
                        <p className="text-xs text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {lead.department?.name || 'Department'}
                        </p>

                        <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-mono">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-orange-600" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{lead.phone || 'No Phone'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Expected: <span className="text-slate-800 font-bold">{lead.expected_mode}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleLeaderStatus(lead)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              lead.is_active !== false
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={lead.is_active !== false ? 'Disable Leader (Hide from Attendance)' : 'Activate Leader'}
                          >
                            {lead.is_active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEditLeaderModal(lead)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
            </div>
          )}

          {/* ================= TAB 5: DEPARTMENTS MASTER (24 OFFICIAL DEPARTMENTS) ================= */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="fluent-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-orange-600" />
                    <span>Hospital Departments Master ({departments.length})</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Official 24 Departments Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official departments for hospital leaders & operations. You can add, edit, or delete departments.
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
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Department</span>
                  </button>
                </div>
              </div>

              {/* Departments Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDepartments.map((dept, idx) => {
                  const assignedCount = leaders.filter((l) => l.department_id === dept.id).length;
                  return (
                    <div
                      key={dept.id}
                      className="fluent-card p-4 rounded-2xl border-t-4 border-t-emerald-600 flex flex-col justify-between fluent-card-hover"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {dept.code || `DEP-${idx + 1}`}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            Active
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 mt-2.5 truncate" title={dept.name}>
                          {dept.name}
                        </h4>

                        <div className="mt-3 text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[11px] text-slate-500">Assigned Leaders:</span>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-xs">
                            {assignedCount}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDeptModal(dept)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                                      <span className="text-[9px] bg-emerald-200 text-emerald-950 px-1 py-0.2 rounded font-black">
                                        +{record.late_minutes}m Late
                                      </span>
                                    ) : null}
                                  </span>
                                ) : isVirtualClicked || isQrScanned || isPhysical ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>Approval Pending from Admin</span>
                                    {record?.late_minutes && record.late_minutes > 0 ? (
                                      <span className="text-[9px] bg-amber-200 text-amber-950 px-1 py-0.2 rounded font-black">
                                        +{record.late_minutes}m Late
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
                        placeholder="919977881452-1431506963@g.us"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>Target Group for 09:50 AM, 10:10 AM & 10:30 AM broadcasts</span>
                        <a
                          href="https://app.ceoitbox.com/customer/channel/23642/group/919977881452-1431506963@g.us"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 font-bold underline"
                        >
                          Open in CEOITBOX (Channel 23642) ↗
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

        </div>
      </div>

      {/* ================= MODAL: RESCHEDULE / CADENCE EDIT ================= */}
      {showScheduleEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-100 text-orange-700 rounded-2xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingLeader ? 'Edit Hospital Leader Profile' : 'Add New Hospital Leader'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Configure leader credentials, department, and active roster participation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLeaderModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-3 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-3 flex items-center gap-2 font-bold animate-pulse">
                <Check className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveLeader} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr Naman Mishra"
                  value={leaderForm.full_name}
                  onChange={(e) => setLeaderForm({ ...leaderForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@domain.com"
                    value={leaderForm.email}
                    onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Master</label>
                  <select
                    value={leaderForm.department_id}
                    onChange={(e) => setLeaderForm({ ...leaderForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Leader ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SBH-LEAD-101"
                    value={leaderForm.employee_code}
                    onChange={(e) => setLeaderForm({ ...leaderForm, employee_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Mode</label>
                  <select
                    value={leaderForm.expected_mode}
                    onChange={(e) => setLeaderForm({ ...leaderForm, expected_mode: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* ACTIVE STATUS TOGGLE / DISABLE USER OPTION */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <span>Account Participation Status:</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        leaderForm.is_active
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
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
                    leaderForm.is_active ? 'bg-emerald-600' : 'bg-slate-300'
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

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLeaderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeader}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 cursor-pointer disabled:opacity-60 flex items-center gap-2 active:scale-95 transition-transform"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 text-center shadow-2xl relative border border-slate-200">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
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

      {/* Dedicated Official WhatsApp Group Dispatch Modal (100% Group Only, Ex-Employee Protected) */}
      {groupDispatchModal && groupDispatchModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Official WhatsApp Group Broadcast
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: Official Hospital Group ({appSettings.admin_whatsapp_group})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGroupDispatchModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Security Guarantee Notice against ex-employee */}
            <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <strong>Ex-Employee Safe:</strong> Individual number <span className="font-mono font-bold text-rose-700">+91 99778 81452</span> is blocked and will NEVER receive this. This message is prepared exclusively for the official WhatsApp group.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Message Preview ({groupDispatchModal.title}):</span>
                <span className="text-[11px] text-slate-400 font-normal">Pre-formatted English template</span>
              </div>
              <pre className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] font-mono text-slate-800 whitespace-pre-wrap select-all">
                {groupDispatchModal.message}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(groupDispatchModal.message);
                  setCopiedGroupNotice(true);
                  setTimeout(() => setCopiedGroupNotice(false), 2000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedGroupNotice ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGroupNotice ? 'Copied to Clipboard!' : 'Copy Notice Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href="https://app.ceoitbox.com/customer/channel/23642/group/919977881452-1431506963@g.us"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-teal-300" />
                  <span>CEOITBOX Group Chat ↗</span>
                </a>

                <a
                  href={`https://web.whatsapp.com/send?text=${encodeURIComponent(groupDispatchModal.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in WhatsApp Web ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
