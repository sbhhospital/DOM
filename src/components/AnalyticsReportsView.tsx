import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  AlertCircle,
  Mail,
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  Building,
  Video,
  Clock,
  Sparkles,
  Download,
  Filter,
  Check,
  Copy,
  FileText,
  Printer,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useDomApp } from '../context/DomAppContext';
import { Leader, AttendanceRecord } from '../types/database';

interface AnalyticsReportsViewProps {
  selectedDate: string;
}

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({ selectedDate }) => {
  const {
    leaders,
    departments,
    attendanceRecords,
    getMeetingForDate,
    generateEmailReportDraft,
    sendDailyWhatsappReport,
    downloadPdfReport,
    openPdfReport,
    downloadMonthlyPdfReport,
    downloadYearlyPdfReport,
  } = useDomApp();

  const [activeCadenceFilter, setActiveCadenceFilter] = useState<'ALL' | 'DOM' | 'WOM' | 'MOM' | 'YEARLY'>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // 1. Leader-wise Missed Meetings & Attendance Aggregation
  const leaderAnalytics = useMemo(() => {
    return leaders.map((lead) => {
      const records = attendanceRecords.filter((r) => {
        if (r.leader_id !== lead.id) return false;
        if (activeCadenceFilter === 'DOM') {
          return r.cadence === 'DOM' || r.meeting_frequency === 'DAILY';
        }
        if (activeCadenceFilter === 'WOM') {
          return r.cadence === 'WOM' || r.meeting_frequency === 'WEEKLY';
        }
        if (activeCadenceFilter === 'MOM') {
          return r.cadence === 'MOM' || r.meeting_frequency === 'MONTHLY';
        }
        return true;
      });

      const totalScheduled = records.length;
      const physicalCount = records.filter(
        (r) => r.selected_mode === 'PHYSICAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
      ).length;
      const virtualCount = records.filter(
        (r) => r.selected_mode === 'VIRTUAL' && r.status === 'PRESENT'
      ).length;
      const attendedCount = physicalCount + virtualCount;
      const approvedLeaveCount = records.filter((r) => r.status === 'LEAVE').length;
      const missedCount = records.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;

      const effectiveTotal = totalScheduled - approvedLeaveCount;
      const complianceRate =
        effectiveTotal > 0 ? Math.round((attendedCount / effectiveTotal) * 100) : totalScheduled > 0 ? 100 : 0;

      return {
        id: lead.id,
        name: lead.full_name,
        department: lead.department?.name || 'Department',
        code: lead.employee_code || 'SBH-00',
        phone: lead.phone,
        totalScheduled,
        attendedCount,
        physicalCount,
        virtualCount,
        approvedLeaveCount,
        missedCount,
        complianceRate,
      };
    });
  }, [leaders, attendanceRecords, activeCadenceFilter]);

  // Leaders sorted by missed meetings
  const sortedByMissed = useMemo(() => {
    return [...leaderAnalytics].sort((a, b) => b.missedCount - a.missedCount);
  }, [leaderAnalytics]);

  // Top Missed Chart Data
  const missedLeaderChartData = useMemo(() => {
    return sortedByMissed.slice(0, 8).map((item) => ({
      name: item.name.length > 14 ? `${item.name.slice(0, 12)}..` : item.name,
      Missed: item.missedCount,
      Attended: item.attendedCount,
      Leave: item.approvedLeaveCount,
    }));
  }, [sortedByMissed]);

  // Top Compliant Performers (100% or high compliance)
  const topPerformers = useMemo(() => {
    return [...leaderAnalytics]
      .filter((l) => l.complianceRate >= 90)
      .sort((a, b) => b.complianceRate - a.complianceRate || b.attendedCount - a.attendedCount);
  }, [leaderAnalytics]);

  // Chronic Absentees (missed > 0)
  const chronicAbsentees = useMemo(() => {
    return sortedByMissed.filter((l) => l.missedCount > 0);
  }, [sortedByMissed]);

  // Department-wise Attendance Compliance
  const departmentComplianceData = useMemo(() => {
    return departments.map((dept) => {
      const deptLeaders = leaders.filter((l) => l.department_id === dept.id);
      if (deptLeaders.length === 0) {
        return { name: dept.name, code: dept.code, count: 0, compliance: 100, attended: 0, missed: 0 };
      }
      const deptLeaderIds = new Set(deptLeaders.map((l) => l.id));
      const deptRecords = attendanceRecords.filter((r) => deptLeaderIds.has(r.leader_id));
      const attended = deptRecords.filter(
        (r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)
      ).length;
      const missed = deptRecords.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;
      const total = deptRecords.length;
      const compliance = total > 0 ? Math.round((attended / total) * 100) : 100;

      return {
        name: dept.name,
        code: dept.code,
        count: deptLeaders.length,
        compliance,
        attended,
        missed,
      };
    }).sort((a, b) => a.compliance - b.compliance);
  }, [departments, leaders, attendanceRecords]);

  // 12-Month Annual Breakdown Data for Chart
  const annualMonthlyChartData = useMemo(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthLabels.map((lbl, idx) => {
      const padM = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${padM}`;
      const recs = attendanceRecords.filter((r) => r.meeting_date?.startsWith(prefix));
      const attended = recs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;
      const missed = recs.filter((r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')).length;
      const total = recs.length;
      const compliance = total > 0 ? Math.round((attended / total) * 100) : 0;

      return {
        month: lbl,
        Total: total,
        Attended: attended,
        Missed: missed,
        ComplianceRate: compliance,
      };
    });
  }, [attendanceRecords, selectedYear]);

  // Email draft helper
  const emailDraft = useMemo(() => {
    return generateEmailReportDraft(selectedDate);
  }, [selectedDate, generateEmailReportDraft]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDraft.body);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const selectedMonthName = new Date(selectedDate).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Cadence Switcher & PDF Action Buttons */}
      <div className="fluent-card p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Operations Analytics & Absenteeism Intelligence</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  DOM • WOM • MOM • Annual Audit
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Visual attendance performance, missed meeting tracking, chronic absentees, and multi-tier PDF generation
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Cadence Filters (ALL, DOM, WOM, MOM, YEARLY) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs font-bold text-slate-600 shadow-xs">
            <button
              onClick={() => setActiveCadenceFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCadenceFilter === 'ALL' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCadenceFilter('DOM')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCadenceFilter === 'DOM' ? 'bg-orange-600 text-white shadow-xs' : 'hover:bg-slate-100'
              }`}
            >
              DOM (Daily)
            </button>
            <button
              onClick={() => setActiveCadenceFilter('WOM')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCadenceFilter === 'WOM' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'
              }`}
            >
              WOM (Weekly)
            </button>
            <button
              onClick={() => setActiveCadenceFilter('MOM')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCadenceFilter === 'MOM' ? 'bg-purple-600 text-white shadow-xs' : 'hover:bg-slate-100'
              }`}
            >
              MOM (Monthly)
            </button>
            <button
              onClick={() => setActiveCadenceFilter('YEARLY')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCadenceFilter === 'YEARLY' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100'
              }`}
            >
              Annual Audit
            </button>
          </div>

          {/* Download Daily DOM PDF */}
          <button
            onClick={() => downloadPdfReport(selectedDate)}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download Daily DOM Attendance PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Daily DOM PDF</span>
          </button>

          {/* Download Monthly MOM Audit PDF */}
          <button
            onClick={() => downloadMonthlyPdfReport(selectedMonthName)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download Monthly MOM Absenteeism Audit PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Monthly MOM PDF</span>
          </button>

          {/* Download Yearly Annual Audit PDF */}
          <button
            onClick={() => downloadYearlyPdfReport(selectedYear)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download Full Annual Hospital Audit PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Annual {selectedYear} PDF</span>
          </button>

          {/* Email Director Draft */}
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-orange-600" />
            <span>Email Report</span>
          </button>
        </div>
      </div>

      {/* 4 HIGH-IMPACT KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-orange-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Leaders
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{leaders.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Across 24 Hospital Departments</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-emerald-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Star Performers
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{topPerformers.length}</span>
            <span className="text-[11px] text-emerald-600 font-bold">&gt;= 90% Attendance Compliance</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-rose-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Absentee Count
            </span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{chronicAbsentees.length}</span>
            <span className="text-[11px] text-rose-500 font-medium">Missed 1 or more sessions</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-purple-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Cadence In Scope
            </span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">{activeCadenceFilter}</span>
            <span className="text-[11px] text-purple-600 font-medium">DOM • WOM • MOM Audit</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* GRAPH ROW 1: Leaders Missed vs Attended Bar Chart & Annual 12-Month Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: Leader-Wise Missed Meetings */}
        <div className="fluent-card p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Leader Missed Sessions vs Attended</span>
              </h3>
              <p className="text-xs text-slate-500">Visual comparison of absences vs active check-ins</p>
            </div>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
              Absence Tracking
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missedLeaderChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Attended" fill="#16a34a" radius={[4, 4, 0, 0]} name="Attended Sessions" />
                <Bar dataKey="Missed" fill="#e11d48" radius={[4, 4, 0, 0]} name="Missed / Absent" />
                <Bar dataKey="Leave" fill="#a855f7" radius={[4, 4, 0, 0]} name="Sanctioned Leave" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: Annual 12-Month Compliance & Total Logs */}
        <div className="fluent-card p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Annual 12-Month Hospital Attendance Trend ({selectedYear})</span>
              </h3>
              <p className="text-xs text-slate-500">Month-by-month attendance volume and compliance health</p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-xs cursor-pointer"
              >
                <option value={2026}>Year 2026</option>
                <option value={2025}>Year 2025</option>
                <option value={2027}>Year 2027</option>
              </select>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={annualMonthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorMissed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Attended" stroke="#16a34a" fillOpacity={1} fill="url(#colorAttended)" name="Attended Logs" />
                <Area type="monotone" dataKey="Missed" stroke="#ea580c" fillOpacity={1} fill="url(#colorMissed)" name="Absences" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 2: Star Performers (Top Compliant Leaders) */}
      <div className="fluent-card p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>⭐ Exemplary Attendance Leaders (&gt;= 90% Compliance)</span>
            </h3>
            <p className="text-xs text-slate-500">Department leaders with top compliance ratings</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
            {topPerformers.length} Star Leaders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-50/70 text-emerald-950 font-black border-b border-emerald-200">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Leader Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-center">Scheduled</th>
                <th className="py-2.5 px-3 text-center">In-Person</th>
                <th className="py-2.5 px-3 text-center">Virtual</th>
                <th className="py-2.5 px-3 text-center">Leave</th>
                <th className="py-2.5 px-3 text-center">Compliance</th>
                <th className="py-2.5 px-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topPerformers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400 font-medium">
                    No leader records yet for the active filter.
                  </td>
                </tr>
              ) : (
                topPerformers.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900 flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.complianceRate === 100 && (
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-md font-bold border border-amber-300">
                          100%
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{item.department}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.totalScheduled}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{item.physicalCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">{item.virtualCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-purple-600">{item.approvedLeaveCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700">
                      {item.complianceRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {item.complianceRate === 100 ? 'EXEMPLARY' : 'OUTSTANDING'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Chronic Absenteeism Audit Table */}
      <div className="fluent-card p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>⚠️ Chronic Absenteeism & Missed Meetings Audit</span>
            </h3>
            <p className="text-xs text-slate-500">
              Department leaders who missed DOM, WOM or MOM sessions without sanctioned leave
            </p>
          </div>
          <span className="text-xs bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full border border-rose-300">
            {chronicAbsentees.length} Absent Leaders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-rose-50/70 text-rose-950 font-black border-b border-rose-200">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Leader Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3 text-center">Scheduled</th>
                <th className="py-2.5 px-3 text-center">Attended</th>
                <th className="py-2.5 px-3 text-center text-rose-700 font-black">Missed Count</th>
                <th className="py-2.5 px-3 text-center">Compliance</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chronicAbsentees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-emerald-700 font-bold">
                    ✓ Nil — No chronic absenteeism recorded! All leaders are compliant.
                  </td>
                </tr>
              ) : (
                chronicAbsentees.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{item.department}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{item.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.totalScheduled}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{item.attendedCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-rose-600 bg-rose-50/60 rounded">
                      {item.missedCount} Days
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-800">
                      {item.complianceRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        {item.missedCount >= 5 ? 'CRITICAL ESCALATION' : 'NOTICE REQUIRED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: 24 Official Departments Compliance Table */}
      <div className="fluent-card p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-orange-600" />
              <span>Department Compliance Audit (All 24 Departments)</span>
            </h3>
            <p className="text-xs text-slate-500">Official department-wise compliance ranking</p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full border border-orange-300">
            24 Departments Master
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {departmentComplianceData.map((d) => (
            <div key={d.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{d.code}</span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      d.compliance >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : d.compliance >= 70
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {d.compliance}%
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900 mt-1 truncate" title={d.name}>
                  {d.name}
                </h4>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span>Leaders: <b>{d.count}</b></span>
                <span>Missed: <b className="text-rose-600">{d.missed}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Report Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-600" />
                <span>Formal Attendance Report Draft for Director Sir</span>
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Subject</span>
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 border border-slate-200">
                {emailDraft.subject}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Email Body Content</span>
              <textarea
                readOnly
                value={emailDraft.body}
                rows={8}
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 border border-slate-200 resize-none focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopyEmail}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNotice ? 'Copied to Clipboard!' : 'Copy Body'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={emailDraft.mailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Launch Mail App</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
