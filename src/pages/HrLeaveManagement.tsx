import React, { useState } from 'react';
import { CalendarCheck, Clock, CheckCircle2, XCircle, Plus, FileText, UserCheck } from 'lucide-react';
import { useDom } from '../context/DomContext';
import { useAuth } from '../context/AuthContext';

export const HrLeaveManagement: React.FC = () => {
  const { currentLeader } = useAuth();
  const { leaveRequests, submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest } = useDom();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [reason, setReason] = useState('');

  const isHrOrAdmin = currentLeader ? (currentLeader.role === 'HR' || currentLeader.role === 'ADMIN' || currentLeader.role === 'SUPER_ADMIN') : false;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      alert('Please fill out all mandatory leave fields.');
      return;
    }
    submitLeaveRequest(startDate, endDate, leaveType, reason.trim());
    setShowCreateModal(false);
    setReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Hospital Leave & DOM Exemption Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official leave requests suppress scheduled 10:00 AM, 10:05 AM, and 10:20 AM attendance notifications upon
            HR approval.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Submit Leave Request
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>Leave Applications & Exemptions Roster</span>
          <span className="text-slate-400 font-normal">Total: {leaveRequests.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Hospital Leader</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Reason / Clinical Duty</th>
                <th className="py-3 px-4">Status</th>
                {isHrOrAdmin && <th className="py-3 px-4 text-right">HR Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveRequests.map((req) => {
                const leader = req.leader;
                return (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{leader?.full_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{leader?.department?.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {req.start_date} to {req.end_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                        {req.leave_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{req.reason}</td>
                    <td className="py-3.5 px-4">
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending HR
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                        </span>
                      )}
                    </td>
                    {isHrOrAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approveLeaveRequest(req.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectLeaveRequest(req.id, 'Conflict with operational requirements')}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[11px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status !== 'PENDING' && <span className="text-slate-400 text-[11px]">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Submit DOM Leave Request</h3>
            <p className="text-xs text-slate-500 mb-4">
              Applying for: <span className="font-semibold text-slate-800">{currentLeader?.full_name || 'Leader'}</span>
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="MEDICAL">Medical / Sickness Leave</option>
                  <option value="CONFERENCE">Academic / Clinical Conference</option>
                  <option value="OFFICIAL_DUTY">External Hospital Official Duty</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason / Clinical Duty Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide clinical or administrative justification..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
