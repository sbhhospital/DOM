import React, { useState } from 'react';
import {
  Video,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDom } from '../context/DomContext';

export const PersonalPortal: React.FC = () => {
  const { currentLeader } = useAuth();
  const { meeting, attendanceRecords, processQrScan, selectAttendanceMode, qrToken } = useDom();
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  const leaderId = currentLeader?.id || '';
  const leaderRecord = attendanceRecords.find((r) => r.leader_id === leaderId);

  const handleSimulatePhysicalScan = () => {
    if (!leaderId) return;
    const res = processQrScan(leaderId, qrToken);
    setScanResult(res);
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim() || !leaderId) return;
    const res = processQrScan(leaderId, manualTokenInput.trim());
    setScanResult(res);
  };

  const handleJoinVirtually = () => {
    if (!leaderId) return;
    selectAttendanceMode(leaderId, 'VIRTUAL');
    window.open(meeting.google_meet_url, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Personal Attendance Link
          </span>
          <span className="text-xs font-mono text-slate-500">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
          </span>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-bold text-slate-900">Welcome, {currentLeader?.full_name || 'Leader'}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLeader?.department?.name || 'Department'} • {currentLeader?.employee_code || ''}
          </p>
        </div>

        {/* Current Status Box */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Your Attendance Status for Today:</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
              {leaderRecord?.status === 'PRESENT' && (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Present (Verified by Admin)
                </span>
              )}
              {leaderRecord?.status === 'CHECKED_IN' && (
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" /> Checked-In (Awaiting Admin
                  Verification)
                </span>
              )}
              {leaderRecord?.status === 'LEAVE' && (
                <span className="text-purple-700">Official Leave Approved</span>
              )}
              {leaderRecord?.status === 'EXCUSED' && (
                <span className="text-blue-700">Clinical Exemption Granted</span>
              )}
              {(!leaderRecord || leaderRecord.status === 'PENDING') && (
                <span className="text-slate-600 font-medium">Action Required: Confirm Attendance</span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Expected Mode:</span>
            <span className="text-xs font-bold text-slate-700">{currentLeader?.expected_mode || 'PHYSICAL'}</span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons (Section 9 Requirement: Join Virtually or Attend Physically) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Attend Physically (In-Room QR) */}
        <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-6 shadow-xs flex flex-col justify-between hover:border-blue-500 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Attending Physically</h3>
            <p className="text-xs text-slate-500 mt-1">
              Present in Boardroom 1. Scan the projected conference room QR code to register your check-in.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleSimulatePhysicalScan}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
            >
              <QrCode className="w-4 h-4" />
              Scan Room QR Code Now
            </button>
            <div className="text-[11px] text-center text-slate-400">
              Scans active rotating in-room session token
            </div>
          </div>
        </div>

        {/* Option 2: Join Virtually (Google Meet) */}
        <div className="bg-white rounded-2xl border-2 border-cyan-500/30 p-6 shadow-xs flex flex-col justify-between hover:border-cyan-500 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Join Virtually</h3>
            <p className="text-xs text-slate-500 mt-1">
              Connect via official hospital Google Meet. Attendance duration is reconciled automatically.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleJoinVirtually}
              className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Launch Google Meet
            </button>
            <div className="text-[11px] text-center text-slate-400">
              Opens: {meeting.google_meet_url || 'Google Meet'}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Feedback Feedback Alert */}
      {scanResult && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            scanResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {scanResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="text-xs font-medium">{scanResult.message}</div>
        </div>
      )}

      {/* Manual Token Verification Fallback */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Manual QR Token Fallback
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          If your device camera encounters difficulty scanning the projected display, enter the dynamic token shown on
          the screen:
        </p>
        <form onSubmit={handleManualTokenSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. SBH-DOM-m-today-..."
            value={manualTokenInput}
            onChange={(e) => setManualTokenInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
          >
            Submit Code
          </button>
        </form>
      </div>
    </div>
  );
};
