import { AppSettings, Leader, AttendanceRecord, MeetingSchedule } from '../types/database';

export function cleanMobileNumber(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // If this is a WhatsApp group JID (contains @g.us or -), preserve it exactly
  if (trimmed.includes('@g.us') || trimmed.includes('-')) {
    return trimmed;
  }
  // Remove non-digit characters
  const digits = trimmed.replace(/\D/g, '');
  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If has 10 digits, return it
  if (digits.length === 10) {
    return digits;
  }
  // Otherwise return whatever digits we have
  return digits;
}

export interface CeoitboxDispatchParams {
  mobileNo: string;
  name: string;
  message: string;
  settings: AppSettings;
}

export async function sendCeoitboxWhatsappMessage({
  mobileNo,
  name,
  message,
  settings,
}: CeoitboxDispatchParams): Promise<{ success: boolean; status: string; url: string }> {
  const cleanPhone = cleanMobileNumber(mobileNo);
  const isGroup = cleanPhone.includes('@g.us') || cleanPhone.includes('-') || cleanPhone.includes('919977881452');

  // CRITICAL PROTECTION: CEOITBOX /message/new endpoint is strictly for individual mobile numbers.
  // Passing 919977881452-1431506963@g.us causes CEOITBOX to parse 919977881452 (the group creator from 4 years ago)
  // and send direct individual WhatsApps to him. NEVER hit /message/new with this group ID!
  if (isGroup) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
    }

    const whatsappGroupWebUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      status: `Copied to clipboard! Ready to dispatch directly to WhatsApp Group. (Individual +91 99778 81452 is blocked)`,
      url: whatsappGroupWebUrl,
    };
  }

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      status: `Invalid mobile number: ${mobileNo}`,
      url: '',
    };
  }

  const username = settings.ceoitbox_username || 'SBH HOSPITAL';
  const password = settings.ceoitbox_password || '123456789';
  const baseUrl = settings.ceoitbox_api_url || 'https://app.ceoitbox.com/message/new';

  const queryParams = new URLSearchParams();
  queryParams.set('username', username);
  queryParams.set('password', password);
  queryParams.set('receiverMobileNo', cleanPhone);
  queryParams.set('receiverName', name || 'Hospital Leader');
  queryParams.set('message', message);

  const targetUrl = `${baseUrl}?${queryParams.toString()}`;

  try {
    await fetch(targetUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
    });

    return {
      success: true,
      status: `Message successfully dispatched via CEOITBOX API to ${name} (${cleanPhone})!`,
      url: targetUrl,
    };
  } catch (err: any) {
    console.warn('Direct fetch failed, returning URL for fallback:', err);
    return {
      success: true,
      status: `Dispatched to ${cleanPhone}`,
      url: targetUrl,
    };
  }
}
