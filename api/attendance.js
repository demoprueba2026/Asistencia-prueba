const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const parseBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

const supabaseFetch = async (path, options = {}) => {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
};

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Falta SUPABASE_URL o SUPABASE_KEY en Vercel.' });
  }

  try {
    const body = await parseBody(req);
    const { id, name, cedula, email, phone, year, subject, subjectLabel, status, date } = body || {};

    if (!id || !name || !email || !year || !subject || !status) {
      return res.status(400).json({ error: 'Falta id, nombre, correo, año, materia o estado.' });
    }

    const attendanceDate = date || new Date().toISOString().slice(0, 10);

    const studentPayload = {
      id: String(id),
      name,
      cedula: cedula || null,
      email,
      phone: phone || null,
      year: Number(year),
    };

    const studentUpsert = await supabaseFetch('/students?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify([studentPayload]),
    });
    const studentData = await studentUpsert.json().catch(() => []);

    if (!studentUpsert.ok) {
      return res.status(studentUpsert.status).json({
        error: studentData.message || studentData.error || 'No se pudo guardar el estudiante en Supabase.',
      });
    }

    const currentStudentResponse = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}&select=*`);
    const currentStudents = await currentStudentResponse.json().catch(() => []);
    const currentStudent = Array.isArray(currentStudents) && currentStudents.length ? currentStudents[0] : {};

    const attendanceMap = currentStudent.attendance || {};
    attendanceMap[subject] = { status, label: subjectLabel || subject };

    const attendanceByDateMap = currentStudent.attendance_by_date || {};
    attendanceByDateMap[attendanceDate] = attendanceByDateMap[attendanceDate] || {};
    attendanceByDateMap[attendanceDate][subject] = status;

    const patchStudent = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        attendance: attendanceMap,
        attendance_by_date: attendanceByDateMap,
        name,
        cedula: cedula || currentStudent.cedula || null,
        email,
        phone: phone || currentStudent.phone || null,
        year: Number(year),
      }),
    });
    const patchedStudent = await patchStudent.json().catch(() => []);
    if (!patchStudent.ok) {
      return res.status(patchStudent.status).json({
        error: patchedStudent.message || patchedStudent.error || 'No se pudo actualizar la asistencia del estudiante.',
      });
    }

    const attendanceRow = {
      student_id: String(id),
      date: attendanceDate,
      subject,
      subject_label: subjectLabel || subject,
      status,
      email_sent_at: null,
    };

    const attendanceInsert = await supabaseFetch(`/attendances?on_conflict=student_id,date,subject`, {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify([attendanceRow]),
    });
    const attendanceResult = await attendanceInsert.json().catch(() => []);

    if (!attendanceInsert.ok) {
      return res.status(attendanceInsert.status).json({
        error: attendanceResult.message || attendanceResult.error || 'No se pudo registrar la asistencia.',
      });
    }

    return res.status(200).json({
      success: true,
      student: Array.isArray(patchedStudent) ? patchedStudent[0] : patchedStudent,
      attendance: Array.isArray(attendanceResult) ? attendanceResult[0] : attendanceResult,
      date: attendanceDate,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error guardando asistencia en Supabase.',
      details: error.message,
    });
  }
};
