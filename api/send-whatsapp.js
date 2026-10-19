module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['POST'] });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const phone = body.phone;
  const message = body.message || 'Resumen de asistencia escolar';

  if (!phone) {
    return res.status(400).json({ error: 'Falta el número de destino' });
  }

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return res.status(200).json({ success: true, whatsappUrl });
};
