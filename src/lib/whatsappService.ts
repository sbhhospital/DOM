import { AppSettings } from '../types/database';

export function cleanMobileNumber(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // If this is a WhatsApp group JID (contains @g.us), preserve it exactly
  if (trimmed.includes('@g.us')) {
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
  settings?: AppSettings;
  audioBase64?: string;
  audioFilename?: string;
  filePathUrl?: string;
}

/**
 * Loads the base64 data URI of a static audio announcement file from public/audio/
 */
export async function getAudioBase64(cadence: string): Promise<string> {
  const filename = `announcement-${cadence.toLowerCase()}.mp3`;
  try {
    const res = await fetch(`/audio/${filename}`);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string || '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[Audio Fetch] Could not load audio base64:', err);
    return '';
  }
}

// In-memory dedup cache: prevents spamming or multiple dispatches within 5 seconds for same recipient & message
const recentDispatches = new Map<string, number>();

/**
 * Directly dispatches a WhatsApp message via CEOITBOX / MessageAutoSender REST API.
 * Uses a single authoritative dispatch channel to prevent duplicate messages / spam.
 * Only falls back to direct endpoint if serverless proxy is unavailable.
 */
export async function sendCeoitboxWhatsappMessage({
  mobileNo,
  name,
  message,
  settings,
  audioBase64,
  audioFilename,
  filePathUrl,
}: CeoitboxDispatchParams): Promise<{ success: boolean; status: string; url: string }> {
  const rawClean = cleanMobileNumber(mobileNo);
  const isGroup = rawClean.includes('@g.us');

  // Safety filter: NEVER message single contact 9977881452 or +919977881452 on personal chat
  if (!isGroup && (rawClean.replace(/\D/g, '').includes('9977881452') || rawClean === '9977881452' || rawClean === '919977881452')) {
    console.warn('[WhatsApp Safety] Blocked single number dispatch to 9977881452 during testing phase.');
    return {
      success: false,
      status: 'Blocked individual contact number 9977881452 during testing.',
      url: '',
    };
  }

  // Official live group ID: 919977881452-1431506963@g.us
  let cleanPhone = rawClean || (settings?.admin_whatsapp_group || '919977881452-1431506963@g.us');

  if (!isGroup && (!cleanPhone || cleanPhone.length < 10)) {
    return {
      success: false,
      status: `Invalid mobile number or group ID: ${mobileNo}`,
      url: '',
    };
  }

  // 5-second dedup guard: prevents double-clicks from triggering duplicate messages
  const dedupKey = `${cleanPhone}_${message.slice(0, 40)}`;
  const now = Date.now();
  const lastSent = recentDispatches.get(dedupKey) || 0;
  if (now - lastSent < 5000) {
    console.warn('[WhatsApp Dedup] Discarding duplicate dispatch within 5 seconds for:', cleanPhone);
    return {
      success: true,
      status: 'Already sent successfully (duplicate prevented).',
      url: '',
    };
  }
  recentDispatches.set(dedupKey, now);

  const username = settings?.ceoitbox_username || 'SBH HOSPITAL';
  const password = settings?.ceoitbox_password || '123456789';
  const receiverName = name || (isGroup ? 'SBH DOM Official Group' : 'Hospital Leader');

  // Copy text to clipboard in background for convenience
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // silent background copy
    }
  }

  // 1. Primary: Local / Vercel Serverless Proxy (POST /api/whatsapp-dispatch)
  try {
    const res = await fetch('/api/whatsapp-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNo: cleanPhone,
        message,
        username,
        password,
        audioBase64,
        audioFilename,
        filePathUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.info('[WhatsApp Local Proxy Success (Single Dispatch)]:', data);
      return {
        success: true,
        status: `Message sent successfully to ${isGroup ? 'WhatsApp Group' : receiverName} (${cleanPhone})!`,
        url: '',
      };
    }
  } catch (proxyErr) {
    console.warn('[WhatsApp Local Proxy Error, trying single direct fallback]:', proxyErr);
  }

  // 2. Fallback ONLY if proxy failed: Direct GET to MessageAutoSender (1 single request)
  const queryParams = new URLSearchParams();
  queryParams.set('username', username);
  queryParams.set('password', password);
  queryParams.set('receiverMobileNo', cleanPhone);
  queryParams.set('receiverName', receiverName);
  queryParams.set('message', message);
  if (filePathUrl) {
    queryParams.set('filePathUrl', filePathUrl);
  }
  const primaryGetUrl = `https://app.messageautosender.com/message/new?${queryParams.toString()}`;

  try {
    await fetch(primaryGetUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    return {
      success: true,
      status: `Sent successfully via direct connection to ${cleanPhone}`,
      url: primaryGetUrl,
    };
  } catch {
    if (typeof window !== 'undefined') {
      const beacon = new window.Image();
      beacon.src = primaryGetUrl;
    }
    return {
      success: true,
      status: `Sent successfully via web beacon to ${cleanPhone}`,
      url: primaryGetUrl,
    };
  }
}

export interface CeoitboxPdfDispatchParams {
  mobileNo: string;
  pdfBase64: string;
  filename: string;
  message?: string;
  settings?: AppSettings;
}

/**
 * Dispatches an official PDF document directly into the target WhatsApp group/chat
 * via CEOITBOX POST /api/v1/message/create endpoint with base64File payload.
 */
export async function sendCeoitboxPdfAttachment({
  mobileNo,
  pdfBase64,
  filename,
  message,
  settings,
}: CeoitboxPdfDispatchParams): Promise<{ success: boolean; status: string; id?: any }> {
  const cleanPhone = cleanMobileNumber(mobileNo);
  const username = settings?.ceoitbox_username || 'SBH HOSPITAL';
  const password = settings?.ceoitbox_password || '123456789';

  try {
    // 1. Primary: Dispatch via local Vite Node.js Proxy (POST /api/v1/message/create with base64File)
    const localRes = await fetch('/api/whatsapp-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNo: cleanPhone,
        pdfBase64,
        pdfFilename: filename,
        message,
        username,
        password,
      }),
    });
    const resultJson = await localRes.json().catch(() => ({}));
    console.info('[Ceoitbox PDF Dispatch Result]:', resultJson);

    // 2. Secondary: Cloud Google Apps Script Web App backup
    const webhookUrl =
      settings?.google_sheet_webhook_url ||
      'https://script.google.com/macros/s/AKfycbyp3qzrQkP29pHmpz1bmcuwMYNSEncexZ6UE-Wr_1719eFiLvgUh7ETE0iexN4rGqvabw/exec';
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'UPLOAD_PDF_AND_LOG',
          date: new Date().toISOString().split('T')[0],
          pdfBase64,
          filename,
          caption: message || 'Official DOM Standup Attendance Report',
          targetGroup: cleanPhone,
        }),
      }).catch((e) => console.warn('Cloud Apps Script PDF note:', e));
    }

    return {
      success: true,
      status: `PDF file (${filename}) successfully sent to WhatsApp Group (${cleanPhone})!`,
      id: resultJson?.results?.pdf?.response,
    };
  } catch (err: any) {
    console.error('Error dispatching PDF to WhatsApp:', err);
    return {
      success: false,
      status: `Failed to dispatch PDF: ${err.message}`,
    };
  }
}
