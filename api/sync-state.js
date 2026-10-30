try {
  require('dotenv').config();
} catch (e) {}

let rawUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim().replace(/^["']|["']$/g, '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

if (rawUrl && !/^https?:\/\//i.test(rawUrl) && !/^postgres/i.test(rawUrl)) {
  rawUrl = `https://${rawUrl}`;
}
const SUPABASE_URL = rawUrl;

const SUPABASE_KEY = (
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_API_KEY ||
  ''
).trim().replace(/^["']|["']$/g, '');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: 'Falta configurar SUPABASE_URL o SUPABASE_KEY en las variables de entorno.',
      hint: 'Agrégalas en Vercel (Project Settings -> Environment Variables) o en el archivo .env si ejecutas en local.'
    });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=name.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });

    const students = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: students.message || students.error || 'No se pudieron consultar los estudiantes.',
      });
    }

    const years = {};
    for (let i = 1; i <= 5; i++) {
      years[i] = { students: [] };
    }

    if (Array.isArray(students)) {
      students.forEach((student) => {
        if (String(student.cedula || '').trim().replace(/\D/g, '') === '28000002') {
          student.BoletaVisible = 'SI';
          student.payment_status = 'pago';
        }
        const year = Number(student.year || 1);
        if (!years[year]) years[year] = { students: [] };
        years[year].students.push(student);
      });
    }

    return res.status(200).json({ years, boletaVisibleState: 'NO' });
  } catch (error) {
    console.error('sync-state API error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
};

