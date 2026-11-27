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
  Search,
  Share2,
  RefreshCw,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDomApp } from '../context/DomAppContext';
import { Leader, AttendanceRecord } from '../types/database';

interface AnalyticsReportsViewProps {
  selectedDate: string;
}

type TimeframeMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({ selectedDate: initialDate }) => {
  const {
    leaders,
    departments,
    attendanceRecords,
    getMeetingForDate,
    generateEmailReportDraft,
    downloadPdfReport,
    downloadWeeklyPdfReport,
    downloadMonthlyPdfReport,
    downloadYearlyPdfReport,
    sendDirectorPdfToWhatsappGroup,
    sendWeeklyPdfToWhatsappGroup,
    sendMonthlyPdfToWhatsappGroup,
    sendYearlyPdfToWhatsappGroup,
    effectiveWhatsappGroup,
    isTestMode,
  } = useDomApp();

  // Mode and Date States
  const [timeframe, setTimeframe] = useState<TimeframeMode>('MONTHLY');
  const [targetDate, setTargetDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeCadenceFilter, setActiveCadenceFilter] = useState<'ALL' | 'DOM' | 'WOM' | 'MOM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // WhatsApp Group Sharing State
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Month string for monthly report
  const selectedMonthStr = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth, selectedYear]);

  // Week calculation from targetDate
  const currentWeekInfo = useMemo(() => {
    const curr = new Date(targetDate);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const mStr = monday.toISOString().split('T')[0];
    const sStr = saturday.toISOString().split('T')[0];
    const label = `${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${saturday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    return { startStr: mStr, endStr: sStr, label };
  }, [targetDate]);

  // Filter records based on active timeframe
  const scopedRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const recDate = r.meeting_date;
      if (!recDate) return false;

      if (timeframe === 'DAILY') {
        return recDate === targetDate;
      }
      if (timeframe === 'WEEKLY') {
        return recDate >= currentWeekInfo.startStr && recDate <= currentWeekInfo.endStr;
      }
      if (timeframe === 'MONTHLY') {
        const padM = String(selectedMonth).padStart(2, '0');
        const prefix = `${selectedYear}-${padM}`;
        return recDate.startsWith(prefix);
      }
      if (timeframe === 'YEARLY') {
        return recDate.startsWith(`${selectedYear}-`);
      }
      return true;
    });
  }, [attendanceRecords, timeframe, targetDate, currentWeekInfo, selectedMonth, selectedYear]);

  // Compute master leader-wise analytics across DOM, WOM, MOM
  const leaderAnalytics = useMemo(() => {
    return leaders.map((lead) => {
      const records = scopedRecords.filter((r) => {
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
        (r) => r.selected_mode === 'VIRTUAL' && (r.status === 'PRESENT' || r.admin_verified_attendance)
      ).length;
      const attendedCount = physicalCount + virtualCount;

      // Late count (marked as INFORMED_LATE or late_minutes > 0)
      const lateCount = records.filter(
        (r) =>
          r.status === 'INFORMED_LATE' ||
          (r.late_minutes && r.late_minutes > 0)
      ).length;

      const approvedLeaveCount = records.filter((r) => r.status === 'LEAVE').length;
      const missedCount = records.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;

      // Cadence Breakdown: DOM
      const domRecs = scopedRecords.filter(
        (r) => r.leader_id === lead.id && (r.cadence === 'DOM' || r.meeting_frequency === 'DAILY')
      );
      const domSched = domRecs.length;
      const domAtt = domRecs.filter(
        (r) => r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.admin_verified_attendance
      ).length;
      const domMissed = domRecs.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;

      // Cadence Breakdown: WOM
      const womRecs = scopedRecords.filter(
        (r) => r.leader_id === lead.id && (r.cadence === 'WOM' || r.meeting_frequency === 'WEEKLY')
      );
      const womSched = womRecs.length;
      const womAtt = womRecs.filter(
        (r) => r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.admin_verified_attendance
      ).length;
      const womMissed = womRecs.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;

      // Cadence Breakdown: MOM
      const momRecs = scopedRecords.filter(
        (r) => r.leader_id === lead.id && (r.cadence === 'MOM' || r.meeting_frequency === 'MONTHLY')
      );
      const momSched = momRecs.length;
      const momAtt = momRecs.filter(
        (r) => r.status === 'PRESENT' || r.status === 'INFORMED_LATE' || r.admin_verified_attendance
      ).length;
      const momMissed = momRecs.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;

      const effectiveTotal = totalScheduled - approvedLeaveCount;
      const complianceRate =
        effectiveTotal > 0
          ? Math.round((attendedCount / effectiveTotal) * 100)
          : totalScheduled > 0
          ? 100
          : 0;

      // Audit status badge
      let rating = 'COMPLIANT';
      if (complianceRate >= 95) rating = 'EXEMPLARY';
      else if (complianceRate >= 80) rating = 'GOOD';
      else if (complianceRate >= 60) rating = 'NEEDS IMPROVEMENT';
      else if (totalScheduled > 0) rating = 'CRITICAL ESCALATION';

      return {
        id: lead.id,
        name: lead.full_name,
        department: lead.department?.name || 'Hospital Department',
        code: lead.employee_code || 'SBH-00',
        phone: lead.phone,
        totalScheduled,
        attendedCount,
        physicalCount,
        virtualCount,
        lateCount,
        approvedLeaveCount,
        missedCount,
        domSched,
        domAtt,
        domMissed,
        womSched,
        womAtt,
        womMissed,
        momSched,
        momAtt,
        momMissed,
        complianceRate,
        rating,
      };
    });
  }, [leaders, scopedRecords, activeCadenceFilter]);

  // Filtered leaders for search
  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return leaderAnalytics;
    const q = searchQuery.toLowerCase();
    return leaderAnalytics.filter(
      (l) => l.name.toLowerCase().includes(q) || l.department.toLowerCase().includes(q)
    );
  }, [leaderAnalytics, searchQuery]);

  // Overall KPI metrics
  const totalAttended = leaderAnalytics.reduce((acc, curr) => acc + curr.attendedCount, 0);
  const totalMissed = leaderAnalytics.reduce((acc, curr) => acc + curr.missedCount, 0);
  const totalLate = leaderAnalytics.reduce((acc, curr) => acc + curr.lateCount, 0);
  const totalScheduledSum = leaderAnalytics.reduce((acc, curr) => acc + curr.totalScheduled, 0);
  const overallAvgCompliance =
    totalScheduledSum > 0 ? Math.round((totalAttended / totalScheduledSum) * 100) : 100;

  // Chart 1: Top 10 Leaders Attendance Distribution
  const leaderBarChartData = useMemo(() => {
    return [...leaderAnalytics]
      .sort((a, b) => b.totalScheduled - a.totalScheduled || b.missedCount - a.missedCount)
      .slice(0, 10)
      .map((item) => ({
        name: item.name.length > 13 ? `${item.name.slice(0, 11)}..` : item.name,
        Attended: item.attendedCount,
        Late: item.lateCount,
        Missed: item.missedCount,
        Leave: item.approvedLeaveCount,
      }));
  }, [leaderAnalytics]);

  // Chart 2: Cadence Aggregates (DOM vs WOM vs MOM)
  const cadenceChartData = useMemo(() => {
    const domTotalSched = leaderAnalytics.reduce((acc, l) => acc + l.domSched, 0);
    const domTotalAtt = leaderAnalytics.reduce((acc, l) => acc + l.domAtt, 0);
    const domTotalMissed = leaderAnalytics.reduce((acc, l) => acc + l.domMissed, 0);

    const womTotalSched = leaderAnalytics.reduce((acc, l) => acc + l.womSched, 0);
    const womTotalAtt = leaderAnalytics.reduce((acc, l) => acc + l.womAtt, 0);
    const womTotalMissed = leaderAnalytics.reduce((acc, l) => acc + l.womMissed, 0);

    const momTotalSched = leaderAnalytics.reduce((acc, l) => acc + l.momSched, 0);
    const momTotalAtt = leaderAnalytics.reduce((acc, l) => acc + l.momAtt, 0);
    const momTotalMissed = leaderAnalytics.reduce((acc, l) => acc + l.momMissed, 0);

    return [
      { name: 'DOM (Daily)', Scheduled: domTotalSched, Attended: domTotalAtt, Missed: domTotalMissed },
      { name: 'WOM (Weekly)', Scheduled: womTotalSched, Attended: womTotalAtt, Missed: womTotalMissed },
      { name: 'MOM (Monthly)', Scheduled: momTotalSched, Attended: momTotalAtt, Missed: momTotalMissed },
    ];
  }, [leaderAnalytics]);

  // Annual 12-Month Breakdown for yearly/monthly context
  const annualMonthlyChartData = useMemo(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthLabels.map((lbl, idx) => {
      const padM = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${padM}`;
      const recs = attendanceRecords.filter((r) => r.meeting_date?.startsWith(prefix));
      const attended = recs.filter((r) => r.status === 'PRESENT' || r.admin_verified_attendance).length;
      const missed = recs.filter(
        (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
      ).length;
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

  // 24 Departments breakdown
  const departmentComplianceData = useMemo(() => {
    return departments
      .map((dept) => {
        const deptLeaders = leaders.filter((l) => l.department_id === dept.id);
        if (deptLeaders.length === 0) {
          return { name: dept.name, code: dept.code, count: 0, compliance: 100, attended: 0, missed: 0 };
        }
        const deptLeaderIds = new Set(deptLeaders.map((l) => l.id));
        const deptRecords = scopedRecords.filter((r) => deptLeaderIds.has(r.leader_id));
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
      })
      .sort((a, b) => a.compliance - b.compliance);
  }, [departments, leaders, scopedRecords]);

  // Download Handler according to active timeframe
  const handleDownloadPdf = () => {
    if (timeframe === 'DAILY') {
      downloadPdfReport(targetDate);
    } else if (timeframe === 'WEEKLY') {
      downloadWeeklyPdfReport(currentWeekInfo.label);
    } else if (timeframe === 'MONTHLY') {
      downloadMonthlyPdfReport(selectedMonthStr);
    } else if (timeframe === 'YEARLY') {
      downloadYearlyPdfReport(selectedYear);
    }
  };

  // WhatsApp Group Dispatch Handler with feedback
  const handleSendPdfToGroup = async () => {
    setIsSharingPdf(true);
    setShareFeedback(null);
    try {
      let res: { success: boolean; message: string };
      if (timeframe === 'DAILY') {
        res = await sendDirectorPdfToWhatsappGroup(targetDate);
      } else if (timeframe === 'WEEKLY') {
        res = await sendWeeklyPdfToWhatsappGroup(currentWeekInfo.label);
      } else if (timeframe === 'MONTHLY') {
        res = await sendMonthlyPdfToWhatsappGroup(selectedMonthStr);
      } else {
        res = await sendYearlyPdfToWhatsappGroup(selectedYear);
      }
      setShareFeedback(res);
    } catch (err: any) {
      setShareFeedback({ success: false, message: err?.message || 'Transmission failed.' });
    } finally {
      setIsSharingPdf(false);
      setTimeout(() => setShareFeedback(null), 8000);
    }
  };

  // Email draft
  const emailDraft = useMemo(() => {
    return generateEmailReportDraft(targetDate);
  }, [targetDate, generateEmailReportDraft]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDraft.body);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER COMMAND CARD WITH TIMEFRAME TABS & PDF CONTROLS */}
      <div className="fluent-card p-6 rounded-3xl space-y-4 border border-slate-200/80 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Executive Attendance Analytics & Roster Audits</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  DOM • WOM • MOM
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Daily standup, weekly operations, monthly executive audits, and annual hospital compliance
              </p>
            </div>
          </div>

          {/* Timeframe Scope Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shadow-inner">
            <button
              onClick={() => setTimeframe('DAILY')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'DAILY'
                  ? 'bg-white text-orange-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Daily
            </button>
            <button
              onClick={() => setTimeframe('WEEKLY')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'WEEKLY'
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📆 Weekly
            </button>
            <button
              onClick={() => setTimeframe('MONTHLY')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'MONTHLY'
                  ? 'bg-white text-purple-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Monthly
            </button>
            <button
              onClick={() => setTimeframe('YEARLY')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === 'YEARLY'
                  ? 'bg-white text-emerald-600 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Annual Audit
            </button>
          </div>
        </div>

        {/* Dynamic Context Filters Bar & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dynamic Filter Controls depending on Timeframe */}
            {timeframe === 'DAILY' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-bold text-slate-700">Date:</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="font-mono font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>
            )}

            {timeframe === 'WEEKLY' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-700">Week:</span>
                <span className="font-bold text-blue-700">{currentWeekInfo.label}</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="font-mono text-xs text-slate-500 focus:outline-hidden cursor-pointer ml-2 border-l pl-2"
                  title="Pick any date in the week"
                />
              </div>
            )}

            {timeframe === 'MONTHLY' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-bold text-slate-700">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="font-bold text-slate-900 focus:outline-hidden cursor-pointer border-l pl-2"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            )}

            {timeframe === 'YEARLY' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-700">Audit Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            )}

            {/* Cadence Sub-Filter */}
            <div className="flex items-center bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs font-bold text-slate-600">
              <span className="text-[10px] text-slate-400 uppercase mr-1.5">Cadence:</span>
              {(['ALL', 'DOM', 'WOM', 'MOM'] as const).map((cad) => (
                <button
                  key={cad}
                  onClick={() => setActiveCadenceFilter(cad)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                    activeCadenceFilter === cad
                      ? 'bg-slate-900 text-white font-bold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {cad}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Download PDF & Send to WhatsApp Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title={`Download official ${timeframe} PDF report with watermark`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download {timeframe} PDF</span>
            </button>

            <button
              onClick={handleSendPdfToGroup}
              disabled={isSharingPdf}
              className={`px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSharingPdf ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              title={`Directly send official ${timeframe} PDF to WhatsApp Group`}
            >
              {isSharingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSharingPdf ? 'Transmitting PDF...' : `Send ${timeframe} PDF to Group`}</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Draft formal email to Director"
            >
              <Mail className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Director Email</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert for WhatsApp Group Dispatch */}
        {shareFeedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border ${
              shareFeedback.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {shareFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{shareFeedback.message}</span>
            </div>
            <span className="text-[10px] font-mono opacity-70">
              Target: {effectiveWhatsappGroup.slice(0, 15)}...
            </span>
          </div>
        )}
      </div>

      {/* 4 HIGH-IMPACT KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-blue-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Leaders
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{leaders.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Across 24 Departments</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-emerald-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Scope Attendance Rate
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{overallAvgCompliance}%</span>
            <span className="text-[11px] text-emerald-600 font-bold">
              {totalAttended} of {totalScheduledSum} logs attended
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-amber-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Late Arrivals (&gt; 10:05 AM)
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{totalLate}</span>
            <span className="text-[11px] text-amber-600 font-medium">Accepted with Late Reason</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="fluent-card p-5 rounded-3xl border-t-4 border-t-rose-500 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Unexcused Absences
            </span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{totalMissed}</span>
            <span className="text-[11px] text-rose-500 font-medium">Zero Prior Intimation</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* GRAPH ROW: Attendance Distribution & Cadence Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: Leader Attendance Distribution */}
        <div className="fluent-card p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span>Attendance Status Breakdown (Top 10 Leaders)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Attended vs Late vs Absent vs Approved Leave in {timeframe} scope
              </p>
            </div>
            <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
              Roster Distribution
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderBarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
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
                <Bar dataKey="Attended" fill="#16a34a" radius={[4, 4, 0, 0]} name="Attended (On-Time)" />
                <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late Arrival" />
                <Bar dataKey="Missed" fill="#e11d48" radius={[4, 4, 0, 0]} name="Absent" />
                <Bar dataKey="Leave" fill="#a855f7" radius={[4, 4, 0, 0]} name="Leave" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: DOM vs WOM vs MOM Cadence Comparison */}
        <div className="fluent-card p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Meeting Cadence Breakdown (DOM • WOM • MOM)</span>
              </h3>
              <p className="text-xs text-slate-500">Scheduled vs Attended vs Missed by Meeting Tier</p>
            </div>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
              Cadence Health
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cadenceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
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
                <Bar dataKey="Scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Scheduled" />
                <Bar dataKey="Attended" fill="#10b981" radius={[4, 4, 0, 0]} name="Attended" />
                <Bar dataKey="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Missed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MASTER LEADER ATTENDANCE ROSTER TABLE */}
      <div className="fluent-card p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                Master Leader Attendance & Absenteeism Roster (
                {timeframe === 'DAILY'
                  ? targetDate
                  : timeframe === 'WEEKLY'
                  ? currentWeekInfo.label
                  : timeframe === 'MONTHLY'
                  ? selectedMonthStr
                  : `Year ${selectedYear}`}
                )
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Detailed tracking: Total scheduled, Attended, Late (&gt;10:05), Absent, and DOM/WOM/MOM breakdown
            </p>
          </div>

          {/* Table Search Input */}
          <div className="flex items-center gap-2 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leader or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-800 font-black border-b border-slate-200">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Leader Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-2 text-center" title="Total Scheduled Meetings">
                  Sched
                </th>
                <th className="py-3 px-2 text-center text-emerald-700" title="Attended (On-Time)">
                  Attended
                </th>
                <th className="py-3 px-2 text-center text-amber-700" title="Late Arrival (>10:05 AM)">
                  Late
                </th>
                <th className="py-3 px-2 text-center text-rose-700" title="Unexcused Absence">
                  Absent
                </th>
                <th className="py-3 px-2 text-center text-purple-700" title="Sanctioned Leave">
                  Leave
                </th>
                <th className="py-3 px-2 text-center bg-orange-50/50" title="DOM Daily: Attended / Scheduled">
                  DOM (Att/Tot)
                </th>
                <th className="py-3 px-2 text-center bg-blue-50/50" title="WOM Weekly: Attended / Scheduled">
                  WOM (Att/Tot)
                </th>
                <th className="py-3 px-2 text-center bg-purple-50/50" title="MOM Monthly: Attended / Scheduled">
                  MOM (Att/Tot)
                </th>
                <th className="py-3 px-3 text-center">Compliance</th>
                <th className="py-3 px-3 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400 font-medium">
                    No leader attendance records found for this period.
                  </td>
                </tr>
              ) : (
                filteredLeaders.map((lead, idx) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">
                      <div>{lead.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{lead.phone || lead.code}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{lead.department}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                      {lead.totalScheduled}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-700">
                      {lead.attendedCount}
                      <span className="text-[9px] text-slate-400 font-normal block">
                        ({lead.physicalCount}P / {lead.virtualCount}V)
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-600">
                      {lead.lateCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {lead.lateCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600">
                      {lead.missedCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          {lead.missedCount}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-purple-600">
                      {lead.approvedLeaveCount || '—'}
                    </td>
                    {/* Cadence breakdowns */}
                    <td className="py-2.5 px-2 text-center font-mono text-xs bg-orange-50/30">
                      <span className="font-bold text-slate-800">{lead.domAtt}</span>
                      <span className="text-slate-400">/{lead.domSched}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-xs bg-blue-50/30">
                      <span className="font-bold text-slate-800">{lead.womAtt}</span>
                      <span className="text-slate-400">/{lead.womSched}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-xs bg-purple-50/30">
                      <span className="font-bold text-slate-800">{lead.momAtt}</span>
                      <span className="text-slate-400">/{lead.momSched}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          lead.complianceRate >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.complianceRate >= 70
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {lead.complianceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          lead.rating === 'EXEMPLARY'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : lead.rating === 'GOOD'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : lead.rating === 'NEEDS IMPROVEMENT'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {lead.rating}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 24 OFFICIAL DEPARTMENTS COMPLIANCE AUDIT */}
      <div className="fluent-card p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-orange-600" />
              <span>Department Attendance Compliance (All 24 Departments)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Departmental compliance health for the active {timeframe} window
            </p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full border border-orange-300">
            24 Departments Master
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {departmentComplianceData.map((d) => (
            <div
              key={d.name}
              className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between"
            >
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
                <span>
                  Leaders: <b>{d.count}</b>
                </span>
                <span>
                  Missed: <b className="text-rose-600">{d.missed}</b>
                </span>
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
