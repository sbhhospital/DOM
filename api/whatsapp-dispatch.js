import https from 'node:https';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      mobileNo,
      message,
      username,
      password,
      pdfBase64,
      pdfFilename,
      audioBase64,
      audioFilename,
      filePathUrl,
    } = req.body || {};

    const isTestActive = Boolean(req.body?.isTestMode || req.body?.is_test_mode);
    const LIVE_GROUP = '919977881452-1431506963@g.us';
    const TEST_GROUP = '120363432056023698@g.us';

    let cleanPhone = (mobileNo || (isTestActive ? TEST_GROUP : LIVE_GROUP)).trim();
    const isGroup = cleanPhone.includes('@g.us');

    if (isGroup && isTestActive) {
      cleanPhone = TEST_GROUP;
    }

    // Detect if this is an individual leader credentials / onboarding login guide message
    const isCredentialsMessage = Boolean(
      message && (
        message.includes('CREDENTIALS') || 
        message.includes('Password') || 
        message.includes('LOGIN GUIDE') ||
        message.includes('Portal Login URL') ||
        message.includes('Registered Mobile')
      )
    );

    // Strict safety protection: NEVER message single contact 9977881452 or 919977881452 with meeting reminder broadcasts
    // (However, allow sending individual credentials to the recipient if requested)
    if (!isGroup && !isCredentialsMessage && (cleanPhone.replace(/\D/g, '').includes('9977881452') || cleanPhone === '9977881452' || cleanPhone === '919977881452')) {
      return res.status(200).json({ success: false, message: 'Blocked individual broadcast to 9977881452. DOM notifications are group-only.' });
    }

    // Standup reminder broadcasts must NEVER be sent to individual phone numbers — groups only
    if (!isGroup && !isCredentialsMessage && message && (
      message.includes('DAILY OPERATIONS STANDUP') || 
      message.includes('CHECK-IN INSTRUCTION') || 
      message.includes('MANDATORY CHECK-IN') ||
      message.includes('09:30 AM NOTICE')
    )) {
      return res.status(200).json({ success: false, message: 'Blocked standup broadcast to individual phone. Official DOM notices are restricted strictly to WhatsApp Groups.' });
    }

    const user = username || 'SBH HOSPITAL';
    const pass = password || '123456789';
    const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

    const results = {};

    // 1. If PDF document attachment is provided, dispatch exclusively via POST /api/v1/message/create with base64File
    const cleanB64 = (raw) => (raw ? (raw.includes('base64,') ? raw.split('base64,')[1] : raw) : '');

    if (pdfBase64) {
      const filePayload = {
        name: pdfFilename || `SBH_DOM_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        body: cleanB64(pdfBase64),
      };

      await new Promise((resolve) => {
        const postPayload = JSON.stringify({
          recipientIds: isGroup ? [cleanPhone] : undefined,
          receiverMobileNo: isGroup ? undefined : cleanPhone,
          base64File: [filePayload],
        });

        const postReq = https.request(
          {
            hostname: 'app.ceoitbox.com',
            path: '/api/v1/message/create?api_key=test',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'x-api-key': 'test',
              'accept': 'application/json',
              'Content-Length': Buffer.byteLength(postPayload),
            },
          },
          (apiRes) => {
            let respData = '';
            apiRes.on('data', (c) => (respData += c));
            apiRes.on('end', () => {
              results.pdf = { statusCode: apiRes.statusCode, response: respData.trim() };
              resolve();
            });
          }
        );

        postReq.on('error', (err) => {
          results.pdf = { error: err.message };
          resolve();
        });

        postReq.write(postPayload);
        postReq.end();
      });
    }

    // 2. Text message and Audio Dispatch:
    // Ensures text message is always transmitted. If audio is attached, passes public filePathUrl so both audio and text arrive!
    const effectiveFilePathUrl = filePathUrl || (audioFilename ? `https://sbhdom.vercel.app/audio/${audioFilename}` : undefined);

    if (message && !pdfBase64) {
      await new Promise((resolve) => {
        const queryParams = new URLSearchParams();
        queryParams.set('api_key', 'test');
        if (isGroup) {
          queryParams.set('recipientIds', cleanPhone);
          // CRITICAL: NEVER set receiverMobileNo for groups. Ceoitbox splits hyphen '-' and messages individual numbers!
        } else {
          queryParams.set('receiverMobileNo', cleanPhone);
        }
        queryParams.set('message', message);
        if (effectiveFilePathUrl) {
          queryParams.set('filePathUrl', effectiveFilePathUrl);
        }

        const getPath = `/api/v1/message/create?${queryParams.toString()}`;

        const getReq = https.request(
          {
            hostname: 'app.ceoitbox.com',
            path: getPath,
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'x-api-key': 'test',
              'accept': 'application/json',
            },
          },
          (apiRes) => {
            let respData = '';
            apiRes.on('data', (c) => (respData += c));
            apiRes.on('end', () => {
              results.text = { statusCode: apiRes.statusCode, response: respData.trim() };
              resolve();
            });
          }
        );

        getReq.on('error', (err) => {
          results.text = { error: err.message };
          resolve();
        });

        getReq.end();
      });
    }

    return res.status(200).json({
      success: true,
      target: cleanPhone,
      isGroup,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal dispatch error',
    });
  }
}
