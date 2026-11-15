import { Leader } from '../types/database';

export interface MagicTokenPayload {
  leaderId: string;
  name: string;
  dept: string;
  phone: string;
  iat: number;
  exp: number; // Expiration timestamp (15 minutes from creation)
}

/**
 * Generates a personalized 1-Click Magic Attendance Link valid for 15 minutes
 */
export function generateLeaderMagicLink(leader: Leader, originUrl?: string): {
  url: string;
  token: string;
  expiresAt: number;
} {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 Minutes Validity

  const payload: MagicTokenPayload = {
    leaderId: leader.id,
    name: leader.full_name,
    dept: leader.department?.name || 'Hospital Leadership',
    phone: leader.phone,
    iat: now,
    exp: expiresAt,
  };

  const jsonStr = JSON.stringify(payload);
  // URL-safe base64 encoding
  const token = btoa(encodeURIComponent(jsonStr));
  const url = `${origin}/portal?auth=${encodeURIComponent(token)}`;

  return { url, token, expiresAt };
}

/**
 * Validates a magic link token and checks if within the 15-minute security window
 */
export function verifyLeaderMagicLink(token: string): {
  valid: boolean;
  expired?: boolean;
  remainingSeconds?: number;
  payload?: MagicTokenPayload;
  message: string;
} {
  try {
    const jsonStr = decodeURIComponent(atob(token));
    const payload: MagicTokenPayload = JSON.parse(jsonStr);

    if (!payload.leaderId || !payload.exp) {
      return { valid: false, message: 'Invalid magic authentication token format.' };
    }

    const now = Date.now();
    if (now > payload.exp) {
      return {
        valid: false,
        expired: true,
        payload,
        message: 'This 1-Click Quick Login Link has expired (15-minute security limit exceeded). Please login with your PIN.',
      };
    }

    const remainingSeconds = Math.max(0, Math.floor((payload.exp - now) / 1000));

    return {
      valid: true,
      expired: false,
      remainingSeconds,
      payload,
      message: `Welcome, ${payload.name}! Authenticated via secure 1-Click WhatsApp Link.`,
    };
  } catch (err) {
    return { valid: false, message: 'Could not decode authentication link.' };
  }
}
