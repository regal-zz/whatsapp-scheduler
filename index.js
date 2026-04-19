const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const { execSync } = require('child_process');

const app = express();
app.use(express.json());

const SECRET = process.env.SECRET_TOKEN || 'mi_token_secreto';

// Detecta automáticamente donde está Chromium
function getChromiumPath() {
  const posibles = [
    '/run/current-system/sw/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/nix/var/nix/profiles/default/bin/chromium',
  ];
  for (const ruta of posibles) {
    try {
      execSync(`test -f ${ruta}`);
      console.log(`✅ Chromium encontrado en: ${ruta}`);
      return ruta;
    } catch {}
  }
  // Si no encuentra ninguna, busca con which
  try {
    const ruta = execSync('which chromium || which chromium-browser').toString().trim();
    console.log(`✅ Chromium encontrado con which: ${ruta}`);
    return ruta;
  } catch {}

  console.log('⚠️ Chromium no encontrado, usando ruta por defecto de Puppeteer');
  return null;
}

const chromiumPath = getChromiumPath();

const clientConfig = {
  authStrategy: new LocalAuth(),
  puppeteer: {
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
};

if (chromiumPath) {
  clientConfig.puppeteer.executablePath = chromiumPath;
}

const client = new Client(clientConfig);

const QRCode = require('qrcode');
let qrImageUrl = '';

client.on('qr', async (qr) => {
  console.log('📱 QR generado, ábrelo en el navegador: /qr');
  qrImageUrl = await QRCode.toDataURL(qr);
});

// Página web con el QR
app.get('/qr', (req, res) => {
  if (!qrImageUrl) {
    return res.send('<h2>QR no disponible aún, espera unos segundos y recarga</h2>');
  }
  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111">
        <div style="text-align:center">
          <h2 style="color:white">Escanea con WhatsApp</h2>
          <img src="${qrImageUrl}" style="width:300px;height:300px"/>
          <p style="color:gray">Recarga la página si el QR expiró</p>
        </div>
      </body>
    </html>
  `);
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
