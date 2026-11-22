import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'node:https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { mobileNo, message, username, password, pdfBase64, pdfFilename } = req.body || {};

    const cleanPhone = (mobileNo || '919977881452-1431506963@g.us').trim();
    const user = username || 'SBH HOSPITAL';
    const pass = password || '123456789';
    const isGroup = cleanPhone.includes('@g.us');
    const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

    const results: Record<string, any> = {};

    // 1. If PDF attachment is provided, dispatch via POST /api/v1/message/create with base64File
    if (pdfBase64) {
      await new Promise<void>((resolve) => {
        const postPayload = JSON.stringify({
          recipientIds: isGroup ? [cleanPhone] : undefined,
          receiverMobileNo: cleanPhone,
          base64File: [
            {
              name: pdfFilename || `SBH_DOM_Report_${new Date().toISOString().split('T')[0]}.pdf`,
              body: pdfBase64,
            },
          ],
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

    // 2. If text message is provided, dispatch via GET /api/v1/message/create
    if (message) {
      await new Promise<void>((resolve) => {
        // Provide both receiverMobileNo and recipientIds so Ceoitbox accepts regardless of field preference
        const queryParams = new URLSearchParams();
        queryParams.set('api_key', 'test');
        queryParams.set('receiverMobileNo', cleanPhone);
        if (isGroup) {
          queryParams.set('recipientIds', cleanPhone);
        }
        queryParams.set('message', message);

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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal dispatch error',
    });
  }
}
