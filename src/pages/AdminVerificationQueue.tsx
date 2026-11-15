import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, User, Clock, ArrowRight } from 'lucide-react';
import { useDom } from '../context/DomContext';

export const AdminVerificationQueue: React.FC = () => {
  const { attendanceRecords, verifyPhysicalCheckIn, rejectPhysicalCheckIn } = useDom();
  const [rejectModalRecordId, setRejectModalRecordId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Items currently waiting for Admin visual confirmation
  const pendingQueue = attendanceRecords.filter(
    (r) => r.status === 'CHECKED_IN' && r.verification_status === 'PENDING'
  );

  const handleConfirmVerification = (recordId: string, leaderName: string) => {
    verifyPhysicalCheckIn(recordId, `Confirmed visual physical presence of ${leaderName} in DOM Conference Room.`);
  };

  const handleOpenReject = (recordId: string) => {
    setRejectModalRecordId(recordId);
    setRejectReason('');
  };

  const handleSubmitReject = () => {
    if (!rejectModalRecordId) return;
    if (!rejectReason.trim()) {
      alert('A valid mandatory reason must be provided for rejecting attendance.');
      return;
    }
    rejectPhysicalCheckIn(rejectModalRecordId, rejectReason.trim());
    setRejectModalRecordId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>In-Room Physical Verification Queue</span>
            {pendingQueue.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200 animate-pulse">
                {pendingQueue.length} Awaiting Confirmation
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hospital Policy: In-room QR scan provides proof of scan, but the DOM Admin must verify the leader's actual
            physical presence in the conference room.
          </p>
        </div>
      </div>

      {/* Verification Cards */}
      {pendingQueue.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All submitted QR check-ins have been verified by the DOM administrative officer. New mobile scans will appear
            here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingQueue.map((rec) => {
            const leader = rec.leader;
            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {rec.evidence_source || 'ROOM_QR'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {rec.check_in_at
                        ? new Date(rec.check_in_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-base font-bold text-slate-900">{leader?.full_name}</h4>
                    <p className="text-xs text-slate-600 font-medium">{leader?.department?.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{leader?.employee_code}</p>
                  </div>

                  <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Mode:</span> In-person (Conference Hall)
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleConfirmVerification(rec.id, leader?.full_name || 'Leader')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify Presence
                  </button>
                  <button
                    onClick={() => handleOpenReject(rec.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal with Mandatory Reason */}
      {rejectModalRecordId && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reject Attendance Check-In</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Hospital compliance mandates an auditable justification for rejecting a leader's QR check-in. This will be
              logged in the immutable audit register.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Leader was not present in the conference hall; scanned from external location..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalRecordId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReject}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
              >
                Confirm Rejection & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
