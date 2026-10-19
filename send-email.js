const nodemailer = require('nodemailer');

const parseJsonBody = async (req) => {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo parsear el cuerpo JSON.' });
    return;
  }

  const { to, subject, message, fromName } = body;
  if (!to || !subject || !message) {
    res.status(400).json({ error: 'Falta destinatario, asunto o mensaje.' });
    return;
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;
  const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;

  if (!GMAIL_USER || !GMAIL_PASS) {
    res.status(500).json({ error: 'No se ha configurado Gmail en el servidor.' });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${fromName || 'Sistema Escolar'}" <${EMAIL_FROM}>`,
      to,
      subject,
      text: message,
    });

    res.status(200).json({ success: true, data: info });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: error.message || 'Error al enviar el correo.', details: error.toString() });
  }
};
