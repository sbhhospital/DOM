import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  KeyRound,
  User,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Video,
  Lock,
  LogOut,
  Camera,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { Leader } from '../types/database';
import { formatToIndianDate, calculateDistanceInMeters, checkStandupWindowStatus } from '../lib/meetingUtils';
import { LiveRoomQrScannerModal } from '../components/LiveRoomQrScannerModal';
import sbhLogo from '../assets/sbh-logo.png';

export const BoardroomCheckin: React.FC = () => {
  const navigate = useNavigate();
  const {
    leaders,
    departments,
    selectedDate,
    attendanceRecords,
    markRoomQrCheckIn,
    markVirtualJoin,
    getMeetingForDate,
    appSettings,
  } = useDomApp();
  const { currentUser, loginLeaderDirect, logoutUser } = useAuthSession();

  const currentMeeting = getMeetingForDate(selectedDate);

  // Leader selection & login state
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(currentUser);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Modals for In-Person Camera Scanner & Virtual Confirmation
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showVirtualConfirmModal, setShowVirtualConfirmModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [attendanceSuccessModal, setAttendanceSuccessModal] = useState<{
    isOpen: boolean;
    mode: 'PHYSICAL' | 'VIRTUAL';
    leaderName: string;
    departmentName: string;
    joinTime: string;
    meetUrl?: string;
  } | null>(null);

  // Update selectedLeader when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setSelectedLeader(currentUser);
    }
  }, [currentUser]);

  const isSundayOrHoliday = useMemo(() => {
    if (currentMeeting.cadence && currentMeeting.cadence !== 'HOLIDAY' && !currentMeeting.is_holiday_or_shifted) {
      return false;
    }
    const isSun = new Date(selectedDate + 'T00:00:00').getDay() === 0;
    return isSun || currentMeeting.cadence === 'HOLIDAY' || Boolean(currentMeeting.is_holiday_or_shifted);
  }, [selectedDate, currentMeeting]);

  const activeLeader = currentUser || selectedLeader;
  const todayRecord = useMemo(() => {
    if (!activeLeader) return null;
    return (
      attendanceRecords.find(
        (r) =>
          (r.leader_id === activeLeader.id || r.leader?.id === activeLeader.id) &&
          r.meeting_date === selectedDate
      ) || null
    );
  }, [activeLeader, attendanceRecords, selectedDate]);

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

  const isOnLeave = Boolean(
    todayRecord &&
      (todayRecord.status === 'LEAVE' ||
        (todayRecord.status === 'INFORMED_ABSENT' && todayRecord.informed_confirmed))
  );

  const windowStatus = useMemo(() => {
    const hasInformedLate = Boolean(
      todayRecord &&
        todayRecord.status === 'INFORMED_LATE' &&
        !todayRecord.late_expired
    );
    return checkStandupWindowStatus(
      selectedDate,
      hasInformedLate || hasJoinedToday,
      currentMeeting.cadence,
      currentMeeting.scheduled_time
    );
  }, [selectedDate, todayRecord, hasJoinedToday, currentMeeting]);

  const isCutoffLocked = !hasJoinedToday && !windowStatus.allowed && windowStatus.code === 'AFTER_WINDOW';
  const isCheckInDisabled = isSundayOrHoliday || isOnLeave || isCutoffLocked || currentMeeting.is_completed;

  const resolvedDepartmentName = useMemo(() => {
    const targetUser = currentUser || selectedLeader;
    if (targetUser?.department?.name && targetUser.department.name.toUpperCase() !== 'DEPARTMENT') {
      return targetUser.department.name;
    }
    const matched = leaders.find(
      (l) => l.id === targetUser?.id || l.full_name?.toLowerCase() === targetUser?.full_name?.toLowerCase()
    );
    if (matched?.department?.name && matched.department.name.toUpperCase() !== 'DEPARTMENT') {
      return matched.department.name;
    }
    if (targetUser?.department_id) {
      const d = departments.find((dept) => dept.id === targetUser.department_id);
      if (d) return d.name;
    }
    if (targetUser?.full_name?.toLowerCase().includes('naman')) {
      return 'IT, SYSTEMS & TELECOM';
    }
    return 'Hospital Operations';
  }, [currentUser, selectedLeader, leaders, departments]);

  const filteredLeaders = leaders.filter(
    (l) =>
      l.full_name.toLowerCase().includes(leaderSearch.toLowerCase()) ||
      l.department?.name.toLowerCase().includes(leaderSearch.toLowerCase()) ||
      l.email.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  const handleSelectLeader = (lead: Leader) => {
    setSelectedLeader(lead);
    setLeaderSearch(lead.full_name);
    setIsDropdownOpen(false);
    setErrorMessage('');
  };

  // Step 1: Authenticate Leader (Login Form)
  const handleLoginLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedLeader) {
      setErrorMessage('Please select your name from the department leaders list.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your leader password / PIN.');
      return;
    }

    setIsSubmitting(true);
    const authRes = await loginLeaderDirect(selectedLeader, password);
    setIsSubmitting(false);

    if (!authRes.success) {
      setErrorMessage(authRes.message || 'Incorrect password. Please verify and try again.');
      return;
    }

    setPassword('');
  };

  // Step 2 Action A: Trigger Physical In-Person Attendance (Camera QR Scanner)
  const handleAttendPhysically = () => {
    if (!currentUser) return;
    if (isSundayOrHoliday) {
      setShowHolidayModal(true);
      return;
    }
    if (currentMeeting.is_completed) {
      setErrorMessage("Access Denied: Today's meeting session has officially concluded and been closed by Operations Command. Check-in is locked.");
      return;
    }
    if (isOnLeave) {
      setErrorMessage("Access Denied: You are officially on sanctioned leave today. Standup check-in is excused.");
      return;
    }
    if (isCutoffLocked) {
      setErrorMessage(windowStatus.message || `Access Denied: Standup check-in window closed at ${windowStatus.windowCloseStr} (10:20 AM Cutoff). Attendance is now locked.`);
      return;
    }
    setShowScannerModal(true);
  };

  // QR Code Scanned Successfully via Live Camera
  const handleLiveCameraQrSuccess = async (scanResult: {
    scannedData: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => {
    if (!currentUser) return;
    setShowScannerModal(false);
    setIsSubmitting(true);

    const res = await markRoomQrCheckIn(currentUser.id, {
      latitude: scanResult.latitude,
      longitude: scanResult.longitude,
      accuracy: scanResult.accuracy,
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Live Camera Scanner',
    });

    setIsSubmitting(false);

    if (res.success) {
      setAttendanceSuccessModal({
        isOpen: true,
        mode: 'PHYSICAL',
        leaderName: currentUser.full_name,
        departmentName: resolvedDepartmentName,
        joinTime: res.timeStr || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
      setErrorMessage('');
    } else {
      setErrorMessage(res.message || 'Physical verification failed. Please try again.');
    }
  };

  // Step 2 Action B: Trigger Virtual Online Attendance (Google Meet)
  const handleJoinVirtually = () => {
    if (!currentUser) return;
    if (isSundayOrHoliday) {
      setShowHolidayModal(true);
      return;
    }
    if (currentMeeting.is_completed) {
      setErrorMessage("Access Denied: Today's meeting session has officially concluded and been closed by Operations Command. Check-in is locked.");
      return;
    }
    if (isOnLeave) {
      setErrorMessage("Access Denied: You are officially on sanctioned leave today. Standup check-in is excused.");
      return;
    }
    if (isCutoffLocked) {
      setErrorMessage(windowStatus.message || `Access Denied: Standup check-in window closed at ${windowStatus.windowCloseStr} (10:20 AM Cutoff). Attendance is now locked.`);
      return;
    }
    setShowVirtualConfirmModal(true);
  };

  // Confirm Virtual Join & Open Google Meet
  const handleVirtualJoinConfirm = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    let geoCoords: { latitude?: number; longitude?: number; accuracy?: number } | undefined;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 60000 });
        });
        geoCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
      } catch (e) {
        console.warn('Geolocation not permitted for virtual join:', e);
      }
    }

    const res = await markVirtualJoin(currentUser.id, selectedDate, geoCoords);
    setIsSubmitting(false);
    setShowVirtualConfirmModal(false);

    if (res.success) {
      const meetUrl = res.meetUrl || currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir';
      setAttendanceSuccessModal({
        isOpen: true,
        mode: 'VIRTUAL',
        leaderName: currentUser.full_name,
        departmentName: resolvedDepartmentName,
        joinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        meetUrl,
      });

      // Automatically launch Google Meet
      setTimeout(() => {
        try {
          window.open(meetUrl, '_blank');
        } catch {}
      }, 700);
    } else {
      setErrorMessage(res.message || 'Unable to record virtual attendance. Please try again.');
    }
  };

  // Sign out handler with transition screen
  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logoutUser();
  };

  if (isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl flex flex-col items-center text-center max-w-sm w-full space-y-3 animate-in fade-in zoom-in duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <LogOut className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-[#232d42]">Signing Out...</h3>
          <p className="text-xs text-slate-500 font-medium">Securing session and clearing terminal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] text-slate-800 flex flex-col font-sans p-4 sm:p-6 pb-24 items-center justify-center page-transition">
      <div className="w-full max-w-lg space-y-5">
        {/* Main Check-In Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-indigo-200/50 border border-[#f0f1f8] relative overflow-hidden">
          {/* Top Tricolor Accent Line */}
          <div className="h-2 w-full bg-gradient-to-r from-[#7065f0] via-[#7065f0] to-[#8577ff] absolute top-0 left-0" />

          {/* Hospital Logo & Header */}
          <div className="text-center pt-2 pb-4 border-b border-[#f0f1f8]">
            <img
              src={sbhLogo}
              alt="SBH Group of Hospitals"
              className="h-14 sm:h-16 w-auto object-contain mx-auto mb-3 drop-shadow-xs"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#eff0fe] text-[#7065f0] border border-purple-200/60 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7065f0]" /> 5th Floor Conference Hall Check-In
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#232d42] tracking-tight">
              BOARDROOM ATTENDANCE TERMINAL
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Daily Operations Standup (DOM) • Sharp 10:00 AM IST
            </p>
          </div>

          {/* Status Alert Banners */}
          {currentMeeting.is_completed ? (
            <div className="my-3 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="block font-black text-rose-950">Meeting Concluded: Check-In Closed</strong>
                <span className="text-rose-800 font-medium leading-relaxed block mt-0.5">
                  Today's meeting session has concluded. Check-in is locked. Unrecorded leaders are finalized as <strong>ABSENT</strong>.
                </span>
              </div>
            </div>
          ) : isSundayOrHoliday ? (
            <div className="my-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>🏖️ Sunday Weekly Off: Hospital Daily Operations Standup is excused today. Attendance submission is closed.</span>
            </div>
          ) : isOnLeave ? (
            <div className="my-3 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>🏖️ Official Sanctioned Leave: You are marked on official leave for today. Standup check-in is excused.</span>
            </div>
          ) : isCutoffLocked ? (
            <div className="my-3 p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-2xs">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block font-black text-rose-950">Check-In Window Locked ({windowStatus.windowCloseStr})</strong>
                <span className="text-rose-800 font-medium leading-relaxed block mt-0.5">
                  Standup check-in closed at {windowStatus.windowCloseStr} (10:20 AM Cutoff). Attendance is now locked. You are finalized as <strong>ABSENT</strong> on the Director's Register.
                </span>
              </div>
            </div>
          ) : null}

          {/* Session Venue & Time Badges */}
          <div className="grid grid-cols-2 gap-2.5 my-3 text-center">
            <div className="bg-[#eff0fe]/40 border border-[#f0f1f8] rounded-2xl p-2.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 text-[#7065f0]" /> Physical Venue
              </span>
              <span className="text-xs font-bold text-[#232d42] block mt-0.5">
                Conference Room, 5th Floor
              </span>
            </div>
            <div className="bg-[#eff0fe]/40 border border-[#f0f1f8] rounded-2xl p-2.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-[#7065f0]" /> Today's Date
              </span>
              <span className="text-xs font-bold text-[#232d42] block mt-0.5">
                {formatToIndianDate(selectedDate)} ({currentMeeting.scheduled_time})
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* ================= CONDITIONAL FLOW: PRE-LOGIN VS LOGGED-IN ================= */}
          {!currentUser ? (
            /* STEP 1: PRE-LOGIN FORM (Search Name + Enter PIN) */
            <form onSubmit={handleLoginLeader} className="space-y-4">
              <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-2xl text-xs text-purple-900 font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#7065f0] shrink-0" />
                <span>Enter your leader credentials to access boardroom check-in options</span>
              </div>

              {/* Searchable Leader Combobox */}
              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-700">
                  Select Your Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type or click to search your name..."
                    value={leaderSearch}
                    onChange={(e) => {
                      setLeaderSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-3.5 pr-10 py-3 bg-[#f8f6fe]/70 border border-[#f0f1f8] rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#7065f0] focus:ring-2 focus:ring-[#7065f0]/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#f0f1f8] rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50 p-1.5 space-y-1">
                    {filteredLeaders.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No registered leaders match search
                      </div>
                    ) : (
                      filteredLeaders.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectLeader(lead)}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            selectedLeader?.id === lead.id
                              ? 'bg-[#eff0fe] text-[#7065f0] font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{lead.full_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {lead.department?.name || 'Department'} • {lead.email}
                            </div>
                          </div>
                          {selectedLeader?.id === lead.id && (
                            <CheckCircle2 className="w-4 h-4 text-[#7065f0]" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Password / PIN Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Leader PIN / Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your security PIN or password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-[#f8f6fe]/70 border border-[#f0f1f8] rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#7065f0] focus:ring-2 focus:ring-[#7065f0]/20 transition-all shadow-xs"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-lg bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white shadow-indigo-300/40 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Authenticating Leader...' : 'Log In & Continue to Check-In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: AUTHENTICATED LEADER SCREEN (With Physical & Virtual Options) */
            <div className="space-y-4">
              {/* Authenticated Leader Profile Card */}
              <div className="p-4 bg-[#eff0fe]/50 border border-purple-200/80 rounded-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#f0f1f8]">
                  <div className="text-[11px] font-black uppercase text-[#7065f0] tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7065f0]" />
                    <span>Authenticated Leader Profile</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl border border-rose-200 transition-colors shadow-2xs"
                  >
                    <LogOut className="w-3 h-3 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
                <div className="text-base font-black text-[#232d42] mt-2">
                  {currentUser.full_name}
                </div>
                <div className="text-xs text-slate-600 font-semibold mt-0.5">
                  Department: <strong className="text-[#7065f0]">{resolvedDepartmentName}</strong> •{' '}
                  <span className="font-mono text-slate-500">{currentUser.email}</span>
                </div>
              </div>

              {/* If attendance is ALREADY recorded today */}
              {hasJoinedToday ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-white border-2 border-emerald-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Attendance Confirmed Today
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {todayRecord?.check_in_at || (todayRecord as any)?.join_time || 'Recorded'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You have already marked your attendance for today's DOM standup as{' '}
                    <strong>
                      {(todayRecord as any)?.check_in_mode === 'PHYSICAL' || (todayRecord as any)?.mode === 'PHYSICAL'
                        ? 'In-Person (5th Floor Conference Room)'
                        : 'Virtual Attendee (Google Meet)'}
                    </strong>
                    . Single daily count is locked.
                  </p>
                  <a
                    href={currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-teal-700" />
                    <span>Rejoin Google Meet Room (Silent Rejoin)</span>
                  </a>
                </div>
              ) : (
                /* Choose Check-In Mode: Physical QR Scanner vs Virtual Google Meet */
                <div className="space-y-3">
                  <div className="text-center pt-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Confirm Today's DOM Presence
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose how you are attending today's standup:
                    </p>
                  </div>

                  {/* Two Side-by-Side Modern Mobile Action Tiles */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                    {/* Option 1: Physical Check-In (In-Room Camera Scanner) */}
                    <button
                      type="button"
                      onClick={handleAttendPhysically}
                      disabled={isCheckInDisabled}
                      className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group shadow-2xs ${
                        isCheckInDisabled
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-br from-[#eff0fe]/80 via-white to-white border-purple-200 hover:border-[#7065f0] text-slate-900 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${
                            isCheckInDisabled ? 'bg-slate-200 text-slate-500' : 'bg-[#eff0fe] text-[#7065f0]'
                          }`}
                        >
                          {isCheckInDisabled ? <Lock className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                        </div>
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100/80 text-[#7065f0] border border-purple-200/80">
                          In-Person
                        </span>
                      </div>
                      <div
                        className={`font-bold text-xs sm:text-sm leading-tight ${
                          isCheckInDisabled ? 'text-slate-500' : 'text-[#232d42] group-hover:text-[#7065f0]'
                        }`}
                      >
                        Attending In-Person
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-snug line-clamp-2">
                        {isSundayOrHoliday
                          ? 'Sunday Off (Excused)'
                          : isOnLeave
                            ? 'Leave Sanctioned'
                            : isCutoffLocked
                              ? 'Cutoff Passed (Locked)'
                              : 'Scan Boardroom QR inside Conference Hall'}
                      </p>
                      {!isCheckInDisabled && (
                        <div className="mt-3 pt-2 border-t border-purple-100/80 flex items-center justify-between text-[10px] font-bold text-[#7065f0]">
                          <span>Scan QR Code</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </button>

                    {/* Option 2: Virtual Join (Google Meet) */}
                    <button
                      type="button"
                      onClick={handleJoinVirtually}
                      disabled={isCheckInDisabled}
                      className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group shadow-2xs ${
                        isCheckInDisabled
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-br from-teal-50/80 via-white to-white border-teal-200 hover:border-[#3bb7b8] text-slate-900 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${
                            isCheckInDisabled ? 'bg-slate-200 text-slate-500' : 'bg-teal-50 text-[#3bb7b8]'
                          }`}
                        >
                          {isCheckInDisabled ? <Lock className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        </div>
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-teal-100/80 text-[#3bb7b8] border border-teal-200/80">
                          Virtual
                        </span>
                      </div>
                      <div
                        className={`font-bold text-xs sm:text-sm leading-tight ${
                          isCheckInDisabled ? 'text-slate-500' : 'text-[#232d42] group-hover:text-[#3bb7b8]'
                        }`}
                      >
                        Join Online
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium leading-snug line-clamp-2">
                        {isSundayOrHoliday
                          ? 'Sunday Off (Excused)'
                          : isOnLeave
                            ? 'Leave Sanctioned'
                            : isCutoffLocked
                              ? 'Cutoff Passed (Locked)'
                              : 'Opens Google Meet & records virtual attendance'}
                      </p>
                      {!isCheckInDisabled && (
                        <div className="mt-3 pt-2 border-t border-teal-100/80 flex items-center justify-between text-[10px] font-bold text-[#3bb7b8]">
                          <span>Launch Meet</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Notice */}
          <div className="mt-5 pt-4 border-t border-[#f0f1f8] text-[11px] text-slate-500 text-center">
            🔒 Single Daily Count Enforced • Verified for Hospital Director's 10:30 AM Audit
          </div>
        </div>
      </div>

      {/* ================= LIVE IN-ROOM CAMERA SCANNER MODAL ================= */}
      {showScannerModal && currentUser && (
        <LiveRoomQrScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScanSuccess={handleLiveCameraQrSuccess}
          leaderName={currentUser.full_name}
        />
      )}

      {/* ================= VIRTUAL JOIN CONFIRMATION MODAL ================= */}
      {showVirtualConfirmModal && currentUser && (
        <div className="fixed inset-0 z-[30000] modal-backdrop flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 border border-[#f0f1f8] shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#3bb7b8] border border-teal-200 flex items-center justify-center mx-auto shadow-sm">
              <Video className="w-7 h-7 text-[#3bb7b8]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#232d42]">Join DOM Virtually</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Confirm your attendance as <strong>{currentUser.full_name}</strong>. Your virtual presence will be verified and recorded in the SQL database, and you will be redirected to the official Google Meet.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowVirtualConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleVirtualJoinConfirm}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-[#3bb7b8] hover:from-teal-600 hover:to-[#2fa3a4] text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-white" />
                <span>{isSubmitting ? 'Recording...' : 'Confirm & Join'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS CONFIRMATION MODAL ================= */}
      {attendanceSuccessModal?.isOpen && (
        <div className="fixed inset-0 z-[30000] modal-backdrop flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 border border-[#f0f1f8] shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                Attendance Successfully Recorded
              </span>
              <h3 className="text-lg font-black text-[#232d42] mt-2">
                {attendanceSuccessModal.mode === 'PHYSICAL'
                  ? 'Boardroom Presence Confirmed!'
                  : 'Virtual DOM Presence Confirmed!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {attendanceSuccessModal.leaderName} • {attendanceSuccessModal.departmentName}
              </p>
              <p className="text-xs font-mono font-bold text-[#7065f0] mt-0.5">
                Timestamp: {attendanceSuccessModal.joinTime}
              </p>
            </div>

            {attendanceSuccessModal.mode === 'VIRTUAL' && attendanceSuccessModal.meetUrl && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-2">
                <p className="font-semibold">🚀 Launching official Google Meet room...</p>
                <a
                  href={attendanceSuccessModal.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#3bb7b8] hover:bg-[#2fa3a4] text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
                >
                  <Video className="w-4 h-4 text-white" />
                  <span>Open Google Meet Manually &rarr;</span>
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setAttendanceSuccessModal(null);
                setErrorMessage('');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* ================= HOLIDAY / SUNDAY NOTICE MODAL ================= */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-[20000] modal-backdrop flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-amber-200 relative overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] absolute top-0 left-0" />
            <img
              src={sbhLogo}
              alt="SBH Group of Hospitals"
              className="h-12 w-auto object-contain mx-auto mb-4"
            />
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-2xl">🏖️</span>
            </div>
            <h2 className="text-xl font-black text-[#232d42] tracking-tight">
              Sunday Weekly Off / Holiday
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 mt-2">
              <span>Official Hospital Schedule</span>
            </div>
            <p className="text-xs text-slate-600 mt-3 max-w-xs mx-auto leading-relaxed">
              Today is an official hospital non-standup day. Daily Operations Standup (DOM) is not held on Sundays or scheduled holidays, and no absentees are recorded.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
