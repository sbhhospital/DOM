import https from 'node:https';

export default async function handler(req, res) {
  // Allow GET and POST for cron triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    const today = new Date();
    const istDate = new Date(today.getTime() + (5.5 * 60 * 60 * 1000));
    const istHours = istDate.getUTCHours();
    const istMinutes = istDate.getUTCMinutes();
    const istDayOfWeek = istDate.getUTCDay();

    // 1. Skip Sunday (0)
    if (istDayOfWeek === 0) {
      return res.status(200).json({
        success: true,
        message: 'Today is Sunday (Hospital Weekly Off). Standup broadcast skipped.',
      });
    }

    // 2. Strict Time-Window Guard:
    // Only allow dispatch around 09:30 AM IST (window: 09:15 AM - 09:45 AM IST).
    // Prevents any delayed runs at night (e.g. 8:00 PM, 8:15 PM, 8:25 PM).
    const isAllowedWindow = (istHours === 9 && istMinutes >= 15 && istMinutes <= 45);
    const isForce = req.query.force === 'true';

    if (!isAllowedWindow && !isForce) {
      return res.status(200).json({
        success: false,
        message: `Current IST time is ${String(istHours).padStart(2, '0')}:${String(istMinutes).padStart(2, '0')} IST. Automated dispatch is restricted strictly to 09:30 AM IST morning window. Night/delayed trigger aborted.`,
      });
    }

    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const year = istDate.getUTCFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const targetGroupId = '919977881452-1431506963@g.us';
    const message = [
      '🏥 *SBH GROUP OF HOSPITALS, RAIPUR*',
      '🔔 *09:30 AM NOTICE: DAILY OPERATIONS MEETING (DOM)*',
      '━━━━━━━━━━━━━━━━━━━━━━',
      `📅 *Date:* ${formattedDate}`,
      '⏰ *Time:* Sharp 10:00 AM IST',
      '📍 *Venue:* Conference Room, 5th Floor',
      '',
      '✅ *PORTAL LOGIN & ATTENDANCE LINK:*',
      '👉 https://sbhdom.vercel.app/',
      '',
      '📌 *MANDATORY CHECK-IN INSTRUCTION:*',
      'Physical attendance in the 5th Floor Conference Room requires scanning the on-screen QR Code.',
      '',
      '⚠️ All Department Heads and Leaders please assemble in the 5th Floor Conference Room and check in before 10:00 AM sharp.',
      'Final attendance audit freezes at 10:30 AM for Hospital Director review.',
      '━━━━━━━━━━━━━━━━━━━━━━',
      'DOM Operations Command | SBH Raipur',
    ].join('\n');

    const authHeader = 'Basic ' + Buffer.from('SBH HOSPITAL:123456789').toString('base64');
    const effectiveFilePathUrl = 'https://sbhdom.vercel.app/audio/announcement-dom.mp3';

    // Dispatch via Ceoitbox API with recipientIds ONLY (NEVER receiverMobileNo for groups)
    const queryParams = new URLSearchParams();
    queryParams.set('api_key', 'test');
    queryParams.set('recipientIds', targetGroupId);
    queryParams.set('message', message);
    queryParams.set('filePathUrl', effectiveFilePathUrl);

    const getPath = `/api/v1/message/create?${queryParams.toString()}`;

    const result = await new Promise((resolve) => {
      const getReq = https.request(
        {
          hostname: 'app.ceoitbox.com',
          path: getPath,
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'x-api-key': 'test',
            accept: 'application/json',
          },
        },
        (apiRes) => {
          let respData = '';
          apiRes.on('data', (c) => (respData += c));
          apiRes.on('end', () => {
            resolve({ statusCode: apiRes.statusCode, response: respData.trim() });
          });
        }
      );

      getReq.on('error', (err) => {
        resolve({ error: err.message });
      });

      getReq.end();
    });

    return res.status(200).json({
      success: true,
      time: `${String(istHours).padStart(2, '0')}:${String(istMinutes).padStart(2, '0')} IST`,
      targetGroup: targetGroupId,
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Cron error',
    });
  }
}
