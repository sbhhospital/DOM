import React, { useState } from 'react';
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
} from 'lucide-react';
import { useDomApp } from '../context/DomAppContext';
import { CadenceType } from '../types/database';
import { getCadenceInfo } from '../lib/meetingUtils';

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
    getMeetingForDate,
    updateMeetingSchedule,
    sendDailyWhatsappReport,
    sendMeetingReminderNotice,
    sendNonAttendeesEscalationNotice,
  } = useDomApp();

  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

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

  const getCellCadenceBadge = (cadence?: CadenceType, isHoliday?: boolean) => {
    if (isHoliday || cadence === 'HOLIDAY') {
      return {
        bg: 'bg-amber-100/90 text-amber-900 border-amber-300 font-bold',
        dot: 'bg-amber-500',
        label: 'HOLIDAY / OFF',
        code: 'HOLIDAY',
      };
    }
    if (cadence === 'MOM') {
      return {
        bg: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
        dot: 'bg-purple-600',
        label: 'MOM (Monthly)',
        code: 'MOM',
      };
    }
    if (cadence === 'WOM') {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
        dot: 'bg-blue-600',
        label: 'WOM (Weekly)',
        code: 'WOM',
      };
    }
    return {
      bg: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
      dot: 'bg-orange-600',
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
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header with Month Selector & Cadence Legend */}
      <div className="fluent-card p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Hospital Meeting Cadence Calendar</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold border border-orange-300">
                  DOM • WOM • MOM
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Click any date to assign <b>DOM</b> (Daily), <b>WOM</b> (Weekly), <b>MOM</b> (Monthly) or <b>HOLIDAY</b>
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTodayClick}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[130px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Meeting Options Legend */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Official Meeting Cadence:
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 font-black border border-orange-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            DOM — Daily Operations Meeting
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-black border border-blue-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            WOM — Weekly Operations Meeting (Every Monday)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-black border border-purple-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            MOM — Monthly Operations Meeting (1st Monday)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            HOLIDAY / Off-Day
          </span>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="fluent-card rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
          {dayNames.map((d, i) => (
            <div key={d} className={`py-2 rounded-xl ${i === 6 ? 'text-rose-500 bg-rose-50/50' : 'bg-slate-50'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[90px] sm:min-h-[115px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60 p-2 opacity-40" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = formatDateString(currentYear, currentMonth, dayNum);
            const dateObj = new Date(currentYear, currentMonth, dayNum);
            const isSunday = dateObj.getDay() === 0;
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;

            const meeting = getMeetingForDate(dateStr);
            const badge = getCellCadenceBadge(meeting.cadence, meeting.is_holiday_or_shifted);

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
                className={`min-h-[95px] sm:min-h-[120px] rounded-2xl p-2 sm:p-2.5 transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border-2 border-orange-500 shadow-md ring-2 ring-orange-400/20 z-10'
                    : isToday
                    ? 'bg-emerald-50/40 border border-emerald-400 hover:border-emerald-500 shadow-xs'
                    : isSunday
                    ? 'bg-slate-50/60 border border-slate-200/80 hover:bg-slate-100/80'
                    : 'bg-white border border-slate-200/90 hover:border-orange-300 hover:shadow-xs'
                }`}
              >
                {/* Header: Date Number + Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isToday
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isSelected
                        ? 'bg-orange-600 text-white shadow-xs'
                        : isSunday
                        ? 'text-rose-500 font-bold'
                        : 'text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
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
                  <div className="text-[9px] text-slate-400 font-mono text-center pt-1 border-t border-slate-100">
                    {meeting.scheduled_time}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details & Quick Cadence Switcher Panel */}
      <div className="fluent-card p-6 rounded-3xl border-l-4 border-l-orange-500 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-orange-600" />
              Selected Meeting Date:
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
              <span>
                {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {todayStr === selectedDate && (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Today's Active Session
                </span>
              )}
            </h3>
          </div>

          {/* Quick Reschedule & Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenReschedule}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Full Schedule Editor</span>
            </button>

            <button
              onClick={() => sendMeetingReminderNotice(selectedDate)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send {selectedMeeting.cadence || 'DOM'} WhatsApp Notice</span>
            </button>

            <button
              onClick={() => sendNonAttendeesEscalationNotice(selectedDate)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Escalate Non-Attendees</span>
            </button>
          </div>
        </div>

        {/* 1-Click Meeting Cadence Selector (DOM, WOM, MOM, HOLIDAY) */}
        <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2">
          <div className="text-xs font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Select Meeting Cadence for {selectedDate}:
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Active: <b className="text-orange-700 uppercase">{selectedMeeting.cadence || 'DOM'}</b>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickCadenceChange('DOM')}
              className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                (selectedMeeting.cadence === 'DOM' || !selectedMeeting.cadence) && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                  : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-300'
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
              className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'WOM' && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
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
              className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'MOM' && !selectedMeeting.is_holiday_or_shifted
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-300'
              }`}
            >
              <div>
                <span className="block text-xs font-black">MOM</span>
                <span className="block text-[10px] opacity-80 font-normal">Monthly Operations</span>
              </div>
              {selectedMeeting.cadence === 'MOM' && !selectedMeeting.is_holiday_or_shifted && (
                <Check className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickCadenceChange('HOLIDAY')}
              className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer ${
                selectedMeeting.cadence === 'HOLIDAY' || selectedMeeting.is_holiday_or_shifted
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                  : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
              }`}
            >
              <div>
                <span className="block text-xs font-black">HOLIDAY / OFF</span>
                <span className="block text-[10px] opacity-80 font-normal">Hospital Stand-down</span>
              </div>
              {(selectedMeeting.cadence === 'HOLIDAY' || selectedMeeting.is_holiday_or_shifted) && (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Action Bar: Direct Remove DOM / Restore DOM */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 mt-1 border-t border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {selectedMeeting.is_holiday_or_shifted || selectedMeeting.cadence === 'HOLIDAY'
                  ? '🛑 DOM Standup is currently REMOVED / CANCELLED for this date.'
                  : 'DOM Standup is currently ACTIVE for this date.'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {selectedMeeting.is_holiday_or_shifted || selectedMeeting.cadence === 'HOLIDAY'
                  ? 'Leaders are not scheduled today and zero absentees are counted in the hospital audit.'
                  : 'Click "Remove DOM" to cancel today\'s standup without penalizing leaders as absent.'}
              </span>
            </div>

            {selectedMeeting.is_holiday_or_shifted || selectedMeeting.cadence === 'HOLIDAY' ? (
              <button
                type="button"
                onClick={() => handleQuickCadenceChange('DOM')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Re-instate / Enable DOM</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  updateMeetingSchedule(selectedDate, {
                    cadence: 'HOLIDAY',
                    title: 'NO DOM — Standup Removed by Admin',
                    is_holiday_or_shifted: true,
                    shift_reason: 'DOM Removed by Admin',
                  });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Remove DOM for this date (No leaders will be counted as absent)"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Remove DOM (No Standup)</span>
              </button>
            )}
          </div>
        </div>

        {/* Meeting Details Box */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[11px] text-slate-500 font-bold block">Meeting Title</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">{selectedMeeting.title}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-bold block">Active Cadence</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {selectedMeeting.cadence === 'MOM' && '🟣 MOM — Monthly Operations Meeting (1st Monday)'}
              {selectedMeeting.cadence === 'WOM' && '🔵 WOM — Weekly Operations Meeting (Weekly Review)'}
              {(selectedMeeting.cadence === 'DOM' || !selectedMeeting.cadence) && '🟠 DOM — Daily Operations Meeting'}
              {selectedMeeting.cadence === 'HOLIDAY' && '🟡 HOLIDAY — Operations Off'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-bold block">Scheduled Time</span>
            <span className="text-xs font-mono font-bold text-orange-600 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {selectedMeeting.scheduled_time}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-bold block">Google Meet URL</span>
            <a
              href={selectedMeeting.google_meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-bold text-blue-600 hover:underline mt-0.5 block truncate flex items-center gap-1"
            >
              <Video className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{selectedMeeting.google_meet_url}</span>
            </a>
          </div>
        </div>

        {/* Selected Date Attendance Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
            <span className="text-[11px] font-bold text-emerald-800 block">Present (Verified)</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{presentCount}</span>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl text-center">
            <span className="text-[11px] font-bold text-purple-800 block">Sanctioned Leave</span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">{leaveCount}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
            <span className="text-[11px] font-bold text-amber-800 block">Pending Admin Notice</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">{pendingInformedCount}</span>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-center">
            <span className="text-[11px] font-bold text-rose-800 block">Unexcused Missed</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">{absentCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
