import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import https from 'node:https';

function whatsappDispatchPlugin() {
  return {
    name: 'whatsapp-dispatch-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/whatsapp-dispatch', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
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
            } = data;

            let cleanPhone = mobileNo || '120363432056023698@g.us';
            if (cleanPhone === '919977881452-1431506963@g.us') {
              cleanPhone = '120363432056023698@g.us';
            }
            const user = username || 'SBH HOSPITAL';
            const pass = password || '123456789';
            const isGroup = cleanPhone.includes('@g.us');
            const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

            const results: any = {};

            // 1. If PDF or direct Audio attachment is provided, dispatch via POST /api/v1/message/create
            let filePayload: { name: string; body: string } | null = null;
            if (pdfBase64) {
              filePayload = {
                name: pdfFilename || `SBH_DOM_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                body: pdfBase64,
              };
            } else if (audioBase64) {
              filePayload = {
                name: audioFilename || 'announcement-dom.mp3',
                body: audioBase64,
              };
            }

            const effectiveFilePathUrl = filePathUrl || (audioFilename ? `https://sbhdom.vercel.app/audio/${audioFilename}` : undefined);

            if (filePayload || effectiveFilePathUrl) {
              await new Promise<void>((resolve) => {
                const postPayload = JSON.stringify({
                  recipientIds: isGroup ? [cleanPhone] : undefined,
                  receiverMobileNo: isGroup ? undefined : cleanPhone,
                  base64File: filePayload ? [filePayload] : undefined,
                  filePathUrl: effectiveFilePathUrl,
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
                  (apiRes: any) => {
                    let respData = '';
                    apiRes.on('data', (c: any) => (respData += c));
                    apiRes.on('end', () => {
                      console.log('[Ceoitbox Proxy] Attachment Dispatch Result:', apiRes.statusCode, respData.trim());
                      results.file = { statusCode: apiRes.statusCode, response: respData.trim() };
                      resolve();
                    });
                  }
                );

                postReq.on('error', (err: any) => {
                  console.error('[Ceoitbox Proxy] Attachment Network Error:', err.message);
                  results.file = { error: err.message };
                  resolve();
                });

                postReq.write(postPayload);
                postReq.end();
              });
            }

            // 2. If text message is provided, dispatch via GET /api/v1/message/create
            if (message) {
              await new Promise<void>((resolve) => {
                const paramKey = isGroup ? 'recipientIds' : 'receiverMobileNo';
                const getPath = `/api/v1/message/create?api_key=test&${paramKey}=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;

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
                  (apiRes: any) => {
                    let respData = '';
                    apiRes.on('data', (c: any) => (respData += c));
                    apiRes.on('end', () => {
                      console.log('[Ceoitbox Proxy] Text Dispatch Result:', apiRes.statusCode, respData.trim());
                      results.text = { statusCode: apiRes.statusCode, response: respData.trim() };
                      resolve();
                    });
                  }
                );

                getReq.on('error', (err: any) => {
                  console.error('[Ceoitbox Proxy] Text Network Error:', err.message);
                  results.text = { error: err.message };
                  resolve();
                });

                getReq.end();
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                target: cleanPhone,
                results,
              })
            );
          } catch (e: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    whatsappDispatchPlugin(),
  ],
});
