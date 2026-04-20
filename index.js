const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const SECRET = 'token123';
let qrImageUrl = '';
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('📱 QR generado, ábrelo en el navegador: /qr');
  qrImageUrl = await QRCode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
  isReady = true;
  qrImageUrl = '';
});

app.get('/qr', (req, res) => {
  if (isReady) {
    return res.send(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111">
      <h2 style="color:#25D366">✅ WhatsApp ya está conectado</h2>
    </body></html>`);
  }
  if (!qrImageUrl) {
    return res.send(`<html><head><meta http-equiv="refresh" content="3"></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111">
        <h2 style="color:white">⏳ Generando QR, espera...</h2>
      </body></html>`);
  }
  res.send(`<html>
    <head><meta http-equiv="refresh" content="30"></head>
    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111">
      <div style="text-align:center">
        <h2 style="color:white;font-family:sans-serif">Escanea con WhatsApp</h2>
        <img src="${qrImageUrl}" style="width:300px;height:300px;border-radius:12px"/>
        <p style="color:gray;font-family:sans-serif">La página se recarga sola cada 30 segundos</p>
      </div>
    </body></html>`);
});

app.get('/groups', async (req, res) => {
  const token = req.query.token;
  console.log('Token recibido:', token);
  console.log('Token esperado:', SECRET);
  if (token !== SECRET) return res.status(401).json({ error: 'Token inválido' });
  try {
    const chats = await client.getChats();
    const groups = chats
      .filter(c => c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name }));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/contacts', async (req, res) => {
  const token = req.query.token;
  if (token !== SECRET) return res.status(401).json({ error: 'Token inválido' });
  try {
    const contacts = await client.getContacts();
    const lista = contacts
      .filter(c => c.isMyContact && !c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name || c.pushname || c.number }));
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send', async (req, res) => {
  const { token, groupId, message } = req.body;
  if (token !== SECRET) return res.status(401).json({ error: 'Token inválido' });
  try {
    await client.sendMessage(groupId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
client.initialize();
