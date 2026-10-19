// Endpoint para registrar asistencia en Supabase.
// Requiere variables de entorno en Vercel: SUPABASE_URL, SUPABASE_KEY.
// Tablas necesarias en Supabase:
// - students: id (bigint, pk), name (text), cedula (text), email (text), phone (text), year (int)
// - attendances: id (bigint, pk), student_id (bigint), date (date), subject (text), subject_label (text), status (text)

const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const requireSupabase = (res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'No se ha configurado Supabase en el servidor.' });
    return false;
  }
  return true;
};

const supabaseFetch = async (path, opts = {}) => {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1${path}`;
  const headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }, opts.headers || {});
  return fetch(url, Object.assign({}, opts, { headers }));
};

const parseJsonBody = async (req) => {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
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
  if (!requireSupabase(res)) return;
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

  const { id, name, email, phone, year, subject, subjectLabel, status, date } = body;
  if (!id || !name || !email || !year || !subject || !status) {
    res.status(400).json({ error: 'Falta id, nombre, correo, año, materia o estado.' });
    return;
  }

  try {
    const studentPayload = [{
      id,
      name,
      cedula: body.cedula || null,
      email: email || null,
      phone: phone || null,
      year: Number(year),
    }];

    const studentResponse = await supabaseFetch('/students?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify(studentPayload),
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    });
    if (!studentResponse.ok) {
      const errorBody = await studentResponse.json().catch(() => ({}));
      throw new Error(errorBody.message || errorBody.error || 'No se pudo guardar el estudiante.');
    }

    const attendanceDate = date || new Date().toISOString().slice(0, 10);
    const attendanceQuery = await supabaseFetch(
      `/attendances?student_id=eq.${encodeURIComponent(id)}&date=eq.${encodeURIComponent(attendanceDate)}&subject=eq.${encodeURIComponent(subject)}`
    );
    const existingAttendance = await attendanceQuery.json();
    if (!attendanceQuery.ok) {
      throw new Error(existingAttendance.message || existingAttendance.error || 'No se pudo consultar la asistencia.');
    }

    if (Array.isArray(existingAttendance) && existingAttendance.length) {
      const attendanceId = existingAttendance[0].id;
      const updateResponse = await supabaseFetch(`/attendances?id=eq.${encodeURIComponent(attendanceId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, subject_label: subjectLabel || subject }),
        headers: { Prefer: 'return=representation' },
      });
      if (!updateResponse.ok) {
        const errorBody = await updateResponse.json().catch(() => ({}));
        throw new Error(errorBody.message || errorBody.error || 'No se pudo actualizar la asistencia.');
      }
    } else {
      const insertResponse = await supabaseFetch('/attendances', {
        method: 'POST',
        body: JSON.stringify([{
          student_id: id,
          date: attendanceDate,
          subject,
          subject_label: subjectLabel || subject,
          status,
        }]),
        headers: { Prefer: 'return=representation' },
      });
      if (!insertResponse.ok) {
        const errorBody = await insertResponse.json().catch(() => ({}));
        throw new Error(errorBody.message || errorBody.error || 'No se pudo registrar la asistencia.');
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('attendance API error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
