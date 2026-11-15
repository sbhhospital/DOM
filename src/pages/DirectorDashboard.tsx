import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Video,
  Clock,
  AlertCircle,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useDom } from '../context/DomContext';
import { AttendanceStatus, AttendanceMode } from '../types/database';

export const DirectorDashboard: React.FC = () => {
  const { metrics, attendanceRecords, reconcileGoogleMeet } = useDom();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  const filteredRecords = attendanceRecords.filter((rec) => {
    const leaderName = rec.leader?.full_name.toLowerCase() || '';
    const deptName = rec.leader?.department?.name.toLowerCase() || '';
    const matchesSearch = leaderName.includes(searchTerm.toLowerCase()) || deptName.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    const matchesMode = modeFilter === 'ALL' || rec.selected_mode === modeFilter;

    return matchesSearch && matchesStatus && matchesMode;
  });

  const getStatusBadge = (status: AttendanceStatus, verified: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present (Verified)
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" /> In Verification Queue
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <FileText className="w-3 h-3 text-purple-600" /> Approved Leave
          </span>
        );
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldAlert className="w-3 h-3 text-blue-600" /> Clinical Exemption
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Rejected Check-in
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Unresolved / Pending
          </span>
        );
    }
  };

  const getModeBadge = (mode: AttendanceMode) => {
    switch (mode) {
      case 'PHYSICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            In-Person (Room QR)
          </span>
        );
      case 'VIRTUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
            <Video className="w-3 h-3 text-cyan-600" /> Google Meet
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">None Selected</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital DOM Operations Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time attendance intelligence, physical in-room verification, and automated Google Meet reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reconcileGoogleMeet()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Reconcile Google Meet
          </button>
        </div>
      </div>

      {/* Metric Cards (Database-driven, strictly adhering to Section 16 requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Total Scheduled */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-medium">Scheduled Leaders</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.totalScheduled}</div>
          <div className="text-[11px] text-slate-400 mt-1">100% of hospital roster</div>
        </div>

        {/* Verified Physical */}
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-xs font-semibold">Physical (Verified)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.verifiedPhysical}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1">Conference Room, 5th Floor</div>
        </div>

        {/* Verified Virtual */}
        <div className="bg-white p-4 rounded-xl border border-cyan-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-cyan-700">
            <span className="text-xs font-semibold">Virtual (Verified)</span>
            <Video className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-cyan-600">{metrics.verifiedVirtual}</div>
          <div className="text-[11px] text-cyan-700/80 mt-1">Google Meet Reconciled</div>
        </div>

        {/* Pending Physical Verification */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-amber-800">
            <span className="text-xs font-semibold">Awaiting Verification</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-700">{metrics.pendingPhysicalVerification}</div>
          <div className="text-[11px] text-amber-800/80 mt-1">QR scanned, pending admin</div>
        </div>

        {/* Approved Leave */}
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-purple-700">
            <span className="text-xs font-semibold">Approved Leave / Excused</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-700">
            {metrics.approvedLeave + metrics.approvedExceptions}
          </div>
          <div className="text-[11px] text-purple-700/80 mt-1">
            {metrics.approvedLeave} Leave • {metrics.approvedExceptions} Clinical
          </div>
        </div>
      </div>

      {/* Unresolved & Escalation Alert Box (if any) */}
      {metrics.unresolvedCount > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                {metrics.unresolvedCount} Hospital Leaders have unresolved DOM attendance.
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                Per hospital policy, personal reminder link dispatched at 10:00 AM & 10:05 AM. Group escalation at 10:20
                AM.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Register & Live Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/60">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leader by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present (Verified)</option>
              <option value="CHECKED_IN">In Queue (Checked In)</option>
              <option value="PENDING">Unresolved (Pending)</option>
              <option value="LEAVE">Approved Leave</option>
              <option value="EXCUSED">Excused / Clinical</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="bg-white border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Modes</option>
              <option value="PHYSICAL">Physical (In-Person)</option>
              <option value="VIRTUAL">Virtual (Google Meet)</option>
              <option value="NONE">None Selected</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Hospital Leader</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Expected Mode</th>
                <th className="py-3 px-4">Recorded Mode</th>
                <th className="py-3 px-4">Event Time (IST)</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4">Evidence Source</th>
                <th className="py-3 px-4">Verification Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => {
                const leader = rec.leader;
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{leader?.full_name}</div>
                      <div className="text-[11px] text-slate-500">{leader?.employee_code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{leader?.department?.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-slate-600">{leader?.expected_mode}</span>
                    </td>
                    <td className="py-3.5 px-4">{getModeBadge(rec.selected_mode)}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {rec.check_in_at
                        ? new Date(rec.check_in_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(rec.status, rec.verification_status)}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {rec.evidence_source ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">
                          {rec.evidence_source}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                      {rec.verification_note || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
