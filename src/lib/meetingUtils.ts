import { MeetingFrequency, CadenceType } from '../types/database';

export interface CadenceInfo {
  cadence: CadenceType;
  frequency: MeetingFrequency;
  code: 'DOM' | 'WOM' | 'MOM' | 'HOLIDAY';
  shortLabel: string;
  defaultTitle: string;
  badgeClass: string;
  tagColor: string;
  description: string;
}

export function getCadenceInfo(cadence: CadenceType): CadenceInfo {
  switch (cadence) {
    case 'MOM':
      return {
        cadence: 'MOM',
        frequency: 'MONTHLY',
        code: 'MOM',
        shortLabel: 'MOM',
        defaultTitle: 'MOM — Monthly Operations Meeting (1st Monday)',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        tagColor: '#9333ea',
        description: 'Monthly Strategic Operations Session & HOD Review',
      };
    case 'WOM':
      return {
        cadence: 'WOM',
        frequency: 'WEEKLY',
        code: 'WOM',
        shortLabel: 'WOM',
        defaultTitle: 'WOM — Weekly Operations Meeting (Weekly Review)',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        tagColor: '#2563eb',
        description: 'Weekly Departmental Performance & Clinical Audit',
      };
    case 'HOLIDAY':
      return {
        cadence: 'HOLIDAY',
        frequency: 'SPECIAL',
        code: 'HOLIDAY',
        shortLabel: 'HOLIDAY',
        defaultTitle: 'HOLIDAY — Hospital Operations Standing Off',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        tagColor: '#d97706',
        description: 'Scheduled Off / Public Holiday / Clinical Stand-down',
      };
    case 'DOM':
    default:
      return {
        cadence: 'DOM',
        frequency: 'DAILY',
        code: 'DOM',
        shortLabel: 'DOM',
        defaultTitle: 'DOM — Daily Operations Meeting',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
        tagColor: '#ea580c',
        description: 'Daily Operational Standup & Patient Care Huddle',
      };
  }
}

// Calculates default cadence based on date:
// 1st Monday = MOM (Monthly Operations Meeting)
// Other Mondays = WOM (Weekly Operations Meeting)
// Any other operating day = DOM (Daily Operations Meeting)
export function determineMeetingFrequency(dateStr: string): {
  frequency: MeetingFrequency;
  cadence: CadenceType;
  defaultTitle: string;
} {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday
  const dayOfMonth = d.getDate();

  // If Monday
  if (dayOfWeek === 1) {
    if (dayOfMonth <= 7) {
      return {
        frequency: 'MONTHLY',
        cadence: 'MOM',
        defaultTitle: 'MOM — Monthly Operations Meeting (1st Monday)',
      };
    } else {
      return {
        frequency: 'WEEKLY',
        cadence: 'WOM',
        defaultTitle: 'WOM — Weekly Operations Meeting (Weekly Review)',
      };
    }
  }

  // Sunday could be off/holiday or standard DOM standup; default is DOM
  return {
    frequency: 'DAILY',
    cadence: 'DOM',
    defaultTitle: 'DOM — Daily Operations Meeting',
  };
}

/**
 * Calculates late minutes based on meeting date and scheduled start time.
 * Returns 0 if joined on-time or early, otherwise returns exact late minutes.
 */
export function calculateLateMinutes(
  meetingDateStr: string,
  scheduledTimeStr: string,
  checkInDate: Date = new Date()
): number {
  if (!meetingDateStr || !scheduledTimeStr) return 0;

  try {
    // Parse scheduled time: e.g. "10:00 AM", "10:30 AM IST", "14:00"
    const match = scheduledTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let hours = 10;
    let minutes = 0;

    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const meridian = match[3] ? match[3].toUpperCase() : null;

      if (meridian === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridian === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    // Parse meeting date (YYYY-MM-DD)
    const dateParts = meetingDateStr.split('-');
    if (dateParts.length !== 3) return 0;

    const scheduledDate = new Date(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10),
      hours,
      minutes,
      0,
      0
    );

    const diffMs = checkInDate.getTime() - scheduledDate.getTime();
    if (diffMs > 0) {
      return Math.floor(diffMs / 60000);
    }
    return 0;
  } catch (err) {
    console.warn('Error calculating late minutes:', err);
    return 0;
  }
}

/**
 * Formats raw late minutes into human-friendly duration:
 * e.g., 25 -> "+25m Late"
 * 70 -> "+1h 10m Late"
 * 515 -> "+8h 35m Late"
 */
export function formatLateDuration(lateMinutes?: number | null, prefixPlus: boolean = true): string {
  if (!lateMinutes || lateMinutes <= 0) return '';
  const prefix = prefixPlus ? '+' : '';
  if (lateMinutes < 60) {
    return `${prefix}${lateMinutes}m Late`;
  }
  const hours = Math.floor(lateMinutes / 60);
  const mins = lateMinutes % 60;
  if (mins === 0) {
    return `${prefix}${hours}h Late`;
  }
  return `${prefix}${hours}h ${mins}m Late`;
}

/**
 * Returns today's live calendar date in IST (Asia/Kolkata) formatted as YYYY-MM-DD
 * Guarantees date accuracy regardless of UTC timezone offset or time of day.
 */
export function getLiveIndiaDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch (e) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    return ist.toISOString().split('T')[0];
  }
}

