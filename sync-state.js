const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'No se ha configurado Supabase en el servidor.' });
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });
    const students = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: students.message || students.error || 'No se pudieron consultar los estudiantes.' });
      return;
    }

    const years = {};
    students.forEach((student) => {
      const year = Number(student.year || 1);
      if (!years[year]) years[year] = { students: [] };
      years[year].students.push(student);
    });
    res.json({ years, boletaVisibleState: 'NO' });
  } catch (error) {
    console.error('sync-state API error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
