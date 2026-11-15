import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle,
  Video,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useDom } from '../context/DomContext';

export const ExecutiveReports: React.FC = () => {
  const { metrics, attendanceRecords, meeting } = useDom();
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Analytical Pie Chart Data
  const pieData = [
    { name: 'Physical (Verified)', value: metrics.verifiedPhysical, color: '#10b981' },
    { name: 'Virtual (Meet)', value: metrics.verifiedVirtual, color: '#06b6d4' },
    { name: 'Awaiting Verify', value: metrics.pendingPhysicalVerification, color: '#f59e0b' },
    { name: 'Leave / Excused', value: metrics.approvedLeave + metrics.approvedExceptions, color: '#8b5cf6' },
    { name: 'Unresolved', value: metrics.unresolvedCount, color: '#64748b' },
  ];

  // Department-wise Bar Chart Distribution
  const departmentStats = attendanceRecords.reduce((acc, rec) => {
    const dept = rec.leader?.department?.code || 'OTHER';
    if (!acc[dept]) {
      acc[dept] = { dept, verified: 0, pending: 0, leave: 0 };
    }
    if (rec.status === 'PRESENT') acc[dept].verified += 1;
    else if (rec.status === 'LEAVE' || rec.status === 'EXCUSED') acc[dept].leave += 1;
    else acc[dept].pending += 1;
    return acc;
  }, {} as Record<string, { dept: string; verified: number; pending: number; leave: number }>);

  const barData = Object.values(departmentStats);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = 'Employee Code,Leader Name,Department,Expected Mode,Recorded Mode,Status,Check In Time,Evidence Source,Note\n';
    const rows = attendanceRecords
      .map(
        (r) =>
          `"${r.leader?.employee_code || ''}","${r.leader?.full_name || ''}","${r.leader?.department?.name || ''}","${r.leader?.expected_mode || ''}","${r.selected_mode}","${r.status}","${r.check_in_at || ''}","${r.evidence_source || ''}","${r.verification_note || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DOM_Attendance_SBH_${meeting.meeting_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Director Attendance Reports</h2>
          <p className="text-xs text-slate-500 mt-1">
            Auditable compliance documentation for NABH/NABL accreditation and SBH Hospital Leadership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Distribution Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-blue-600" />
            Attendance Composition
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Breakdown of leadership attendance states for today's DOM.</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Compliance Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-600" />
            Department Breakdown
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Attendance verification count across clinical specialties.</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="dept" fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="verified" name="Verified Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Unresolved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leave" name="Leave / Excused" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Audit Export Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between items-center">
          <span>Hospital Attendance Record (Official Hospital Register)</span>
          <span className="text-slate-400 font-normal">Date: {meeting.meeting_date}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Leader Name</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Time (IST)</th>
                <th className="py-2.5 px-4">Verification Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceRecords.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{r.leader?.employee_code}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">{r.leader?.full_name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{r.leader?.department?.name}</td>
                  <td className="py-2.5 px-4 text-slate-700">{r.selected_mode}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{r.status}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                    {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-IN') : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{r.verification_note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
