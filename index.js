const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const SECRET = process.env.SECRET_TOKEN || 'mi_token_secreto';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/run/current-system/sw/bin/chromium',  // Chrome de Nix
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

client.on('qr', (qr) => {
  console.log('Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
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

app.get('/groups', async (req, res) => {
  const token = req.query.token;
  if (token !== SECRET) return res.status(401).json({ error: 'Token inválido' });
  const chats = await client.getChats();
  const groups = chats
    .filter(c => c.isGroup)
    .map(c => ({ id: c.id._serialized, name: c.name }));
  res.json(groups);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
client.initialize();
