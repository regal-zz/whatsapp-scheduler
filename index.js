const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

// Token secreto para proteger tu endpoint
const SECRET = process.env.SECRET_TOKEN || 'mi_token_secreto';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Al iniciar, muestra el QR en consola
client.on('qr', (qr) => {
  console.log('Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
});

// Endpoint que Apps Script llamará
app.post('/send', async (req, res) => {
  const { token, groupId, message } = req.body;

  if (token !== SECRET) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    await client.sendMessage(groupId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener tus grupos
app.get('/groups', async (req, res) => {
  const token = req.query.token;
  if (token !== SECRET) return res.status(401).json({ error: 'Token inválido' });

  const chats = await client.getChats();
  const groups = chats
    .filter(c => c.isGroup)
    .map(c => ({ id: c.id._serialized, name: c.name }));

  res.json(groups);
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
client.initialize();