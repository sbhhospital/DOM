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

        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const { mobileNo, message, username, password } = data;

            const cleanPhone = mobileNo || '120363432056023698@g.us';
            const user = username || 'SBH HOSPITAL';
            const pass = password || '123456789';

            const query = new URLSearchParams({
              username: user,
              password: pass,
              receiverMobileNo: cleanPhone,
              receiverName: 'SBH DOM Group',
              message: message || 'Notice',
            }).toString();

            const targetUrl = `https://app.messageautosender.com/message/new?${query}`;
            console.log('[Local WhatsApp Proxy] Dispatching to Ceoitbox:', cleanPhone);

            https
              .get(targetUrl, (apiRes) => {
                let respBody = '';
                apiRes.on('data', (c) => (respBody += c));
                apiRes.on('end', () => {
                  console.log('[Local WhatsApp Proxy] Success:', apiRes.statusCode, respBody.trim());
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(
                    JSON.stringify({
                      success: true,
                      statusCode: apiRes.statusCode,
                      response: respBody.trim(),
                    })
                  );
                });
              })
              .on('error', (err) => {
                console.error('[Local WhatsApp Proxy] Network Error:', err.message);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ success: false, error: err.message }));
              });
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
