const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    return res.status(500).json({ error: 'No se ha configurado Supabase en el servidor.' });
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

