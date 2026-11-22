import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Hospital,
  QrCode,
  Video,
  CheckCircle2,
  Search,
  Building,
  HelpCircle,
  Calendar,
  AlertCircle,
  Sparkles,
  KeyRound,
  LogOut,
  Clock,
  Lock,
  ShieldCheck,
  Camera,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { Leader } from '../types/database';
import { verifyLeaderMagicLink } from '../lib/magicLink';
import {
  getLiveIndiaDateStr,
  checkStandupWindowStatus,
  formatToIndianDate,
  formatFriendlyDate,
} from '../lib/meetingUtils';
import { LiveRoomQrScannerModal } from '../components/LiveRoomQrScannerModal';
import sbhLogo from '../assets/sbh-logo.png';

export const LeaderPortal: React.FC = () => {
  const navigate = useNavigate();
  const {
    leaders,
    selectedDate,
    setSelectedDate,
    markVirtualJoin,
    markRoomQrCheckIn,
    logMeetingRejoin,
    submitInformedAbsence,
    getMeetingForDate,
    attendanceRecords,
    refreshLiveAttendance,
  } = useDomApp();
  const { currentUser, logoutUser, updateUserPassword, isUserAuthenticated } = useAuthSession();

  // Real-time synchronization: sync on mount, focus, and every 30 seconds (gentle background fallback)
  React.useEffect(() => {
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshLiveAttendance();
      }
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshLiveAttendance();
      }
    }, 30000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshLiveAttendance]);

  // Always force live current date in India (IST) on mount so leaders never face "old date" check-in errors
  React.useEffect(() => {
    const liveDate = getLiveIndiaDateStr();
    if (selectedDate !== liveDate) {
      setSelectedDate(liveDate);
    }
  }, []);

  const currentMeeting = getMeetingForDate(selectedDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(() => {
    if (currentUser) return currentUser;
    const remembered = localStorage.getItem('sbh_device_remembered_leader');
    if (remembered) {
      try {
        return JSON.parse(remembered);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Magic Link Authentication State (15-Minute Expiration System)
  const [magicAuthStatus, setMagicAuthStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    expired?: boolean;
    name?: string;
    dept?: string;
    remainingSecs?: number;
  }>({ tested: false });

  // On Mount: Check for ?auth= parameter in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get('auth');
    if (authParam) {
      const res = verifyLeaderMagicLink(authParam);
      if (res.valid && res.payload) {
        setMagicAuthStatus({
          tested: true,
          valid: true,
          name: res.payload.name,
          dept: res.payload.dept,
          remainingSecs: res.remainingSeconds,
        });

        // Find leader in master roster
        const matched = leaders.find(
          (l) => l.id === res.payload?.leaderId || l.phone?.replace(/\D/g, '') === res.payload?.phone?.replace(/\D/g, '')
        );

        if (matched) {
          setSelectedLeader(matched);
        } else {
          setSelectedLeader({
            id: res.payload.leaderId,
            full_name: res.payload.name,
            email: `${res.payload.name.toLowerCase().replace(/\s+/g, '')}@sbhhospital.com`,
            phone: res.payload.phone,
            role: 'LEADER',
            expected_mode: 'PHYSICAL',
            is_active: true,
            department: { id: 'dept-auto', name: res.payload.dept, code: 'DEPT', is_active: true, created_at: '', updated_at: '' },
            created_at: '',
            updated_at: '',
          });
        }
      } else if (res.expired) {
        setMagicAuthStatus({
          tested: true,
          valid: false,
          expired: true,
          name: res.payload?.name,
          dept: res.payload?.dept,
        });
      }
    }
  }, [leaders]);

  // Absence & Late notice modal
  const [showInformedModal, setShowInformedModal] = useState(false);
  const [informedNoticeType, setInformedNoticeType] = useState<'LATE' | 'LEAVE'>('LATE');
  const [informedLateMinutes, setInformedLateMinutes] = useState<number>(10);
  const [informedToPerson, setInformedToPerson] = useState('');
  const [informedReason, setInformedReason] = useState('');
  const [showExpiredAccessModal, setShowExpiredAccessModal] = useState<boolean>(false);
  const [showMeetingClosedModal, setShowMeetingClosedModal] = useState<boolean>(false);

  // Live 1-second ticker for accurate countdowns
  const [liveNow, setLiveNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Password Modal for Leader self password change
  const [showUserPassModal, setShowUserPassModal] = useState(false);
  const [oldUserPass, setOldUserPass] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userPassMsg, setUserPassMsg] = useState<{ success?: boolean; text?: string } | null>(null);

  // Status feedback
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  // 10:05 AM to 10:20 AM Late Arrival Reason State
  const [showLateReasonModal, setShowLateReasonModal] = useState<boolean>(false);
  const [pendingLateMode, setPendingLateMode] = useState<'PHYSICAL' | 'VIRTUAL' | null>(null);
  const [lateReasonInput, setLateReasonInput] = useState<string>('');
  const [calculatedLateMinutes, setCalculatedLateMinutes] = useState<number>(0);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Modals for Virtual Join Confirmation & Success Feedback
  const [showVirtualConfirmModal, setShowVirtualConfirmModal] = useState(false);
  const [isVirtualSubmitting, setIsVirtualSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [attendanceSuccessModal, setAttendanceSuccessModal] = useState<{
    isOpen: boolean;
    mode: 'PHYSICAL' | 'VIRTUAL';
    leaderName: string;
    departmentName: string;
    joinTime: string;
    meetUrl?: string;
  } | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      localStorage.removeItem('sbh_active_user_session');
      localStorage.removeItem('sbh_device_remembered_leader');
      localStorage.removeItem('sbh_leader_id');
      localStorage.removeItem('sbh_leader_name');
      sessionStorage.clear();
    } catch {}
    await logoutUser();
  };

  // Lock body scroll and keep view centered whenever any modal is opened
  useEffect(() => {
    const isAnyModalOpen =
      showInformedModal ||
      showLateReasonModal ||
      showUserPassModal ||
      showExpiredAccessModal ||
      showMeetingClosedModal ||
      showScannerModal ||
      showVirtualConfirmModal ||
      Boolean(attendanceSuccessModal?.isOpen);

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [
    showInformedModal,
    showLateReasonModal,
    showUserPassModal,
    showExpiredAccessModal,
    showMeetingClosedModal,
    showScannerModal,
    showVirtualConfirmModal,
    attendanceSuccessModal,
  ]);

  const checkIsBetween1005And1020 = () => {
    let h = 0;
    let m = 0;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(new Date());
      h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    } catch {
      const d = new Date();
      h = d.getHours();
      m = d.getMinutes();
    }
    const totalMins = h * 60 + m;
    // 10:05 AM is 605, 10:20 AM is 620
    if (totalMins >= 605 && totalMins <= 620) {
      return { isLate: true, lateMinutes: totalMins - 600 };
    }
    return { isLate: false, lateMinutes: 0 };
  };

  const activeLeader = currentUser || selectedLeader;

  const filteredLeaders = leaders.filter(
    (l) =>
      l.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.department?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayRecord = attendanceRecords.find(
    (r) =>
      r.leader_id === activeLeader?.id &&
      (r.meeting_date === selectedDate || (r as any).attendance_date === selectedDate)
  );

  const hasJoinedToday = Boolean(
    todayRecord &&
      todayRecord.status !== 'PENDING' &&
      todayRecord.status !== 'ABSENT' &&
      todayRecord.status !== 'EXCUSED' &&
      todayRecord.status !== 'INFORMED_ABSENT' &&
      (todayRecord.check_in_at ||
        (todayRecord as any).join_time ||
        todayRecord.status === 'PRESENT')
  );

  const windowStatus = checkStandupWindowStatus(
    selectedDate,
    hasJoinedToday,
    currentMeeting.cadence,
    currentMeeting.scheduled_time,
    todayRecord?.committed_late_minutes || todayRecord?.late_minutes
  );

  const isCutoffLocked = !hasJoinedToday && !windowStatus.allowed && windowStatus.code === 'AFTER_WINDOW';

  const isSundayOrHoliday = useMemo(() => {
    // If admin explicitly scheduled a live meeting cadence (DOM/WOM/MOM) and not holiday, standup is ACTIVE
    if (
      (currentMeeting.cadence === 'DOM' || currentMeeting.cadence === 'WOM' || currentMeeting.cadence === 'MOM') &&
      !currentMeeting.is_holiday_or_shifted
    ) {
      return false;
    }
    const isSun = new Date(selectedDate + 'T00:00:00').getDay() === 0;
    return isSun || currentMeeting.cadence === 'HOLIDAY' || Boolean(currentMeeting.is_holiday_or_shifted);
  }, [currentMeeting, selectedDate]);

  const isOnLeave = Boolean(
    todayRecord &&
      (todayRecord.status === 'LEAVE' ||
        (todayRecord.status === 'INFORMED_ABSENT' && todayRecord.informed_confirmed))
  );

  const isCheckInDisabled = isCutoffLocked || isSundayOrHoliday || isOnLeave;

  // Handle Boardroom Physical QR Scan Arrival (?action=room_qr)
  useEffect(() => {
    if (!activeLeader) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'room_qr') {
      // Clear parameter from URL so reload does not re-trigger
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // If already recorded today, immediately show confirmation modal
      if (hasJoinedToday) {
        setAttendanceSuccessModal({
          isOpen: true,
          mode: 'PHYSICAL',
          leaderName: activeLeader.full_name,
          departmentName: activeLeader.department?.name || 'Leadership',
          joinTime: todayRecord?.check_in_at
            ? new Date(todayRecord.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : 'Recorded Today',
        });
        return;
      }

      // Execute physical check-in submission
      (async () => {
        let geoCoords: { latitude?: number; longitude?: number; accuracy?: number } | undefined;
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
            });
            geoCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            };
          } catch (e) {
            console.warn('Geolocation not acquired on scan:', e);
          }
        }

        const isSundayTest = new Date(selectedDate + 'T00:00:00').getDay() === 0;
        const res = await markRoomQrCheckIn(activeLeader.id, {
          ...geoCoords,
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Direct Boardroom Scan',
          isTestMode: isSundayTest,
        });

        if (res.success) {
          setAttendanceSuccessModal({
            isOpen: true,
            mode: 'PHYSICAL',
            leaderName: activeLeader.full_name,
            departmentName: activeLeader.department?.name || 'Leadership',
            joinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          });
          setActionMessage({
            success: true,
            text: '✅ Boardroom physical attendance confirmed via QR scan!',
          });
        } else {
          setActionMessage({
            success: false,
            text: res.message || 'Boardroom QR verification failed.',
          });
        }
      })();
    }
  }, [activeLeader, hasJoinedToday, todayRecord, markRoomQrCheckIn, selectedDate]);

  const hasInformedAbsence = Boolean(
    todayRecord &&
      (todayRecord.status === 'INFORMED_ABSENT' ||
        todayRecord.status === 'LEAVE' ||
        (todayRecord.informed_reason && todayRecord.status !== 'INFORMED_LATE'))
  );

  const isInformedLatePending = Boolean(
    todayRecord &&
      todayRecord.status === 'INFORMED_LATE' &&
      !todayRecord.check_in_at
  );

  // Calculates remaining seconds until the leader's committed late arrival deadline
  const getLateGraceSecondsLeft = () => {
    if (!todayRecord || todayRecord.status !== 'INFORMED_LATE' || todayRecord.check_in_at) return 0;
    const clampedLate = Math.min(Math.max(todayRecord.late_minutes || 10, 5), 30);

    let h = 10;
    let m = 0;
    try {
      const match = (currentMeeting.scheduled_time || '10:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        h = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
        const meridian = match[3] || 'AM';
        if (meridian === 'PM' && h < 12) h += 12;
        if (meridian === 'AM' && h === 12) h = 0;
      }
    } catch {
      h = 10;
      m = 0;
    }
    const deadlineTotalSecs = (h * 60 + m + clampedLate) * 60;

    let curH = 0;
    let curM = 0;
    let curS = 0;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(liveNow);
      curH = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      curM = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      curS = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
    } catch {
      curH = liveNow.getHours();
      curM = liveNow.getMinutes();
      curS = liveNow.getSeconds();
    }
    const curTotalSecs = curH * 3600 + curM * 60 + curS;
    return deadlineTotalSecs - curTotalSecs;
  };

  const lateSecondsLeft = getLateGraceSecondsLeft();
  const isLateGraceExpired = isInformedLatePending && lateSecondsLeft <= 0;

  const formattedCheckInTime = todayRecord?.check_in_at
    ? new Date(todayRecord.check_in_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : (todayRecord as any)?.join_time || 'Recorded Today';

  const handleAttendPhysically = () => {
    if (!activeLeader) return;
    if (isSundayOrHoliday) {
      setActionMessage({
        success: false,
        text: '🏖️ Official Hospital Weekly Off (Sunday). Standup attendance is excused and check-in is closed.',
      });
      return;
    }
    if (isOnLeave) {
      setActionMessage({
        success: false,
        text: '🏖️ You are currently marked on Official Leave for today. Attendance check-in is excused.',
      });
      return;
    }
    if (currentMeeting.is_completed) {
      setShowMeetingClosedModal(true);
      return;
    }
    if (isCutoffLocked || isLateGraceExpired) {
      setShowExpiredAccessModal(true);
      return;
    }
    const { isLate, lateMinutes } = checkIsBetween1005And1020();
    if (isLate && !lateReasonInput.trim()) {
      setCalculatedLateMinutes(lateMinutes);
      setPendingLateMode('PHYSICAL');
      setShowLateReasonModal(true);
      return;
    }
    setShowScannerModal(true);
  };

  const handleLiveCameraQrSuccess = async (scanResult: {
    scannedData: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => {
    if (!activeLeader) return;
    setShowScannerModal(false);

    const res = await markRoomQrCheckIn(activeLeader.id, {
      latitude: scanResult.latitude,
      longitude: scanResult.longitude,
      accuracy: scanResult.accuracy,
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Live Camera',
      lateReason: lateReasonInput.trim() || undefined,
    });

    if (res.success) {
      setAttendanceSuccessModal({
        isOpen: true,
        mode: 'PHYSICAL',
        leaderName: activeLeader.full_name,
        departmentName: activeLeader.department?.name || 'Leadership',
        joinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
      setActionMessage({
        success: true,
        text: '✅ Boardroom physical attendance confirmed via live camera scan!',
      });
    } else {
      setActionMessage({
        success: false,
        text: res.message || 'Physical verification failed. Please try again.',
      });
    }
  };

  const executeVirtualJoin = async (reason?: string) => {
    if (!activeLeader) return;
    setIsVirtualSubmitting(true);

    // Acquire GPS location telemetry if permission granted
    let geoCoords: { latitude?: number; longitude?: number; accuracy?: number; lateReason?: string } | undefined;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 60000 });
        });
        geoCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          lateReason: reason,
        };
      } catch (e) {
        console.warn('Geolocation not permitted for virtual join:', e);
      }
    }
    if (!geoCoords && reason) {
      geoCoords = { lateReason: reason };
    }

    const res = await markVirtualJoin(activeLeader.id, selectedDate, geoCoords);
    setIsVirtualSubmitting(false);
    setShowVirtualConfirmModal(false);

    if (res.success) {
      const meetUrl = res.meetUrl || currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir';
      setAttendanceSuccessModal({
        isOpen: true,
        mode: 'VIRTUAL',
        leaderName: activeLeader.full_name,
        departmentName: activeLeader.department?.name || 'Leadership',
        joinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        meetUrl,
      });

      // Smoothly launch official Google Meet
      setTimeout(() => {
        window.open(meetUrl, '_blank');
      }, 700);
    } else {
      setActionMessage({
        success: false,
        text: res.message || 'Unable to record virtual attendance. Please try again.',
      });
    }
  };

  const handleJoinVirtually = async () => {
    if (!activeLeader) return;
    if (isSundayOrHoliday) {
      setActionMessage({
        success: false,
        text: '🏖️ Official Hospital Weekly Off (Sunday). Standup attendance is excused and check-in is closed.',
      });
      return;
    }
    if (isOnLeave) {
      setActionMessage({
        success: false,
        text: '🏖️ You are currently marked on Official Leave for today. Attendance check-in is excused.',
      });
      return;
    }
    if (currentMeeting.is_completed) {
      setShowMeetingClosedModal(true);
      return;
    }
    if (isCutoffLocked || isLateGraceExpired) {
      setShowExpiredAccessModal(true);
      return;
    }
    const { isLate, lateMinutes } = checkIsBetween1005And1020();
    if (isLate && !lateReasonInput.trim()) {
      setCalculatedLateMinutes(lateMinutes);
      setPendingLateMode('VIRTUAL');
      setShowLateReasonModal(true);
      return;
    }
    // Present Confirmation Dialog before recording virtual presence & launching meet
    setShowVirtualConfirmModal(true);
  };

  const handleRejoinMeeting = async () => {
    if (!activeLeader) return;
    const meetUrl = currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir';
    await logMeetingRejoin(activeLeader.id, meetUrl);
    window.open(meetUrl, '_blank');
    setActionMessage({
      success: true,
      text: `Rejoining DOM session! Telemetry logged in SQL database: ${meetUrl}`,
    });
  };

  const handleInformedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeader || !informedToPerson.trim() || !informedReason.trim()) return;

    const res = await submitInformedAbsence(
      activeLeader.id,
      informedToPerson.trim(),
      informedReason.trim(),
      informedNoticeType,
      informedNoticeType === 'LATE' ? informedLateMinutes : undefined
    );
    setActionMessage({ success: res.success, text: res.message });
    setShowInformedModal(false);
    setInformedToPerson('');
    setInformedReason('');
  };

  const handleUserPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeader) return;
    setUserPassMsg(null);
    const res = await updateUserPassword(activeLeader.id, oldUserPass, newUserPass);
    setUserPassMsg({ success: res.success, text: res.message });
    if (res.success) {
      setOldUserPass('');
      setNewUserPass('');
    }
  };

  if (isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl flex flex-col items-center text-center max-w-sm w-full space-y-3 animate-in fade-in zoom-in duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
            <LogOut className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Signing Out...</h3>
            <p className="text-xs text-slate-500 mt-1">Directly returning to login portal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] text-[#232d42] flex flex-col font-sans p-2.5 sm:p-5 pb-16 items-center page-transition">
      <div className="w-full max-w-xl space-y-3 sm:space-y-4">
        {/* Header Branding (Compact SaaS Lavender Reference Theme) */}
        <div className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-center relative overflow-hidden bg-white shadow-xl shadow-purple-900/5 border border-[#f0f1f8]">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#7065f0] via-[#7065f0] to-[#8577ff] absolute top-0 left-0" />
          
          {/* Top Right Admin Direct Access */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="absolute top-3 right-3 text-[11px] font-bold text-slate-500 hover:text-[#7065f0] flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 transition-all cursor-pointer shadow-2xs z-10"
            title="Go to Command Admin Login"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#7065f0]" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          <div className="flex items-center justify-center mx-auto mb-1.5 pt-0.5">
            <img src={sbhLogo} alt="SBH Group of Hospitals" className="h-8 sm:h-9 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#eff0fe] text-[#7065f0] border border-purple-200/60 mb-1">
            <Sparkles className="w-3 h-3 text-[#7065f0]" /> SBH Group of Hospitals • Raipur
          </div>
          <h1 className="text-base sm:text-xl font-bold text-[#232d42] tracking-tight">Leader Attendance Portal</h1>

          {/* Compact Cadence Badge & Session Date */}
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium flex-wrap">
            <span
              className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                currentMeeting.frequency === 'MONTHLY'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : currentMeeting.frequency === 'WEEKLY'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-[#eff0fe] text-[#7065f0] border border-purple-200/60'
              }`}
            >
              {currentMeeting.title}
            </span>
            <span>•</span>
            <span className="font-bold text-[#232d42]">{formatFriendlyDate(selectedDate)}</span>
            <span className="text-slate-400 font-mono text-[10px]">({formatToIndianDate(selectedDate)})</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{currentMeeting.scheduled_time}</span>
          </div>

          {currentMeeting.is_holiday_or_shifted && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{currentMeeting.shift_reason || 'Rescheduled meeting session'}</span>
            </div>
          )}

          {/* Personalized 1-Click Magic Link Welcome Banner */}
          {magicAuthStatus.valid && (
            <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border-2 border-emerald-400 text-left shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <span>✨ Verified 1-Click Access</span>
                    <span className="bg-emerald-200/80 text-emerald-900 px-1 py-0.2 rounded font-mono text-[9px]">15m Active</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    Welcome, {magicAuthStatus.name}!
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium truncate">
                    Dept: <span className="text-orange-700 font-bold">{magicAuthStatus.dept}</span> • Select check-in below
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expired Magic Link Alert */}
          {magicAuthStatus.expired && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-left text-xs text-amber-900 shadow-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Quick Link Expired</strong>
                <span className="text-[11px]">Access link for {magicAuthStatus.name} expired. Sign in below.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Status Feedback */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 shadow-md ${
              actionMessage.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {actionMessage.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="text-xs font-bold">{actionMessage.text}</div>
          </div>
        )}

        {/* If no leader is selected/authenticated, redirect directly to login without exposing leader roster */}
        {!activeLeader ? (
          <Navigate to="/login" replace />
        ) : (
          /* Step 2: Selected / Logged-in Leader - Choose Mode */
          <div className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 bg-white border border-[#f0f1f8] shadow-xl shadow-purple-900/5">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f8]">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-[#7065f0] bg-[#eff0fe] px-2 py-0.5 rounded-full border border-purple-200/60 font-bold">
                    Active Leader
                  </span>
                  {activeLeader.employee_code && (
                    <span className="text-[9px] font-mono text-slate-400">
                      {activeLeader.employee_code}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#232d42] truncate">{activeLeader.full_name}</h3>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  <span className="text-[#7065f0] font-semibold">{activeLeader.department?.name || 'Department'}</span> • {activeLeader.email}
                </div>
              </div>

              {/* Single Official Sign Out & PIN Change button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setShowUserPassModal(true)}
                    className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Change Account PIN / Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">PIN</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                  title="Sign out from this leader account"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>

            {hasJoinedToday ? (
              /* State A: Attendance is ALREADY Recorded Today -> Clean Rejoin Option Only */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#eff0fe]/30 via-white to-white border-2 border-purple-200/80 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#7065f0] bg-[#eff0fe] px-3 py-1 rounded-full border border-purple-200/60 font-bold inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#7065f0]" /> Attendance Confirmed Today
                      </span>
                      <h4 className="text-base font-bold text-[#232d42] mt-2">
                        You have already joined today's DOM meeting
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Official attendance timestamp locked in audit register.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Join Time</div>
                      <div className="text-xs font-mono font-bold text-[#7065f0] bg-white px-2.5 py-1 rounded-lg border border-purple-200/60 mt-0.5 shadow-2xs">
                        {formattedCheckInTime}
                      </div>
                    </div>
                  </div>

                  {/* Mode & Director Sign-Off Info */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                    <div className="bg-white/80 border border-[#f0f1f8] rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Recorded Mode</div>
                      <div className="font-bold text-[#232d42] mt-0.5 flex items-center gap-1.5 text-xs truncate">
                        {todayRecord?.selected_mode === 'PHYSICAL' ? (
                          <><QrCode className="w-3.5 h-3.5 text-[#7065f0] shrink-0" /> In-Room Physical</>
                        ) : (
                          <><Video className="w-3.5 h-3.5 text-[#3bb7b8] shrink-0" /> Virtual (Google Meet)</>
                        )}
                      </div>
                    </div>
                    <div className="bg-white/80 border border-[#f0f1f8] rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Audit Verification</div>
                      <div className="font-bold mt-0.5 flex items-center gap-1.5 text-xs truncate">
                        {todayRecord?.admin_verified_attendance ? (
                          <span className="text-[#059669] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#059669] shrink-0" /> APPROVED
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Awaiting Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejoin Meeting Action (Silent SQL Telemetry Log, Zero Frontend Clutter) */}
                <div className="pt-1">
                  <button
                    onClick={handleRejoinMeeting}
                    className="w-full py-3.5 px-5 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-300/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Video className="w-4 h-4 text-white" />
                    <span>Rejoin Official Meeting (Google Meet) &rarr;</span>
                  </button>
                </div>
              </div>
            ) : isInformedLatePending ? (
              /* State D: Informed Late Notice Active -> Live Countdown & Grace Window Check-In */
              <div className="space-y-4">
                <div
                  className={`p-5 rounded-2xl border-2 shadow-sm space-y-4 transition-all ${
                    isLateGraceExpired
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`text-[10px] uppercase font-mono tracking-wider px-3 py-1 rounded-full border font-bold inline-flex items-center gap-1.5 ${
                          isLateGraceExpired
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        <Clock className={`w-3.5 h-3.5 ${isLateGraceExpired ? 'text-rose-600' : 'text-amber-600 animate-pulse'}`} />
                        {isLateGraceExpired
                          ? 'Committed Arrival Window Expired'
                          : `Informed Late (+${todayRecord?.committed_late_minutes || todayRecord?.late_minutes || 10} Mins Grace)`}
                      </span>
                      <h4 className="text-base font-bold text-[#232d42] mt-2">
                        {isLateGraceExpired
                          ? 'Meeting Check-In Window Closed'
                          : `Committed Arrival Deadline: ${(todayRecord as any)?.expected_arrival_time || 'Within Committed Window'}`}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {isLateGraceExpired
                          ? 'You did not check in within your promised late arrival window. You are marked ABSENT for today.'
                          : `You informed "${todayRecord?.informed_to_person || 'Hospital Authority'}" that you will join late. Please complete check-in before deadline.`}
                      </p>
                    </div>

                    {/* Live Countdown Badge */}
                    {!isLateGraceExpired ? (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-amber-700 uppercase font-black">Time Remaining</div>
                        <div className="text-sm font-mono font-black text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300 mt-0.5 shadow-2xs">
                          {Math.floor(Math.max(0, lateSecondsLeft) / 60)
                            .toString()
                            .padStart(2, '0')}
                          :
                          {(Math.max(0, lateSecondsLeft) % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border bg-rose-100 text-rose-800 border-rose-300 shrink-0">
                        ABSENT
                      </span>
                    )}
                  </div>

                  {/* If still within grace window: Allow physical scan or virtual join */}
                  {!isLateGraceExpired ? (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs font-bold text-slate-700">Check In Now Before Timer Expires:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={handleAttendPhysically}
                          className="p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-[#7065f0] text-left transition-all cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-[#232d42] text-xs">
                            <Camera className="w-4 h-4 text-[#7065f0]" />
                            <span>Scan Boardroom QR</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Physical check-in at 5th Floor Hall</p>
                        </button>
                        <button
                          onClick={handleJoinVirtually}
                          className="p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-[#3bb7b8] text-left transition-all cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-[#232d42] text-xs">
                            <Video className="w-4 h-4 text-[#3bb7b8]" />
                            <span>Join Online (Google Meet)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Launch Meet and record presence</p>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-100/80 rounded-xl border border-rose-200 text-xs text-rose-900 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Access Denied: The late arrival cutoff has passed. Further check-ins are locked.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : hasInformedAbsence ? (
              /* State B: Prior Informed Absence Notice Registered Today */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-white border-2 border-amber-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 font-bold inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-700" /> Absence Notice Documented
                      </span>
                      <h4 className="text-base font-bold text-[#232d42] mt-2">
                        Today's Absence / Leave Notice Registered
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Your absence details have been logged in the hospital attendance database for today.
                      </p>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                        todayRecord?.status === 'LEAVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {todayRecord?.status === 'LEAVE' ? 'Sanctioned Leave' : 'Awaiting Admin Approval'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                    <div className="bg-white border border-[#f0f1f8] rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Stated Reason</div>
                      <div className="font-bold text-[#232d42] mt-1 text-xs">
                        "{todayRecord?.informed_reason || 'Informed Absence'}"
                      </div>
                    </div>
                    <div className="bg-white border border-[#f0f1f8] rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Informed To</div>
                      <div className="font-bold text-[#232d42] mt-1 text-xs">
                        {todayRecord?.informed_to_person || 'Hospital Authority'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                    ℹ️ You do not need to check in again today. Daily check-in status resets automatically for the next scheduled DOM session.
                  </div>
                </div>
              </div>
            ) : (
              /* State C: Not Checked In Yet -> Mandatory Daily Check-in Alert & Verification Modes */
              <div className="space-y-4">
                {currentMeeting.is_completed ? (
                  <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-sm flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-950">
                        Today's Meeting Session Has Concluded
                      </h4>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        This meeting session has officially concluded and been closed by Hospital Operations Command. Attendance registration is locked. All unrecorded leaders have been finalized as <strong className="text-rose-900 font-bold">ABSENT</strong>.
                      </p>
                      <div className="mt-2 text-[11px] font-bold text-rose-900 bg-rose-100/80 px-2.5 py-1 rounded-xl inline-block">
                        🔒 Official Attendance Reports have been dispatched to the WhatsApp Group.
                      </div>
                    </div>
                  </div>
                ) : (currentMeeting.cadence === 'HOLIDAY' || currentMeeting.is_holiday_or_shifted) && currentMeeting.cadence !== 'DOM' && currentMeeting.cadence !== 'WOM' && currentMeeting.cadence !== 'MOM' ? (
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                          Official Weekly Off (Sunday) — Standup Excused
                        </h4>
                        <p className="text-[11px] text-amber-800 font-medium truncate sm:whitespace-normal">
                          Official hospital off day. Zero absentees counted. Next: Monday 10:00 AM IST (WOM).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isCutoffLocked ? (
                  <div className="p-3 sm:p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 shadow-2xs flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                        Check-In Window Locked ({windowStatus.windowCloseStr})
                      </h4>
                      <p className="text-[11px] text-rose-800 mt-0.5 leading-snug">
                        Check-in closed at <strong>{windowStatus.windowCloseStr}</strong>. Self check-in is now locked.
                      </p>
                      <div className="mt-1 text-[10px] font-bold text-rose-900 bg-rose-100/80 px-2 py-0.5 rounded-lg inline-block">
                        🔒 Contact Web Administrator (Mr. Naman Mishra)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-950 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-snug">
                      <strong className="font-bold">Daily Check-in Mandatory: </strong>
                      <span>Submit presence before {windowStatus.windowCloseStr} to prevent unexcused absence.</span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Confirm Today's DOM Presence
                  </h4>

                  {/* Physical & Virtual Attendance Buttons - Side-by-Side Modern Mobile Layout */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
                    {/* Mode 1: Physical Check-In (In-Room Camera Scanner) */}
                    <button
                      onClick={handleAttendPhysically}
                      disabled={isCheckInDisabled}
                      className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group shadow-2xs ${
                        isCheckInDisabled
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-br from-[#eff0fe]/80 via-white to-white border-purple-200 hover:border-[#7065f0] text-slate-900 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-2xs ${
                          isCheckInDisabled ? 'bg-slate-200 text-slate-500' : 'bg-[#eff0fe] text-[#7065f0]'
                        }`}>
                          {isCheckInDisabled ? <Lock className="w-4 h-4 sm:w-5 sm:h-5" /> : <Camera className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100/80 text-[#7065f0] border border-purple-200/80">
                          In-Person
                        </span>
                      </div>
                      <div className={`font-bold text-xs sm:text-sm leading-tight ${isCheckInDisabled ? 'text-slate-500' : 'text-[#232d42] group-hover:text-[#7065f0]'}`}>
                        Attending In-Person
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-snug line-clamp-2">
                        {isSundayOrHoliday
                          ? 'Sunday Off (Excused)'
                          : isOnLeave
                            ? 'Marked on Official Leave'
                            : isCutoffLocked
                              ? `Locked at ${windowStatus.windowCloseStr}`
                              : 'Scan Boardroom QR (5th Flr)'}
                      </p>
                    </button>

                    {/* Mode 2: Virtual Join (Google Meet) */}
                    <button
                      onClick={handleJoinVirtually}
                      disabled={isCheckInDisabled}
                      className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group shadow-2xs ${
                        isCheckInDisabled
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-br from-teal-50/80 via-white to-white border-teal-200 hover:border-[#3bb7b8] text-slate-900 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-2xs ${
                          isCheckInDisabled ? 'bg-slate-200 text-slate-500' : 'bg-teal-50 text-[#3bb7b8]'
                        }`}>
                          {isCheckInDisabled ? <Lock className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-teal-100/80 text-[#3bb7b8] border border-teal-200/80">
                          Virtual
                        </span>
                      </div>
                      <div className={`font-bold text-xs sm:text-sm leading-tight ${isCheckInDisabled ? 'text-slate-500' : 'text-[#232d42] group-hover:text-[#3bb7b8]'}`}>
                        Join Online
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-snug line-clamp-2">
                        {isSundayOrHoliday
                          ? 'Sunday Off (Excused)'
                          : isOnLeave
                            ? 'Marked on Official Leave'
                            : isCutoffLocked
                              ? `Locked at ${windowStatus.windowCloseStr}`
                              : 'Official Google Meet'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Mode 3: Cannot Attend / Running Late? Submit Informed Notice */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (isSundayOrHoliday) {
                        setActionMessage({ success: false, text: '🏖️ Official Hospital Weekly Off. Notice submission is not required today.' });
                        return;
                      }
                      if (isOnLeave) {
                        setActionMessage({ success: false, text: '🏖️ You are already marked on Official Leave for today.' });
                        return;
                      }
                      setShowInformedModal(true);
                    }}
                    disabled={isSundayOrHoliday || isOnLeave}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isSundayOrHoliday || isOnLeave
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-[#fff7ed] hover:bg-[#ffedd5] border border-orange-200 text-orange-950 cursor-pointer shadow-2xs'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="truncate">Running late or cannot attend? Submit notice (5–20m grace)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Informed Late / Absence Notice */}
        {showInformedModal && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[2500] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <h3 className="text-base font-black text-slate-900 mb-1">
                Hospital Standup Notice Submission
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Inform hospital operations whether you are joining late with a committed arrival window or requesting full leave for today.
              </p>

              <form onSubmit={handleInformedSubmit} className="space-y-3">
                {/* Notice Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Notice Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInformedNoticeType('LATE')}
                      className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        informedNoticeType === 'LATE'
                          ? 'bg-[#eff0fe] text-[#7065f0] border-purple-400 shadow-xs ring-2 ring-[#7065f0]/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Clock className="w-4 h-4 text-[#7065f0]" />
                        <span className="font-extrabold text-xs text-[#232d42]">⏱️ Joining Late</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                        Committed arrival (5–30m). Must check in before deadline.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInformedNoticeType('LEAVE')}
                      className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        informedNoticeType === 'LEAVE'
                          ? 'bg-amber-50 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-400/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span className="font-extrabold text-xs text-[#232d42]">🚫 Unable to Attend</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                        Sanctioned Leave / Duty emergency request to Admin.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Delay Dropdown if Running Late */}
                {informedNoticeType === 'LATE' && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-900">
                      Committed Late Arrival Time (Max 30 Mins):
                    </label>
                    <select
                      value={informedLateMinutes}
                      onChange={(e) => setInformedLateMinutes(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value={5}>5 Minutes Late (Expected Deadline: 10:05 AM IST)</option>
                      <option value={10}>10 Minutes Late (Expected Deadline: 10:10 AM IST)</option>
                      <option value={15}>15 Minutes Late (Expected Deadline: 10:15 AM IST)</option>
                      <option value={20}>20 Minutes Late (Standard Standup Cutoff: 10:20 AM IST)</option>
                      <option value={30}>30 Minutes Late (Extended Standup Window: 10:30 AM IST)</option>
                    </select>
                    <div className="text-[10px] text-purple-900 font-semibold leading-relaxed">
                      ⚠️ <strong>Strict Rule:</strong> You must check in before committed time expires or you will be marked <strong>ABSENT</strong>.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Whom did you inform? (Name / Title) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Sir / Mr. Naman Mishra / Medical Superintendent"
                    value={informedToPerson}
                    onChange={(e) => setInformedToPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={
                      informedNoticeType === 'LATE'
                        ? 'e.g. Stuck in hospital traffic / Attending urgent ward emergency / Handover in progress'
                        : 'e.g. Emergency surgery in OT-2 / Casual Leave sanctioned / Outstation hospital visit'
                    }
                    value={informedReason}
                    onChange={(e) => setInformedReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-medium resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInformedModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {informedNoticeType === 'LATE' ? 'Confirm Late Arrival Commitment' : 'Submit Leave Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Access Denied Expired Window */}
        {showExpiredAccessModal && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[2500] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-2 border-rose-300 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-2 mb-2 text-rose-700">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <h3 className="text-base font-black text-slate-900">
                  Access Denied: Meeting Check-In Closed
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                You are marked <strong>ABSENT</strong> for today's session because you did not join within your committed late arrival window (or the maximum 20-minute standup window). Entry is no longer permitted.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 mb-4 font-medium">
                📋 Your non-attendance has been recorded in the Hospital Director's 10:30 AM Daily Compliance Audit Report.
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowExpiredAccessModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Meeting Concluded & Locked */}
        {showMeetingClosedModal && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[2500] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-2 border-rose-300 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-2 mb-2 text-rose-700">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <h3 className="text-base font-black text-slate-900">
                  Meeting Concluded: Check-In Closed
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Today's {currentMeeting.cadence || 'DOM'} meeting session has officially concluded and been closed by Hospital Operations Command. Attendance registration is no longer permitted for today. All unrecorded leaders have been finalized as <strong>ABSENT</strong>.
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 mb-4 font-medium">
                📊 The Final Attendance Audit Report and Absentee Escalation Notice have already been dispatched to the Official WhatsApp Group.
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowMeetingClosedModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Leader Personal Password Change */}
        {showUserPassModal && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[2500] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Change Personal Password
              </h3>
              <p className="text-xs text-slate-500 mb-4">Update your password for self portal login.</p>

              {userPassMsg && (
                <div
                  className={`p-3 text-xs rounded-xl mb-3 font-semibold ${
                    userPassMsg.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {userPassMsg.text}
                </div>
              )}

              <form onSubmit={handleUserPasswordChange} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldUserPass}
                    onChange={(e) => setOldUserPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newUserPass}
                    onChange={(e) => setNewUserPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUserPassModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: 10:05 AM to 10:20 AM Mandatory Late Arrival Reason */}
        {showLateReasonModal && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[2500] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-2 border-amber-300 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-2 mb-2 text-amber-700">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">
                  Late Attendance Notice (+{calculatedLateMinutes}m Late)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Today's <strong>{currentMeeting.title}</strong> standup commenced sharp at 10:00 AM IST. Since you are checking in between 10:05 AM and 10:20 AM, please provide your reason for late arrival:
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!lateReasonInput.trim()) return;
                  setShowLateReasonModal(false);
                  if (pendingLateMode === 'PHYSICAL') {
                    setShowScannerModal(true);
                  } else if (pendingLateMode === 'VIRTUAL') {
                    executeVirtualJoin(lateReasonInput.trim());
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Late Arrival <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Traffic delay / Emergency patient consultation in OPD / Ward handover"
                    value={lateReasonInput}
                    onChange={(e) => setLateReasonInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLateReasonModal(false);
                      setPendingLateMode(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Confirm & Proceed ({pendingLateMode === 'PHYSICAL' ? 'Scan QR' : 'Join Meet'})
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Virtual Attendance & Google Meet Redirect */}
        {showVirtualConfirmModal && activeLeader && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[30000] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#3bb7b8] border border-teal-200 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-[#3bb7b8]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Virtual Attendance
                  </h3>
                  <p className="text-[11px] text-slate-500">Official Daily Operations Meeting (Google Meet)</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-1.5 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Leader Name:</span>
                  <span className="font-bold text-slate-900">{activeLeader.full_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-bold text-slate-800">{activeLeader.department?.name || 'Leadership'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Attendance Mode:</span>
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Virtual (Google Meet)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Confirming will record your attendance as <strong>PRESENT (Virtual)</strong> in the Hospital Director's register and immediately redirect you to the live Google Meet room.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVirtualConfirmModal(false)}
                  disabled={isVirtualSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeVirtualJoin(lateReasonInput.trim() || undefined)}
                  disabled={isVirtualSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVirtualSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Presence...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>Confirm & Join Google Meet 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Attendance Successfully Recorded (Physical QR or Virtual Meet) */}
        {attendanceSuccessModal?.isOpen && (
          <div className="fixed inset-0 modal-backdrop flex items-start sm:items-center justify-center z-[30000] p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border-2 border-emerald-300 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">
                {attendanceSuccessModal.mode === 'PHYSICAL'
                  ? 'Boardroom Presence Confirmed! 🎉'
                  : 'Virtual Attendance Recorded! 🚀'}
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Your attendance for today's {currentMeeting.cadence || 'DOM'} standup has been recorded and synchronized with the Hospital Operations Database.
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Leader:</span>
                  <span className="font-bold text-slate-900">{attendanceSuccessModal.leaderName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-bold text-slate-800">{attendanceSuccessModal.departmentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Verified Mode:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {attendanceSuccessModal.mode === 'PHYSICAL' ? 'In-Person (Conference Room)' : 'Online (Google Meet)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="font-mono font-bold text-slate-800">{attendanceSuccessModal.joinTime}</span>
                </div>
              </div>

              {attendanceSuccessModal.meetUrl && (
                <div className="mb-4 p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-800 font-medium">
                  🌐 Redirecting to live Google Meet room...
                </div>
              )}

              <button
                type="button"
                onClick={() => setAttendanceSuccessModal(null)}
                className="w-full py-2.5 bg-[#7065f0] hover:bg-[#513ed8] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        )}

        {/* Footer Admin Link */}
        <div className="relative z-30 text-center pt-3 pb-20">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-50 hover:bg-orange-100 text-xs text-orange-800 font-bold border border-orange-300 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>Command Admin Center Login &rarr;</span>
          </button>
        </div>
      </div>

      {/* Live In-Room Camera Scanner Modal (Live Feed & GPS Telemetry Only, No Gallery Upload) */}
      {showScannerModal && activeLeader && (
        <LiveRoomQrScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScanSuccess={handleLiveCameraQrSuccess}
          leaderName={activeLeader.full_name}
        />
      )}
    </div>
  );
};
