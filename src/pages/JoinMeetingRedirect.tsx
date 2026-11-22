import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Hospital,
  Video,
  CheckCircle2,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Camera,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  User,
  Building,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { useDomApp } from '../context/DomAppContext';
import { verifyDailyMeetingToken, DEFAULT_GOOGLE_MEET_URL } from '../lib/meetingLinks';
import { formatToIndianDate, calculateDistanceInMeters, checkStandupWindowStatus } from '../lib/meetingUtils';
import { Leader } from '../types/database';
import defaultLeaderAvatar from '../assets/default-leader-avatar.png';

export const JoinMeetingRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const {
    leaders,
    markVirtualJoin,
    markRoomQrCheckIn,
    verifyVirtualMeetingQr,
    attendanceRecords,
    getMeetingForDate,
    appSettings,
  } = useDomApp();

  const tokenParam = params.token || searchParams.get('token') || searchParams.get('auth') || '';
  const uidParam = searchParams.get('uid') || searchParams.get('u') || '';
  const dateParam = searchParams.get('date') || searchParams.get('d') || '';

  const [leader, setLeader] = useState<Leader | null>(null);
  const [targetDate, setTargetDate] = useState<string>('');
  const [meetUrl, setMeetUrl] = useState<string>(DEFAULT_GOOGLE_MEET_URL);
  const [joinCount, setJoinCount] = useState<number>(1);
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [isQrVerified, setIsQrVerified] = useState<boolean>(false);
  const [physicalSuccess, setPhysicalSuccess] = useState<string | null>(null);
  const [virtualSuccess, setVirtualSuccess] = useState<string | null>(null);
  const [showVerifiedSuccessModal, setShowVerifiedSuccessModal] = useState<boolean>(false);
  const [verifiedDetails, setVerifiedDetails] = useState<{
    leaderName: string;
    department: string;
    timeStr: string;
    distanceMeters: number;
    mode: string;
  } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Decode Token & Resolve Leader
  useEffect(() => {
    let resolvedLeader: Leader | undefined;
    let resolvedDate = dateParam || new Date().toISOString().split('T')[0];
    let resolvedMeetUrl = appSettings.google_meet_url || DEFAULT_GOOGLE_MEET_URL;

    if (tokenParam) {
      const decoded = verifyDailyMeetingToken(tokenParam);
      if (decoded.valid && decoded.payload) {
        resolvedDate = decoded.payload.date || resolvedDate;
        resolvedMeetUrl = decoded.payload.meetUrl || resolvedMeetUrl;
        resolvedLeader = leaders.find((l) => l.id === decoded.payload?.leaderId);
        if (!resolvedLeader) {
          // Construct fallback leader representation
          resolvedLeader = {
            id: decoded.payload.leaderId,
            full_name: decoded.payload.name,
            email: `${decoded.payload.name.toLowerCase().replace(/\s+/g, '')}@sbhhospital.com`,
            phone: decoded.payload.phone,
            role: 'LEADER',
            expected_mode: 'VIRTUAL',
            is_active: true,
            department: {
              id: 'dept-auto',
              name: decoded.payload.dept,
              code: 'DEPT',
              is_active: true,
              created_at: '',
              updated_at: '',
            },
            created_at: '',
            updated_at: '',
          };
        }
      }
    } else if (uidParam) {
      resolvedLeader = leaders.find((l) => l.id === uidParam);
    }

    if (resolvedLeader) {
      setLeader(resolvedLeader);
      setTargetDate(resolvedDate);
      setMeetUrl(resolvedMeetUrl);
      setIsLogged(true);
    }
  }, [tokenParam, uidParam, dateParam, leaders]);

  // Check if already QR verified
  useEffect(() => {
    if (leader && targetDate) {
      const rec = attendanceRecords.find((r) => r.leader_id === leader.id && r.meeting_date === targetDate);
      if (rec) {
        if (rec.evidence_source === 'ROOM_STATIC_QR' || rec.evidence_source === 'VIRTUAL_QR_VERIFIED' || rec.qr_scanned_at || rec.admin_verified_attendance) {
          setIsQrVerified(true);
        }
        if (rec.virtual_clicks_count) {
          setJoinCount(rec.virtual_clicks_count);
        }
      }
    }
  }, [attendanceRecords, leader, targetDate]);

  // Handle Online Virtual Attendance Click (Explicit user action - NO automatic redirection!)
  const handleVirtualJoinClick = async () => {
    if (!leader || !targetDate) return;

    const windowCheck = checkStandupWindowStatus(targetDate, joinCount > 0, activeMeeting.cadence);
    if (!windowCheck.allowed) {
      setVirtualSuccess(null);
      setScannerError(windowCheck.message);
      setIsScannerOpen(true);
      return;
    }

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
        console.warn('Geolocation notice:', e);
      }
    }

    const res = await markVirtualJoin(leader.id, targetDate, geoCoords);
    setJoinCount(res.clicksCount || joinCount + 1);
    setVirtualSuccess(`Virtual attendance verified! Opening Google Meet...`);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}

    window.open(res.meetUrl || meetUrl, '_blank');
  };

  // Start Camera QR Scanner for In-Person Physical Verification
  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannerError('');

    const windowCheck = checkStandupWindowStatus(targetDate || new Date().toISOString().split('T')[0], isQrVerified, activeMeeting.cadence);
    if (!windowCheck.allowed) {
      setScannerError(windowCheck.message);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanQrFrame();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setScannerError('Could not open camera. Please grant camera access permissions in your browser.');
    }
  };

  const stopScanner = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const scanQrFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleSuccessfulQrScan(code.data);
          return;
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanQrFrame);
  };

  const handleSuccessfulQrScan = async (scannedText: string) => {
    if (!leader || !targetDate) return;

    // Check Standup Window
    const windowCheck = checkStandupWindowStatus(targetDate, isQrVerified, activeMeeting.cadence);
    if (!windowCheck.allowed) {
      setScannerError(windowCheck.message);
      return;
    }

    // 1. Mandatory Geolocation verification
    let geoCoords: { latitude?: number; longitude?: number; accuracy?: number } | undefined;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 10000,
          });
        });
        geoCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
      } catch (e) {
        setScannerError('⚠️ Location permission is required to verify your presence in the Conference Room. Please enable GPS on your device.');
        return;
      }
    } else {
      setScannerError('⚠️ Geolocation is not supported by your browser or device.');
      return;
    }

    if (!geoCoords?.latitude || !geoCoords?.longitude) {
      setScannerError('⚠️ Hospital location could not be detected. Please ensure GPS is active and scan again.');
      return;
    }

    // 2. Hospital Campus Geofence check (SBH Hospital, New Rajendra Nagar, Raipur)
    const hospitalLat = appSettings.hospital_latitude || 21.22528;
    const hospitalLng = appSettings.hospital_longitude || 81.65921;
    const allowedRadius = appSettings.hospital_radius_meters || 200;

    const distance = calculateDistanceInMeters(
      geoCoords.latitude,
      geoCoords.longitude,
      hospitalLat,
      hospitalLng
    );

    if (appSettings.hospital_geofence_enabled !== false && distance > allowedRadius) {
      // Trigger markRoomQrCheckIn so the breach attempt is logged in Supabase SQL database (admin_audit_logs)
      markRoomQrCheckIn(leader.id, geoCoords);
      setScannerError(
        `🚫 Location Restriction: Physical QR scan is ONLY permitted inside SBH Hospital campus (Allowed radius: ${allowedRadius}m). You are currently approximately ${distance}m away. Your location attempt has been recorded in the security audit log.`
      );
      return;
    }

    stopScanner();

    // 3. Submit verified QR check-in
    const res = await markRoomQrCheckIn(leader.id, geoCoords);
    if (!res.success) {
      setScannerError(res.message);
      return;
    }
    setIsQrVerified(true);
    setPhysicalSuccess('Conference Room In-Person Attendance Verified via Camera QR Scan!');

    const timeString = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    setVerifiedDetails({
      leaderName: leader.full_name,
      department: leader.department?.name || 'Department Leader',
      timeStr: timeString,
      distanceMeters: distance,
      mode: 'Physical (QR Verified)',
    });
    setShowVerifiedSuccessModal(true);

    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  const activeMeeting = getMeetingForDate(targetDate || new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/70 via-white to-emerald-50/70 text-slate-800 flex flex-col justify-center items-center p-4 pb-20 relative overflow-hidden font-sans">
      {/* Background ambient glows */}
      <div className="absolute top-12 left-12 w-80 h-80 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-300/40 overflow-hidden relative z-10 text-slate-800">
        {/* Top Header */}
        <div className="p-6 text-center bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 text-white relative shadow-sm">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/30">
            <Hospital className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs mb-2 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" /> SBH Group of Hospital • Raipur
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">DOM VIRTUAL ATTENDANCE GATEWAY</h1>
          <p className="text-xs text-emerald-100 mt-0.5">Automated Meeting Tracking & Verification Console</p>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {leader ? (
            <>
              {/* Leader Identification Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={defaultLeaderAvatar}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-leader-avatar.png'; }}
                    alt={leader.full_name}
                    className="w-11 h-11 rounded-full object-cover border border-purple-200 shadow-sm shrink-0"
                  />
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">{leader.full_name}</h2>
                    <div className="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-700 font-bold">{leader.department?.name || 'Leadership'}</span>
                      <span>•</span>
                      <span>{leader.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-black text-slate-400">Clicks Logged</div>
                  <div className="text-sm font-mono font-black text-emerald-600">
                    {joinCount} {joinCount === 1 ? 'time' : 'times'}
                  </div>
                </div>
              </div>

              {/* Attendance Status Banner */}
              {(() => {
                const currentRecord = attendanceRecords.find(
                  (r) => r.leader_id === leader.id && r.meeting_date === targetDate
                );
                const isLate = currentRecord?.late_minutes && currentRecord.late_minutes > 0;
                const isApproved = currentRecord?.admin_verified_attendance;

                return (
                  <div
                    className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                      isApproved
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isLate
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-teal-50 border-teal-300 text-teal-900'
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-black text-sm flex items-center gap-1.5 flex-wrap">
                        {isApproved ? (
                          <span>✅ Attendance Approved by Admin</span>
                        ) : (
                          <span>⏳ Approval Pending from Admin</span>
                        )}
                        {isLate ? (
                          <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-black">
                            +{currentRecord?.late_minutes}m Late
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 leading-relaxed text-slate-700">
                        {isApproved ? (
                          <span>
                            Your virtual attendance has been officially confirmed by Admin for{' '}
                            <strong>{targetDate}</strong>.
                          </span>
                        ) : isLate ? (
                          <span>
                            You joined after the scheduled meeting time (<strong>{activeMeeting.scheduled_time}</strong>). Your late check-in (+{currentRecord?.late_minutes}m) has been logged and submitted for Admin sign-off.
                          </span>
                        ) : (
                          <span>
                            Your daily meeting click has been recorded on-time for <strong>{targetDate}</strong>. Meeting coordinator approval will confirm your verified presence.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Meeting Meta details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Meeting Date
                  </span>
                  <div className="font-mono font-bold text-slate-900 mt-1">{formatToIndianDate(targetDate)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Start Time
                  </span>
                  <div className="font-mono font-bold text-slate-900 mt-1">
                    {activeMeeting.scheduled_time} (Sharp)
                  </div>
                </div>
              </div>

              {/* Live Scanner Modal / Accordion */}
              {isScannerOpen && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Scan Meeting Screen QR
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Point your camera at the QR code displayed on the Google Meet screen or conference projector:
                  </p>

                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-8 border-2 border-dashed border-emerald-400 rounded-lg pointer-events-none animate-pulse" />
                  </div>

                  {scannerError && (
                    <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-800 font-semibold">
                      {scannerError}
                    </div>
                  )}

                  <div className="pt-2 text-[11px] text-slate-400 text-center font-medium">
                    📍 Hospital 5th Floor Geofence Enforced: Scan must occur inside the Conference Room.
                  </div>
                </div>
              )}

              {/* Success Notification Banners */}
              {physicalSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{physicalSuccess}</span>
                </div>
              )}

              {virtualSuccess && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 text-teal-900 text-xs font-bold flex items-center gap-2.5">
                  <Video className="w-5 h-5 text-teal-600 shrink-0" />
                  <span>{virtualSuccess}</span>
                </div>
              )}

              {/* Explicit Mode Selection: Physical (In-Person) vs Virtual (Online) */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 text-center">
                  Select Your Meeting Attendance Mode
                </div>

                {/* Option A: Attend In-Person (QR Scan Verification) */}
                <button
                  type="button"
                  onClick={startScanner}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-between transition-all cursor-pointer active:scale-95 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>Attend In-Person (5th Flr Room)</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Physical</span>
                      </div>
                      <div className="text-xs text-emerald-100 font-medium">
                        Scan Conference Room QR code to confirm presence
                      </div>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Option B: Join Online (Virtual Google Meet) */}
                <button
                  type="button"
                  onClick={handleVirtualJoinClick}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-lg shadow-blue-700/20 flex items-center justify-between transition-all cursor-pointer active:scale-95 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>Join Virtually (Google Meet)</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Virtual</span>
                      </div>
                      <div className="text-xs text-blue-100 font-medium">
                        Log telemetry & launch official video meeting
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            /* Fallback state if token not found or invalid */
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Meeting Join Link Needed</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No personal leader token was provided. If you have your personal link from WhatsApp, please tap it, or
                proceed to the general leader attendance portal.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md text-center"
                >
                  Proceed to Google Meet Direct
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                >
                  Open Staff Attendance Portal
                </button>
              </div>
            </div>
          )}

          {/* Secure Compliance Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Official Hospital Audit Sync
            </span>
            <span>Target: meet.google.com/jrz-jfku-gir</span>
          </div>
        </div>
      </div>

      {/* Verified Attendance Confirmation Modal */}
      {showVerifiedSuccessModal && verifiedDetails && (
        <div className="fixed inset-0 z-[20000] modal-backdrop flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="h-3 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-700 absolute top-0 left-0" />
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Verified via QR Code Scanning ✅
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Conference Room In-Person Physical Attendance Confirmed!
            </p>
            <div className="my-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Leader Name:</span>
                <span className="font-bold text-slate-900">{verifiedDetails.leaderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-bold text-slate-800">{verifiedDetails.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recorded Mode:</span>
                <span className="font-bold text-emerald-700">{verifiedDetails.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Hospital Geofence Distance:</span>
                <span className="font-bold text-emerald-700">{verifiedDetails.distanceMeters}m from 5th Flr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Time Recorded:</span>
                <span className="font-mono font-bold text-slate-900">{verifiedDetails.timeStr} IST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-mono font-bold text-slate-900">{formatToIndianDate(targetDate)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVerifiedSuccessModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
