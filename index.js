const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Configurador de transporte de correo (ejemplo SMTP/Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tu_correo@gmail.com',
    pass: process.env.EMAIL_PASS || 'tu_contraseña_de_aplicacion',
  },
});

// 1. Endpoint: Envío de Correos
app.post('/api/send-email', async (req, res) => {
  const { to, subject, message, fromName } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    await transporter.sendMail({
      from: `"${fromName || 'Sistema Escolar'}" <${process.env.EMAIL_USER || 'tu_correo@gmail.com'}>`,
      to,
      subject,
      text: message,
    });
    res.status(200).json({ success: true, message: 'Correo enviado con éxito' });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

// 2. Endpoint: Envío o preparación de WhatsApp
app.post('/api/send-whatsapp', (req, res) => {
  const { phone, message } = req.body;
  const encodedMsg = encodeURIComponent(message || 'Resumen de asistencia escolar');
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMsg}`;
  
  res.status(200).json({ success: true, whatsappUrl });
});

// 3. Endpoints auxiliares para estudiantes y asistencia (Persistencia REST)
app.get('/api/students', (req, res) => {
  const { year } = req.query;
  // Devuelve estado 200 para sincronizarse con localStorage cuando falle base de datos externa
  res.status(200).json([]);
});

app.post('/api/attendance', (req, res) => {
  res.status(200).json({ success: true });
});

module.exports = app;