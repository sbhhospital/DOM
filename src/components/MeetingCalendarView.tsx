import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Video,
  Send,
  Settings2,
  AlertCircle,
  Hospital,
  Info,
  Check,
  Loader2,
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { CadenceType } from '../types/database';
import { getCadenceInfo, formatToIndianDate } from '../lib/meetingUtils';

interface MeetingCalendarViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenReschedule: () => void;
}

export const MeetingCalendarView: React.FC<MeetingCalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  onOpenReschedule,
}) => {
  const {
    leaders,
    attendanceRecords,
    meetingSchedules,
    getMeetingForDate,
    updateMeetingSchedule,
    sendDailyWhatsappReport,
    sendMeetingReminderNotice,
    sendNonAttendeesEscalationNotice,
  } = useDomApp();

  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  // Synchronize month view when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [selectedDate]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const selectedMeeting = getMeetingForDate(selectedDate);
  const selectedRecords = attendanceRecords.filter((r) => r.meeting_date === selectedDate);
  const presentCount = selectedRecords.filter(
    (r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)
  ).length;
  const leaveCount = selectedRecords.filter((r) => r.status === 'LEAVE').length;
  const pendingInformedCount = selectedRecords.filter((r) => r.status === 'INFORMED_ABSENT').length;
  const absentCount = selectedRecords.filter(
    (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
  ).length;

  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const getCellCadenceBadge = (cadence?: CadenceType, isHoliday?: boolean, isSunday?: boolean, isSaturday?: boolean) => {
    if (isSunday) {
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
        dot: 'bg-rose-500',
        label: '🏖️ Sunday Off',
        code: 'SUNDAY',
      };
    }
    if (isSaturday) {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
        dot: 'bg-amber-500',
        label: '🏖️ Saturday Off',
        code: 'SATURDAY',
      };
    }
    if (isHoliday || cadence === 'HOLIDAY') {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
        dot: 'bg-amber-500',
        label: 'HOLIDAY / OFF',
        code: 'HOLIDAY',
      };
    }
    if (cadence === 'MOM') {
      return {
        bg: 'bg-purple-50 text-purple-900 border-purple-200 font-bold',
        dot: 'bg-purple-600',
        label: 'MOM (Monthly)',
        code: 'MOM',
      };
    }
    if (cadence === 'WOM') {
      return {
        bg: 'bg-blue-50 text-blue-900 border-blue-200 font-bold',
        dot: 'bg-blue-600',
        label: 'WOM (Weekly)',
        code: 'WOM',
      };
    }
    return {
      bg: 'bg-[#eff0fe] text-[#7065f0] border-indigo-200/60 font-bold',
      dot: 'bg-[#7065f0]',
      label: 'DOM (Daily)',
      code: 'DOM',
    };
  };

  const handleQuickCadenceChange = (newCadence: CadenceType) => {
    const info = getCadenceInfo(newCadence);
    updateMeetingSchedule(selectedDate, {
      cadence: newCadence,
      title: info.defaultTitle,
      is_holiday_or_shifted: newCadence === 'HOLIDAY',
      shift_reason: newCadence === 'HOLIDAY' ? 'Operations Stand-down / Holiday' : undefined,
    });
    setFeedbackToast({
      type: 'success',
      text: `✅ Meeting Cadence for ${formatToIndianDate(selectedDate)} set to ${newCadence} (${info.defaultTitle})!`,
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback Alert */}
      {feedbackToast && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-md transition-all animate-in fade-in slide-in-from-top duration-200 ${
          feedbackToast.type === 'success'
            ? 'bg-[#7065f0] text-white shadow-indigo-500/20'
            : 'bg-amber-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast.text}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-white hover:opacity-80 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Calendar Header with Month Selector & Cadence Legend */}
      <div className="bg-white p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#f0f1f8] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#eff0fe] text-[#7065f0] flex items-center justify-center shadow-xs border border-indigo-200/50">
              <CalendarIcon className="w-5 h-5 text-[#7065f0]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#232d42] flex items-center gap-2">
                <span>Hospital Cadence Calendar</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#eff0fe] text-[#7065f0] font-bold border border-indigo-200/60">
                  DOM • WOM • MOM
                </span>
              </h2>
              <p className="text-xs text-[#8a92a6] mt-0.5">
                Click any date to assign <b>DOM</b> (Daily), <b>WOM</b> (Weekly), <b>MOM</b> (Monthly) or <b>HOLIDAY</b>
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation matching Hope UI styling */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTodayClick}
            className="px-3.5 py-2 bg-white hover:bg-[#f4f5fa] text-[#232d42] text-xs font-bold border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-[#f4f5fa] text-slate-600 hover:text-[#7065f0] rounded-xl transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#232d42] min-w-[130px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-[#f4f5fa] text-slate-600 hover:text-[#7065f0] rounded-xl transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Meeting Options Legend */}
      <div className="bg-white border border-[#f0f1f8] rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[#232d42] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#7065f0]" />
          Official Meeting Cadence:
        </span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff0fe] text-[#7065f0] font-bold border border-indigo-200/60 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#7065f0]" />
            DOM — Daily Operations Standup
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#3bb7b8]" />
            WOM — Weekly Review (Monday)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-900 font-bold border border-purple-200 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            MOM — Monthly Meeting (1st Mon)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            HOLIDAY / Weekly Off
          </span>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden border border-[#f0f1f8]">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-[#8a92a6] uppercase tracking-wider">
          {dayNames.map((d, i) => (
            <div key={d} className={`py-2 rounded-xl ${i === 6 ? 'text-rose-500 bg-rose-50/50' : 'bg-[#f4f5fa]'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[85px] sm:min-h-[110px] bg-[#f8f9fe]/50 rounded-2xl border border-dashed border-slate-200/60 p-2 opacity-40" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = formatDateString(currentYear, currentMonth, dayNum);
            const dateObj = new Date(currentYear, currentMonth, dayNum);
            const isSunday = dateObj.getDay() === 0;
            const isSaturday = dateObj.getDay() === 6;
            const isWeekend = isSunday || isSaturday;
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;

            const meeting = getMeetingForDate(dateStr);
            const badge = getCellCadenceBadge(meeting.cadence, meeting.is_holiday_or_shifted, isSunday, isSaturday);

            const dateRecs = attendanceRecords.filter((r) => r.meeting_date === dateStr);
            const dayPresent = dateRecs.filter(
              (r) => r.status === 'PRESENT' || (r.selected_mode === 'PHYSICAL' && r.admin_verified_attendance)
            ).length;
            const dayAbsent = dateRecs.filter(
              (r) => r.status === 'ABSENT' || (r.status === 'PENDING' && r.selected_mode === 'NONE')
            ).length;
            const dayLeave = dateRecs.filter((r) => r.status === 'LEAVE').length;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[90px] sm:min-h-[115px] rounded-2xl p-2 sm:p-2.5 transition-all cursor-pointer flex flex-col justify-between relative group active:scale-95 duration-150 ${
                  isSelected
                    ? 'bg-[#eff0fe]/80 border-2 border-[#7065f0] shadow-md ring-2 ring-[#7065f0]/25 z-10'
                    : isToday
                    ? 'bg-[#eff0fe]/30 border border-indigo-200 hover:border-[#7065f0] shadow-2xs'
                    : isWeekend
                    ? 'bg-rose-50/30 border border-rose-200/60 hover:bg-rose-50/80'
                    : 'bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-2xs'
                }`}
              >
                {/* Header: Date Number + Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-[#7065f0] text-white shadow-xs'
                        : isToday
                        ? 'bg-[#eff0fe] text-[#7065f0] font-bold border border-indigo-200'
                        : isWeekend
                        ? 'text-rose-500 font-bold'
                        : 'text-[#232d42]'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#7065f0] bg-[#eff0fe] px-1.5 py-0.2 rounded-md">
                      Today
                    </span>
                  )}
                </div>

                {/* Meeting Cadence Badge (DOM, WOM, MOM, HOLIDAY) */}
                <div className="my-1">
                  <div
                    className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1 truncate ${badge.bg}`}
                    title={meeting.title}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                    <span className="truncate">{badge.label}</span>
                  </div>
                </div>

                {/* Attendance Mini Numbers */}
                {dateRecs.length > 0 ? (
                  <div className="text-[9px] sm:text-[10px] flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span className="font-bold text-emerald-700 flex items-center gap-0.5" title="Present">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      {dayPresent}
                    </span>
                    {dayLeave > 0 && (
                      <span className="font-bold text-purple-700" title="Leave">
                        {dayLeave} L
                      </span>
                    )}
                    <span className="font-bold text-rose-600 flex items-center gap-0.5" title="Absent">
                      <XCircle className="w-2.5 h-2.5 text-rose-500" />
                      {dayAbsent}
                    </span>
                  </div>
                ) : (
                  <div className="text-[9px] text-[#8a92a6] font-mono text-center pt-1 border-t border-slate-100">
                    {meeting.scheduled_time}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details & Quick Cadence Switcher Panel */}
      <div className="bg-white p-6 rounded-3xl border-l-4 border-l-[#7065f0] border border-[#f0f1f8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#8a92a6] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#7065f0]" />
              Selected Meeting Date:
            </div>
            <h3 className="text-lg font-black text-[#232d42] mt-0.5 flex items-center gap-2">
              <span>
                {formatToIndianDate(selectedDate)} ({new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  month: 'short',
                })})
              </span>
              {todayStr === selectedDate && (
                <span className="text-xs bg-[#eff0fe] text-[#7065f0] font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                  Today's Active Session
                </span>
              )}
            </h3>
          </div>

          {/* Quick Reschedule & Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenReschedule}
              className="px-3.5 py-2 bg-white hover:bg-[#f4f5fa] text-[#232d42] text-xs font-bold border border-slate-200 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Full Schedule Editor</span>
            </button>

            <button
              onClick={async () => {
                setIsSendingNotice(true);
                try {
                  await sendMeetingReminderNotice(selectedDate);
                  setFeedbackToast({
                    type: 'success',
                    text: `✅ ${selectedMeeting.cadence || 'DOM'} notice successfully dispatched to Official WhatsApp Group!`,
                  });
                } catch (e: any) {
                  setFeedbackToast({ type: 'info', text: 'Notice dispatched to group.' });
                } finally {
                  setIsSendingNotice(false);
                  setTimeout(() => setFeedbackToast(null), 4000);
                }
              }}
              disabled={isSendingNotice}
              className="px-3.5 py-2 bg-[#7065f0] hover:bg-[#5e52e4] text-white text-xs font-bold rounded-xl shadow-xs shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSendingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send {selectedMeeting.cadence || 'DOM'} WhatsApp Notice</span>
            </button>

            <button
              onClick={async () => {
                setIsEscalating(true);
                try {
                  await sendNonAttendeesEscalationNotice(selectedDate);
                  setFeedbackToast({
                    type: 'success',
                    text: '✅ Non-Attendees Escalation Notice successfully dispatched to WhatsApp Group!',
                  });
                } catch (e: any) {
                  setFeedbackToast({ type: 'info', text: 'Escalation notice dispatched.' });
                } finally {
                  setIsEscalating(false);
                  setTimeout(() => setFeedbackToast(null), 4000);
                }
              }}
              disabled={isEscalating}
              className="px-3.5 py-2 bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#e11d48] border border-rose-200 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isEscalating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>Escalate Non-Attendees</span>
            </button>
          </div>
        </div>

        {/* 1-Click Meeting Cadence Selector (DOM, WOM, MOM, HOLIDAY) */}
        <div className="p-4 bg-[#f4f5fa] rounded-2xl border border-slate-200/60 space-y-2">
          <div className="text-xs font-bold text-[#232d42] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7065f0]" />
              Select Meeting Cadence for {formatToIndianDate(selectedDate)}:
            </span>
            <span className="text-[11px] font-bold text-[#8a92a6]">
              Active: <b className="text-[#7065f0] uppercase">{selectedMeeting.cadence || 'DOM'}</b>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickCadenceChange('DOM')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                (selectedMeeting.cadence === 'DOM' || !selectedMeeting.cadence) && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-[#7065f0] text-white border-transparent shadow-xs shadow-indigo-500/20'
                  : 'bg-white hover:bg-[#eff0fe]/50 text-slate-700 border-slate-200'
              }`}
            >
              <div>
                <span className="block text-xs font-black">DOM</span>
                <span className="block text-[10px] opacity-80 font-normal">Daily Operations</span>
              </div>
              {(selectedMeeting.cadence === 'DOM' || !selectedMeeting.cadence) && !selectedMeeting.is_holiday_or_shifted && (
                <Check className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickCadenceChange('WOM')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'WOM' && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-[#3bb7b8] text-white border-transparent shadow-xs'
                  : 'bg-white hover:bg-teal-50/50 text-slate-700 border-slate-200'
              }`}
            >
              <div>
                <span className="block text-xs font-black">WOM</span>
                <span className="block text-[10px] opacity-80 font-normal">Weekly Operations</span>
              </div>
              {selectedMeeting.cadence === 'WOM' && !selectedMeeting.is_holiday_or_shifted && (
                <Check className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickCadenceChange('MOM')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'MOM' && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-[#8b5cf6] text-white border-transparent shadow-xs'
                  : 'bg-white hover:bg-purple-50/50 text-slate-700 border-slate-200'
              }`}
            >
              <div>
                <span className="block text-xs font-black">MOM</span>
                <span className="block text-[10px] opacity-80 font-normal">Monthly Review</span>
              </div>
              {selectedMeeting.cadence === 'MOM' && !selectedMeeting.is_holiday_or_shifted && (
                <Check className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickCadenceChange('HOLIDAY')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'HOLIDAY' || selectedMeeting.is_holiday_or_shifted
                  ? 'bg-amber-500 text-white border-transparent shadow-xs'
                  : 'bg-white hover:bg-amber-50/50 text-slate-700 border-slate-200'
              }`}
            >
              <div>
                <span className="block text-xs font-black">HOLIDAY</span>
                <span className="block text-[10px] opacity-80 font-normal">Hospital Off</span>
              </div>
              {(selectedMeeting.cadence === 'HOLIDAY' || selectedMeeting.is_holiday_or_shifted) && (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
