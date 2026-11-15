import { Leader } from '../types/database';

export interface DailyMeetingTokenPayload {
  leaderId: string;
  date: string;
  name: string;
  dept: string;
  phone: string;
  meetUrl: string;
  iat: number;
}

export const DEFAULT_GOOGLE_MEET_URL = 'https://meet.google.com/jrz-jfku-gir';

/**
 * Generates a unique daily meeting link for a specific leader and date.
 * When clicked, it records attendance date-wise and user-wise and redirects to Google Meet.
 */
export function generateDailyMeetingLink(
  leader: Leader,
  dateStr: string,
  originUrl?: string,
  targetMeetUrl: string = DEFAULT_GOOGLE_MEET_URL
): { url: string; token: string } {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const now = Date.now();

  const payload: DailyMeetingTokenPayload = {
    leaderId: leader.id,
    date: dateStr,
    name: leader.full_name,
    dept: leader.department?.name || 'Department',
    phone: leader.phone || '',
    meetUrl: targetMeetUrl,
    iat: now,
  };

  const jsonStr = JSON.stringify(payload);
  const token = btoa(encodeURIComponent(jsonStr));
  const url = `${origin}/join-meeting?token=${encodeURIComponent(token)}`;

  return { url, token };
}

/**
 * Decodes and verifies a daily meeting join token
 */
export function verifyDailyMeetingToken(token: string): {
  valid: boolean;
  payload?: DailyMeetingTokenPayload;
  message?: string;
} {
  try {
    const jsonStr = decodeURIComponent(atob(token));
    const payload: DailyMeetingTokenPayload = JSON.parse(jsonStr);

    if (!payload.leaderId || !payload.date) {
      return { valid: false, message: 'Invalid meeting link format.' };
    }

    return {
      valid: true,
      payload,
    };
  } catch (err) {
    return { valid: false, message: 'Could not decode meeting token.' };
  }
}
