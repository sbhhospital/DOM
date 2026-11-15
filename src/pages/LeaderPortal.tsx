import React, { useState } from 'react';
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
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { Leader } from '../types/database';
import { verifyLeaderMagicLink } from '../lib/magicLink';
import { LiveRoomQrScannerModal } from '../components/LiveRoomQrScannerModal';
import sbhLogo from '../assets/sbh-logo.png';

export const LeaderPortal: React.FC = () => {
  const {
    leaders,
    selectedDate,
    markVirtualJoin,
    markRoomQrCheckIn,
    logMeetingRejoin,
    submitInformedAbsence,
    getMeetingForDate,
    attendanceRecords,
  } = useDomApp();
  const { currentUser, logoutUser, updateUserPassword, isUserAuthenticated } = useAuthSession();

  const currentMeeting = getMeetingForDate(selectedDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(currentUser);

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

  // Absence modal
  const [showInformedModal, setShowInformedModal] = useState(false);
  const [informedToPerson, setInformedToPerson] = useState('');
  const [informedReason, setInformedReason] = useState('');

  // Password Modal for Leader self password change
  const [showUserPassModal, setShowUserPassModal] = useState(false);
  const [oldUserPass, setOldUserPass] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userPassMsg, setUserPassMsg] = useState<{ success?: boolean; text?: string } | null>(null);

  // Status feedback
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  const activeLeader = currentUser || selectedLeader;

  const [showScannerModal, setShowScannerModal] = useState(false);

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
      (todayRecord.check_in_at ||
        (todayRecord as any).join_time ||
        todayRecord.status === 'PRESENT' ||
        todayRecord.status === 'INFORMED_LATE')
  );

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
    });

    setActionMessage({
      success: res.success,
      text: res.message || 'Boardroom physical attendance confirmed via live camera scan!',
    });
  };

  const handleJoinVirtually = async () => {
    if (!activeLeader) return;
    const res = await markVirtualJoin(activeLeader.id);
    setActionMessage({
      success: true,
      text: `Virtual attendance recorded! Launching official Google Meet: ${res.meetUrl}`,
    });
    window.open(res.meetUrl, '_blank');
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

    const res = await submitInformedAbsence(activeLeader.id, informedToPerson.trim(), informedReason.trim());
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

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#1f2d2a] flex flex-col font-sans p-4 sm:p-6 pb-24 items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Branding (Clean Reference Theme) */}
        <div className="fluent-card rounded-3xl p-6 text-center border-t-4 border-t-orange-500 relative overflow-hidden bg-white shadow-sm border border-[#dcdcdc]">
          <div className="flex items-center justify-center mx-auto mb-3">
            <img src={sbhLogo} alt="SBH Group of Hospitals" className="h-11 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#cfead6] text-[#2e7d32] border border-[#2e7d32]/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#2e7d32]" /> SBH Group of Hospitals • Raipur
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1f2d2a] tracking-tight">LEADER ATTENDANCE PORTAL</h1>

          {/* Session Type Badge: Daily, Weekly, or Monthly */}
          <div className="mt-2.5 inline-block">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                currentMeeting.frequency === 'MONTHLY'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : currentMeeting.frequency === 'WEEKLY'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-orange-100 text-orange-950 border border-orange-200'
              }`}
            >
              {currentMeeting.title}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-2 flex items-center justify-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            <span>Date: </span>
            <span className="font-mono text-[#1f2d2a] font-bold">{selectedDate}</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-[#2e7d32]" />
            <span>{currentMeeting.scheduled_time}</span>
          </p>

          {currentMeeting.is_holiday_or_shifted && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{currentMeeting.shift_reason || 'Rescheduled meeting session'}</span>
            </div>
          )}

          {/* Personalized 1-Click Magic Link Welcome Banner */}
          {magicAuthStatus.valid && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border-2 border-emerald-400 text-left shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <span>✨ Verified 1-Click Attendance Access</span>
                    <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-mono text-[9px]">15-Min Session Active</span>
                  </div>
                  <div className="text-base font-black text-slate-900 truncate">
                    Welcome, {magicAuthStatus.name}!
                  </div>
                  <div className="text-xs text-slate-600 font-semibold truncate">
                    Department: <span className="text-orange-700 font-bold">{magicAuthStatus.dept}</span> • Select your check-in mode below
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expired Magic Link Alert */}
          {magicAuthStatus.expired && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-left text-xs text-amber-900 shadow-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">15-Minute Quick Link Expired</strong>
                <span>Your personalized access link for <strong>{magicAuthStatus.name}</strong> has passed its 15-minute security lifetime. Please select your profile below to sign in with your PIN.</span>
              </div>
            </div>
          )}

          {/* User authenticated top controls */}
          {currentUser && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-slate-600">
                Logged in as: <span className="font-bold text-slate-900">{currentUser.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUserPassModal(true)}
                  className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
                <span>•</span>
                <button
                  onClick={() => logoutUser()}
                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
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

        {/* If no leader is selected/authenticated, show search list */}
        {!activeLeader ? (
          <div className="fluent-card rounded-3xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Select Your Name from Hospital Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan result from Boardroom QR or WhatsApp link. Search your name:
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Type your name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-semibold"
              />
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {filteredLeaders.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  No leaders found. Please contact DOM Administrator.
                </div>
              ) : (
                filteredLeaders.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeader(l)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{l.full_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {l.department?.name || 'Department'} •{' '}
                        <span className="font-mono text-orange-600 font-semibold">{l.email}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-bold border border-orange-200">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Selected / Logged-in Leader - Choose Mode */
          <div className="fluent-card rounded-3xl p-6 space-y-6 bg-white border border-[#dcdcdc] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#dcdcdc]">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#2e7d32] bg-[#cfead6] px-2.5 py-0.5 rounded-full border border-[#2e7d32]/30 font-bold">
                  Active Hospital Leader
                </span>
                <h3 className="text-xl font-bold text-[#1f2d2a] mt-1.5">{activeLeader.full_name}</h3>
                <div className="text-xs text-slate-700 font-semibold">
                  {activeLeader.department?.name} • {activeLeader.email}
                </div>
              </div>

              {!currentUser && (
                <button
                  onClick={() => {
                    setSelectedLeader(null);
                    setActionMessage(null);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold underline underline-offset-2 cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            {hasJoinedToday ? (
              /* State A: Attendance is ALREADY Recorded Today -> Clean Rejoin Option Only */
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-white border-2 border-[#2e7d32]/40 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#2e7d32] bg-[#cfead6] px-3 py-1 rounded-full border border-[#2e7d32]/30 font-bold inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" /> Attendance Confirmed Today
                      </span>
                      <h4 className="text-base font-bold text-[#1f2d2a] mt-2">
                        You have already joined today's DOM meeting
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        Official attendance timestamp locked in audit register.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Join Time</div>
                      <div className="text-xs font-mono font-bold text-[#2e7d32] bg-white px-2.5 py-1 rounded-lg border border-[#2e7d32]/30 mt-0.5 shadow-2xs">
                        {formattedCheckInTime}
                      </div>
                    </div>
                  </div>

                  {/* Mode & Director Sign-Off Info */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                    <div className="bg-white/80 border border-[#dcdcdc] rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Recorded Mode</div>
                      <div className="font-bold text-[#1f2d2a] mt-0.5 flex items-center gap-1.5 text-xs truncate">
                        {todayRecord?.selected_mode === 'PHYSICAL' ? (
                          <><QrCode className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" /> In-Room Physical</>
                        ) : (
                          <><Video className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Virtual (Google Meet)</>
                        )}
                      </div>
                    </div>
                    <div className="bg-white/80 border border-[#dcdcdc] rounded-xl p-2.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Audit Verification</div>
                      <div className="font-bold mt-0.5 flex items-center gap-1.5 text-xs truncate">
                        {todayRecord?.admin_verified_attendance ? (
                          <span className="text-[#2e7d32] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" /> APPROVED
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
                    className="w-full py-3.5 px-5 bg-[#2e7d32] hover:bg-[#256628] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Video className="w-4 h-4 text-white" />
                    <span>Rejoin Official Meeting (Google Meet) &rarr;</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5 font-medium">
                    Rejoining does not increment attendance count. Rejoin timestamp is logged silently in SQL database.
                  </p>
                </div>
              </div>
            ) : (
              /* State B: Not Checked In Yet -> Show Physical QR Camera Scanner & Virtual Options */
              <>
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Confirm Today's DOM Presence
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Mode 1: Physical Check-In (In-Room Camera Scanner) */}
                    <button
                      onClick={handleAttendPhysically}
                      className="p-5 rounded-2xl bg-white border-2 border-emerald-400 hover:border-[#2e7d32] text-left transition-all group cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#cfead6] text-[#2e7d32] flex items-center justify-center mb-3 shadow-sm">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-[#1f2d2a] text-sm group-hover:text-[#2e7d32]">
                        Attending In-Person
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-medium">
                        Opens live camera to scan Boardroom QR code in 5th Floor Conference Hall.
                      </p>
                    </button>

                    {/* Mode 2: Virtual Join (Google Meet) */}
                    <button
                      onClick={handleJoinVirtually}
                      className="p-5 rounded-2xl bg-white border-2 border-blue-400 hover:border-blue-600 text-left transition-all group cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 shadow-sm">
                        <Video className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-[#1f2d2a] text-sm group-hover:text-blue-700">
                        Join Online (Google Meet)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-medium">
                        Opens official Google Meet. Records your login automatically as virtual attendee.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Mode 3: Cannot Attend? Submit Informed Notice */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowInformedModal(true)}
                    className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-700" />
                    <span>Cannot attend? Submit prior informed notice / leave</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal: Informed Absence Notice */}
        {showInformedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <h3 className="text-base font-black text-slate-900 mb-1">Record Prior Informed Absence</h3>
              <p className="text-xs text-slate-500 mb-4">
                Hospital compliance requires mentioning which authority or colleague you informed before missing the
                meeting.
              </p>

              <form onSubmit={handleInformedSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Whom did you inform? (Name / Title)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Sir / Mr. Naman Mishra / Medical Superintendent"
                    value={informedToPerson}
                    onChange={(e) => setInformedToPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Absence</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Emergency surgery in OT-2 / Clinical round in ICU / Approved Casual Leave"
                    value={informedReason}
                    onChange={(e) => setInformedReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
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
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/25 cursor-pointer"
                  >
                    Submit Informed Absence
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Leader Personal Password Change */}
        {showUserPassModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
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

        {/* Footer Admin Link */}
        <div className="text-center pt-2 pb-8">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-xs text-orange-700 font-bold border border-orange-200 shadow-xs transition-all"
          >
            <span>Admin Command Center Login &rarr;</span>
          </a>
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
