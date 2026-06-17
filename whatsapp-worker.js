const http = require('http');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const { toBuffer } = require('qrcode');

const PORT = process.env.PORT || 3001;
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || './whatsapp-auth';

let client = null;
let qrCode = null;
let status = 'initializing';
let retryCount = 0;

async function startClient() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  
  let version;
  try {
    const waVersion = await fetchLatestWaWebVersion();
    version = waVersion?.version;
  } catch {
    version = [2, 3000, 1023223821];
  }

  const socketConfig = {
    auth: state,
    browser: ['RR Downtown Arcade Worker', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    version,
    connectTimeoutMs: 30000,
    keepAliveIntervalMs: 30000,
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs: 30000,
    maxRetries: 5,
    emitOwnEvents: true,
  };

  client = makeWASocket(socketConfig);
  status = 'connecting';
  retryCount++;

  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('📱 QR Code received — generating image');
      try {
        const qrBuffer = await toBuffer(qr);
        qrCode = `data:image/png;base64,${qrBuffer.toString('base64')}`;
      } catch {
        qrCode = qr;
      }
      status = 'qr';
    }

    if (connection === 'open') {
      status = 'connected';
      qrCode = null;
      retryCount = 0;
      console.log('✅ WhatsApp connected successfully!');
    }

    if (connection === 'close') {
      const logout = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (logout) {
        console.log('🔴 Logged out — need to re-scan QR');
        status = 'disconnected';
        client = null;
        return;
      }

      status = 'connecting';
      client = null;
      const delay = Math.min(retryCount * 2000, 15000);
      console.log(`❌ Connection lost — reconnecting in ${delay/1000}s (attempt ${retryCount})`);
      setTimeout(startClient, delay);
    }
  });

  client.ev.on('creds.update', saveCreds);

  // Auto-send QR on the update event
  client.ev.on('messages.upsert', () => {});
}

async function sendMessage(phone, text) {
  if (!client) throw new Error('Client not initialized');
  if (status !== 'connected') throw new Error('WhatsApp not connected. Status: ' + status);
  
  const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await client.sendMessage(jid, { text });
  return { success: true };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status, qr: status === 'qr' ? qrCode : null }));
    return;
  }

  if (req.method === 'POST' && path === '/send') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Phone and message required' }));
          return;
        }
        const result = await sendMessage(phone, message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     RR Downtown Arcade — WhatsApp Worker     ║
║                                              ║
║  API Server running on: http://localhost:${PORT}  ║
║                                              ║
║  Endpoints:                                  ║
║    GET  /status    → Connection status + QR  ║
║    POST /send      → Send message            ║
╚══════════════════════════════════════════════╝
  `);
  startClient();
});