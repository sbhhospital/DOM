import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Video,
  Lock,
  LogOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { formatToIndianDate, calculateDistanceInMeters, checkStandupWindowStatus } from '../lib/meetingUtils';
import sbhLogo from '../assets/sbh-logo.png';

export const BoardroomCheckin: React.FC = () => {
  const navigate = useNavigate();
  const {
    departments,
    selectedDate,
    attendanceRecords,
    markRoomQrCheckIn,
    markVirtualJoin,
    getMeetingForDate,
    appSettings,
  } = useDomApp();
  const { currentUser, logoutUser } = useAuthSession();

  // If user is NOT logged in when scanning QR code, direct them to login first and return back here
  if (!currentUser) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sbh_redirect_after_login', '/boardroom-checkin');
    }
    return <Navigate to="/login?redirect=/boardroom-checkin" replace />;
  }

  const currentMeeting = getMeetingForDate(selectedDate);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showVirtualConfirmModal, setShowVirtualConfirmModal] = useState(false);

  // GPS Telemetry State
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [locData, setLocData] = useState<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    device?: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Success Confirmation Modal
  const [attendanceSuccessModal, setAttendanceSuccessModal] = useState<{
    isOpen: boolean;
    mode: 'PHYSICAL' | 'VIRTUAL';
    leaderName: string;
    departmentName: string;
    joinTime: string;
    meetUrl?: string;
  } | null>(null);

  const isSundayOrHoliday = useMemo(() => {
    if (currentMeeting.cadence && currentMeeting.cadence !== 'HOLIDAY' && !currentMeeting.is_holiday_or_shifted) {
      return false;
    }
    const isSun = new Date(selectedDate + 'T00:00:00').getDay() === 0;
    return isSun || currentMeeting.cadence === 'HOLIDAY' || Boolean(currentMeeting.is_holiday_or_shifted);
  }, [selectedDate, currentMeeting]);

  const todayRecord = useMemo(() => {
    if (!currentUser) return null;
    return (
      attendanceRecords.find(
        (r) =>
          (r.leader_id === currentUser.id || r.leader?.id === currentUser.id) &&
          r.meeting_date === selectedDate
      ) || null
    );
  }, [currentUser, attendanceRecords, selectedDate]);

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
  const allowedCampusRadius = appSettings.hospital_radius_meters || 200;
  const isGeoRejected = geoDistance !== null && geoDistance > allowedCampusRadius;
  const isCheckInDisabled = isSundayOrHoliday || isOnLeave || isCutoffLocked || currentMeeting.is_completed || isGeoRejected;

  const resolvedDepartmentName = useMemo(() => {
    if (currentUser?.department?.name && currentUser.department.name.toUpperCase() !== 'DEPARTMENT') {
      return currentUser.department.name;
    }
    if (currentUser?.department_id) {
      const d = departments.find((dept) => dept.id === currentUser.department_id);
      if (d) return d.name;
    }
    if (currentUser?.full_name?.toLowerCase().includes('naman')) {
      return 'IT, SYSTEMS & TELECOM';
    }
    return 'Hospital Operations';
  }, [currentUser, departments]);

  // Proactive GPS Telemetry acquisition on load
  useEffect(() => {
    if (hasJoinedToday || isSundayOrHoliday || isOnLeave || isCutoffLocked) return;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            device: navigator.userAgent,
          };
          setLocData(coords);

          const hospitalLat = appSettings.hospital_latitude || 21.22528;
          const hospitalLng = appSettings.hospital_longitude || 81.65921;
          const dist = calculateDistanceInMeters(
            pos.coords.latitude,
            pos.coords.longitude,
            hospitalLat,
            hospitalLng
          );
          setGeoDistance(dist);
        },
        (err) => {
          setIsLocating(false);
          console.warn('GPS location fetch note:', err);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }
  }, [hasJoinedToday, isSundayOrHoliday, isOnLeave, isCutoffLocked, appSettings]);

  // Confirm Physical Boardroom Presence
  const handleConfirmPhysicalAttendance = async () => {
    if (!currentUser) return;
    setErrorMessage('');

    if (isSundayOrHoliday) {
      setShowHolidayModal(true);
      return;
    }

    if (currentMeeting.is_completed) {
      setErrorMessage("Access Denied: Today's meeting session has concluded. Check-in is locked.");
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

    setIsSubmitting(true);

    try {
      // Re-check or fetch GPS if not yet acquired
      let currentLoc = locData;
      if (!currentLoc && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: true });
          });
          currentLoc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            device: navigator.userAgent,
          };
          setLocData(currentLoc);
        } catch {}
      }

      const res = await markRoomQrCheckIn(currentUser.id, currentLoc || undefined);

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
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Virtual Attendance (Fallback / Remote)
  const handleConfirmVirtualAttendance = async () => {
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
        {/* Main Boardroom QR Verification Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-indigo-200/50 border border-[#f0f1f8] relative overflow-hidden">
          {/* Top Gradient Accent */}
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
              BOARDROOM PHYSICAL ATTENDANCE
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

          {/* Error / Breach Banner */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Geofence Breach Banner with Instant Virtual Switch Option */}
          {isGeoRejected && (
            <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl text-xs font-bold space-y-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  🚫 Physical Attendance Rejected: You are approximately <strong>{Math.round(geoDistance || 0)}m</strong> away from SBH Hospital. Physical attendance can ONLY be verified inside SBH Hospital Campus (Allowed radius: {allowedCampusRadius}m).
                </span>
              </div>
              <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <span className="text-slate-700 text-xs font-semibold">Attending from remote location or off-campus?</span>
                <button
                  type="button"
                  onClick={() => setShowVirtualConfirmModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-[#3bb7b8] hover:from-teal-600 hover:to-[#2fa3a4] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <Video className="w-3.5 h-3.5 text-white" />
                  <span>Switch to Virtual Standup (Google Meet)</span>
                </button>
              </div>
            </div>
          )}

          {/* Authenticated Leader Profile Card */}
          <div className="space-y-4">
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

            {/* State A: Attendance is ALREADY Recorded Today */}
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
                  Your attendance for today's DOM standup has been officially recorded as{' '}
                  <strong>
                    {(todayRecord as any)?.check_in_mode === 'PHYSICAL' || (todayRecord as any)?.mode === 'PHYSICAL'
                      ? 'In-Person (5th Floor Conference Room)'
                      : 'Virtual Attendee (Google Meet)'}
                  </strong>
                  . Single daily count is locked.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/portal')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7065f0] font-bold border border-purple-200 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                  >
                    <span>Open Leader Portal &rarr;</span>
                  </button>
                  <a
                    href={currentMeeting.google_meet_url || 'https://meet.google.com/jrz-jfku-gir'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-teal-700" />
                    <span>Rejoin Meet</span>
                  </a>
                </div>
              </div>
            ) : (
              /* State B: QR Scanned Physical Attendance Confirmation Button */
              <div className="space-y-3 pt-1">
                {/* Geofence / Location Status Indicator */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7065f0]" />
                    <span>Location Telemetry:</span>
                  </span>
                  <span className="font-bold text-xs">
                    {isLocating ? (
                      <span className="text-amber-600 animate-pulse">Acquiring live GPS...</span>
                    ) : isGeoRejected ? (
                      <span className="text-rose-600 font-black">Outside Campus (~{Math.round(geoDistance || 0)}m)</span>
                    ) : locData ? (
                      <span className="text-emerald-700 font-black">GPS Verified (Inside Campus)</span>
                    ) : (
                      <span className="text-slate-500">Awaiting GPS verification</span>
                    )}
                  </span>
                </div>

                {/* Primary Physical Presence Confirmation Button */}
                <button
                  type="button"
                  onClick={handleConfirmPhysicalAttendance}
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
                      <span>Physical Check-In Denied (Outside Campus)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{isSubmitting ? 'Verifying Boardroom Attendance...' : 'Confirm My Physical Presence in Boardroom'}</span>
                    </>
                  )}
                </button>

                {/* Remote / Virtual Join Fallback Option */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVirtualConfirmModal(true)}
                    className="text-xs text-[#7065f0] hover:text-[#513ed8] font-bold inline-flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Attending remotely? Join Virtual DOM Standup (Google Meet) &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <div className="mt-5 pt-4 border-t border-[#f0f1f8] text-[11px] text-slate-500 text-center">
            🔒 Single Daily Count Enforced • Verified for Hospital Director's 10:30 AM Audit
          </div>
        </div>
      </div>

      {/* ================= VIRTUAL JOIN CONFIRMATION MODAL ================= */}
      {showVirtualConfirmModal && currentUser && (
        <div className="fixed inset-0 z-[30000] modal-backdrop flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 border border-[#f0f1f8] shadow-2xl animate-in zoom-in-95">
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
                onClick={handleConfirmVirtualAttendance}
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

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAttendanceSuccessModal(null);
                  navigate('/portal');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-[#7065f0] to-[#7f70f6] hover:from-[#513ed8] hover:to-[#7065f0] text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-300/40 transition-all cursor-pointer"
              >
                Go to Leader Portal &rarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendanceSuccessModal(null);
                  setErrorMessage('');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
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
