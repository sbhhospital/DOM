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
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { Leader } from '../types/database';
import { formatToIndianDate, calculateDistanceInMeters, checkStandupWindowStatus } from '../lib/meetingUtils';
import sbhLogo from '../assets/sbh-logo.png';

export const BoardroomCheckin: React.FC = () => {
  const navigate = useNavigate();
  const { leaders, departments, selectedDate, attendanceRecords, markRoomQrCheckIn, markVirtualJoin, getMeetingForDate, appSettings } = useDomApp();
  const { currentUser, loginLeaderDirect, logoutUser } = useAuthSession();

  const currentMeeting = getMeetingForDate(selectedDate);

  // Leader selection state (if not logged in)
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(currentUser);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [checkinMode, setCheckinMode] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL');
  const [geoDistance, setGeoDistance] = useState<number | null>(null);

  const isSundayOrHoliday = useMemo(() => {
    // If admin has explicitly scheduled/enabled a meeting in the database, respect that override!
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
      hasInformedLate,
      currentMeeting.cadence,
      currentMeeting.scheduled_time
    );
  }, [selectedDate, todayRecord, currentMeeting]);

  const isCutoffLocked = !windowStatus.allowed;
  const allowedCampusRadius = appSettings.hospital_radius_meters || 200;
  const isGeoRejected = checkinMode === 'PHYSICAL' && geoDistance !== null && geoDistance > allowedCampusRadius;
  const isCheckInDisabled = isSundayOrHoliday || isOnLeave || isCutoffLocked || currentMeeting.is_completed || isGeoRejected;

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

  // Stylish Thank You Modal State
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    leaderName: string;
    department: string;
    timeStr: string;
    isAlreadyRecorded: boolean;
    mode?: 'PHYSICAL' | 'VIRTUAL';
    meetUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setSelectedLeader(currentUser);
    }
  }, [currentUser]);

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

  const handleConfirmAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isSundayOrHoliday) {
      setShowHolidayModal(true);
      return;
    }

    if (currentMeeting.is_completed) {
      setErrorMessage("Access Denied: Today's meeting session has officially concluded and been closed by Operations Command. Check-in is locked. All unrecorded leaders have been marked ABSENT.");
      return;
    }

    if (isOnLeave) {
      setErrorMessage("Access Denied: You are officially on sanctioned leave today. Standup attendance check-in is excused.");
      return;
    }

    if (isCutoffLocked) {
      setErrorMessage(windowStatus.message || `Access Denied: Standup check-in window closed at ${windowStatus.windowCloseStr} (10:20 AM Cutoff). Attendance is now locked.`);
      return;
    }

    if (!selectedLeader) {
      setErrorMessage('Please select your name from the department leaders list.');
      return;
    }

    setIsSubmitting(true);

    try {
      // If not logged in, authenticate password first
      if (!currentUser || currentUser.id !== selectedLeader.id) {
        const authRes = await loginLeaderDirect(selectedLeader, password);
        if (!authRes.success) {
          setErrorMessage(authRes.message || 'Incorrect password. Please verify and try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Capture live GPS location telemetry for audit
      let locData: { latitude?: number; longitude?: number; accuracy?: number; device?: string } = {
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile Browser',
      };
      if ('geolocation' in navigator) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
              maximumAge: 10000,
            });
          });
          locData.latitude = pos.coords.latitude;
          locData.longitude = pos.coords.longitude;
          locData.accuracy = Math.round(pos.coords.accuracy);
        } catch (gpsErr) {
          console.warn('GPS location fetch note:', gpsErr);
          if (checkinMode === 'PHYSICAL') {
            setErrorMessage('⚠️ Location permission is required to verify physical presence in the Conference Room. Please enable GPS on your device.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // ================= BRANCH: VIRTUAL ATTENDANCE (GOOGLE MEET) =================
      if (checkinMode === 'VIRTUAL') {
        const virtualRes = await markVirtualJoin(selectedLeader.id, selectedDate, locData);
        if (virtualRes.success) {
          const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const targetMeet = virtualRes.meetUrl || currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir';
          setConfirmationData({
            leaderName: selectedLeader.full_name,
            department: resolvedDepartmentName,
            timeStr: nowStr,
            isAlreadyRecorded: false,
            mode: 'VIRTUAL',
            meetUrl: targetMeet,
          });
          setShowThankYouModal(true);
          // Auto launch Google Meet after brief delay
          setTimeout(() => {
            try {
              window.open(targetMeet, '_blank');
            } catch {}
          }, 1500);
        } else {
          setErrorMessage(virtualRes.message || 'Virtual check-in failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // ================= BRANCH: PHYSICAL ATTENDANCE (CONFERENCE ROOM) =================
      if (!locData.latitude || !locData.longitude) {
        setErrorMessage('⚠️ Hospital location could not be detected. Please ensure GPS is enabled and try again.');
        setIsSubmitting(false);
        return;
      }

      // Hospital Campus Geofence check (SBH Hospital, New Rajendra Nagar, Raipur)
      const hospitalLat = appSettings.hospital_latitude || 21.22528;
      const hospitalLng = appSettings.hospital_longitude || 81.65921;
      const allowedRadius = appSettings.hospital_radius_meters || 200;

      const distance = calculateDistanceInMeters(
        locData.latitude,
        locData.longitude,
        hospitalLat,
        hospitalLng
      );

      if (appSettings.hospital_geofence_enabled !== false && distance > allowedRadius) {
        // Trigger markRoomQrCheckIn so the breach is officially logged into Supabase SQL database (admin_audit_logs)
        await markRoomQrCheckIn(selectedLeader.id, locData);
        setGeoDistance(distance);
        setErrorMessage(
          `Physical Attendance Rejected: You are approximately ${distance}m away from SBH Hospital. Physical attendance can ONLY be verified inside SBH Hospital Campus (Allowed radius: ${allowedRadius}m). Your attempt and location have been recorded in the security audit log.`
        );
        setIsSubmitting(false);
        return;
      }

      // Mark physical boardroom check-in with single-daily count lock & GPS audit
      const checkinRes = await markRoomQrCheckIn(selectedLeader.id, locData);

      if (checkinRes.success) {
        setConfirmationData({
          leaderName: selectedLeader.full_name,
          department: resolvedDepartmentName,
          timeStr: checkinRes.timeStr || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          isAlreadyRecorded: checkinRes.alreadyRecorded || false,
          mode: 'PHYSICAL',
        });
        setShowThankYouModal(true);
      } else {
        setErrorMessage(checkinRes.message || 'Check-in failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f5fa] via-[#f4f5fa] to-[#f4f5fa] text-slate-800 flex flex-col font-sans p-4 sm:p-6 pb-24 items-center justify-center page-transition">
      <div className="w-full max-w-lg space-y-6">
        {/* Main Check-In Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-indigo-200/50 border border-[#f0f1f8] relative overflow-hidden">
          {/* Top Tricolor Accent Line */}
          <div className="h-2 w-full bg-gradient-to-r from-[#7065f0] via-[#7065f0] to-[#8577ff] absolute top-0 left-0" />

          {/* Hospital Logo & Header */}
          <div className="text-center pt-2 pb-5 border-b border-[#f0f1f8]">
            <img
              src={sbhLogo}
              alt="SBH Group of Hospitals"
              className="h-14 sm:h-16 w-auto object-contain mx-auto mb-3 drop-shadow-xs"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#eff0fe] text-[#7065f0] border border-purple-200/60 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7065f0]" /> {checkinMode === 'PHYSICAL' ? '5th Floor Conference Hall Check-In' : 'Google Meet Online Standup'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#232d42] tracking-tight">
              {checkinMode === 'PHYSICAL' ? 'BOARDROOM PHYSICAL ATTENDANCE' : 'DAILY OPERATIONS VIRTUAL STANDUP'}
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

          {/* Mode Selector Tabs (Physical vs Virtual) */}
          <div className="grid grid-cols-2 gap-2 my-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCheckinMode('PHYSICAL');
                setErrorMessage('');
                setGeoDistance(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                checkinMode === 'PHYSICAL'
                  ? 'bg-gradient-to-r from-[#7065f0] to-[#7f70f6] text-white shadow-md shadow-indigo-300/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>In-Person (5th Floor)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCheckinMode('VIRTUAL');
                setErrorMessage('');
                setGeoDistance(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                checkinMode === 'VIRTUAL'
                  ? 'bg-gradient-to-r from-[#7065f0] to-[#7f70f6] text-white shadow-md shadow-indigo-300/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Virtual (Google Meet)</span>
            </button>
          </div>

          {/* Session Venue & Time Badges */}
          <div className="grid grid-cols-2 gap-2.5 my-4 text-center">
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

          {/* Error Message with Remote / Virtual Fallback Option */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl text-xs font-bold space-y-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {checkinMode === 'PHYSICAL' && (
                <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <span className="text-slate-700 text-xs font-semibold">Attending from remote location or off-campus?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckinMode('VIRTUAL');
                      setErrorMessage('');
                      setGeoDistance(null);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <Video className="w-3.5 h-3.5 text-white" />
                    <span>Switch to Virtual Standup (Google Meet)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConfirmAttendance} className="space-y-4">
            {/* If user is already authenticated */}
            {currentUser ? (
              <div className="p-4 bg-[#eff0fe]/40 border border-purple-200/70 rounded-2xl">
                <div className="text-[11px] font-black uppercase text-[#7065f0] tracking-wider flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7065f0]" />
                  <span>Authenticated Leader Profile</span>
                </div>
                <div className="text-base font-black text-[#232d42]">
                  {currentUser.full_name}
                </div>
                <div className="text-xs text-slate-600 font-semibold mt-0.5">
                  Department: <strong className="text-[#7065f0]">{resolvedDepartmentName}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-[#f0f1f8]">
                  <span>Mode: <strong className="text-[#7065f0]">{checkinMode === 'PHYSICAL' ? 'Physical / Conference Room' : 'Virtual / Google Meet'}</strong></span>
                  <button
                    type="button"
                    onClick={async () => {
                      await logoutUser();
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out &rarr;</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                            className="p-2.5 hover:bg-[#eff0fe]/50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {lead.full_name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {lead.department?.name || 'Dept'} • {lead.email}
                              </div>
                            </div>
                            <span className="text-[10px] bg-[#eff0fe] text-[#7065f0] px-2 py-0.5 rounded font-mono font-bold">
                              Select
                            </span>
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
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 bg-[#f8f6fe]/70 border border-[#f0f1f8] rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#7065f0] focus:ring-2 focus:ring-[#7065f0]/20 transition-all shadow-xs"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </>
            )}

            {/* Submit Physical / Virtual Check-in Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCheckInDisabled}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isCheckInDisabled
                  ? 'bg-slate-400 text-white cursor-not-allowed shadow-none opacity-60'
                  : 'bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white shadow-indigo-300/40 cursor-pointer disabled:opacity-50'
              }`}
            >
              {currentMeeting.is_completed ? (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Meeting Concluded: Check-In Closed</span>
                </>
              ) : isSundayOrHoliday ? (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Standup Excused (Sunday Off)</span>
                </>
              ) : isOnLeave ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Official Leave Sanctioned (Excused)</span>
                </>
              ) : isCutoffLocked ? (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Check-In Locked ({windowStatus.windowCloseStr} Cutoff)</span>
                </>
              ) : isGeoRejected ? (
                <>
                  <AlertCircle className="w-4 h-4 text-white" />
                  <span>Physical Check-In Denied (Outside Campus — Switch to Virtual Above)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {isSubmitting
                      ? (checkinMode === 'PHYSICAL' ? 'Verifying Physical Attendance...' : 'Connecting to Virtual Standup...')
                      : (checkinMode === 'PHYSICAL' ? 'Confirm My Physical Presence in Boardroom' : 'Confirm Virtual Presence & Join Google Meet')}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className="mt-5 pt-4 border-t border-[#f0f1f8] text-[11px] text-slate-500 text-center">
            🔒 Single Daily Count Enforced • Verified for Hospital Director's 10:30 AM Audit
          </div>
        </div>
      </div>

      {/* ================= STYLISH THANK YOU POPUP MODAL ================= */}
      {showThankYouModal && confirmationData && (
        <div className="fixed inset-0 z-[20000] modal-backdrop flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 text-center shadow-2xl shadow-indigo-200/50 border border-[#f0f1f8] relative overflow-hidden">
            {/* Top Glowing Gradient Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-[#7065f0] via-[#7065f0] to-[#8577ff] absolute top-0 left-0" />

            {/* Hospital Logo */}
            <img
              src={sbhLogo}
              alt="SBH Group of Hospitals"
              className="h-12 w-auto object-contain mx-auto mb-4"
            />

            {/* Glowing Violet Checkmark Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7065f0] to-[#7f70f6] text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-400/30 ring-8 ring-purple-100 animate-in zoom-in-75">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            {/* Thank You Title */}
            <h2 className="text-2xl font-black text-[#232d42] tracking-tight">
              Thank You, {confirmationData.leaderName}!
            </h2>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#eff0fe] text-[#7065f0] border border-purple-200/60 mt-2">
              <Sparkles className="w-3.5 h-3.5 text-[#7065f0]" /> {confirmationData.mode === 'VIRTUAL' ? 'Virtual Standup Attendance Confirmed' : 'Physical Attendance Confirmed'}
            </div>

            <p className="text-xs text-slate-600 mt-3 max-w-xs mx-auto leading-relaxed">
              {confirmationData.mode === 'VIRTUAL'
                ? 'Your virtual attendance via Google Meet has been officially timestamped and locked in today\'s DOM register for Hospital Director review.'
                : 'Your in-person attendance inside the 5th Floor Conference Room has been officially timestamped and locked in today\'s DOM register for Hospital Director review.'}
            </p>

            {/* Audit Details Card */}
            <div className="my-5 p-4 bg-[#eff0fe]/30 rounded-2xl border border-[#f0f1f8] text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Department:</span>
                <span className="font-bold text-[#232d42]">{confirmationData.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Recorded Time:</span>
                <span className="font-mono font-bold text-[#7065f0]">{confirmationData.timeStr} IST</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Audit Status:</span>
                <span className="font-bold text-[#7065f0]">{confirmationData.mode === 'VIRTUAL' ? 'PRESENT (Virtual / Google Meet)' : 'PRESENT (Physical / Verified)'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#f0f1f8]">
                <span className="text-slate-500 font-semibold">Single Count Lock:</span>
                <span className="font-bold text-[#7065f0]">Active (1 Count / Day)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowThankYouModal(false);
                  navigate('/login');
                }}
                className="w-full py-3 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-300/40 transition-all cursor-pointer"
              >
                Close & Return
              </button>
              <a
                href="https://meet.google.com/jrz-jfku-gir"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#eff0fe]/50 hover:bg-[#eff0fe] text-[#7065f0] border border-purple-200/60 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-[#7065f0]" />
                <span>Open Google Meet (Follow Slides)</span>
              </a>
            </div>
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
