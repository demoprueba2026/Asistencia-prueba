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

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasGrades = (grades) => grades && typeof grades === 'object' && Object.keys(grades).length > 0;

const getSupabaseError = (data, fallback) => {
  const message = data.message || data.error || fallback;
  if (/grades.*(schema cache|column)|column.*grades/i.test(message)) {
    return 'Supabase aún no tiene la columna grades. Ejecuta supabase-grades.sql en el editor SQL de Supabase para habilitar el guardado de notas.';
  }
  return message;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Falta SUPABASE_URL o SUPABASE_KEY en Vercel.' });
  }

  try {
    if (req.method === 'GET') {
      const year = req.query?.year;
      const id = req.query?.id;
      const cedula = req.query?.cedula;
      const filters = [];
      if (year) filters.push(`year=eq.${encodeURIComponent(String(year))}`);
      if (id) filters.push(`id=eq.${encodeURIComponent(String(id))}`);
      if (cedula) filters.push(`cedula=eq.${encodeURIComponent(String(cedula))}`);
      const query = `?${['select=*', ...filters, 'order=name.asc'].join('&')}`;
      const response = await supabaseFetch(`/students${query}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || data.error || 'No se pudo consultar estudiantes.' });
      }

      const students = Array.isArray(data) ? data : [];
      const attendanceDate = req.query?.date;
      if (attendanceDate && students.length) {
        const attendanceResponse = await supabaseFetch(
          `/attendances?date=eq.${encodeURIComponent(String(attendanceDate))}&select=student_id,subject,status,email_sent_at`
        );
        const attendanceRows = await attendanceResponse.json().catch(() => []);
        if (!attendanceResponse.ok) {
          return res.status(attendanceResponse.status).json({
            error: attendanceRows.message || attendanceRows.error || 'No se pudo consultar la asistencia por fecha.',
          });
        }

        const studentsById = new Map(students.map((student) => [String(student.id), student]));
        students.forEach((student) => {
          const attendanceByDate = student.attendance_by_date || student.attendanceByDate || {};
          attendanceByDate[attendanceDate] = {};
          student.attendance_by_date = attendanceByDate;
        });
        attendanceRows.forEach((row) => {
          const student = studentsById.get(String(row.student_id));
          if (!student || row.email_sent_at) return;
          const attendanceByDate = student.attendance_by_date;
          attendanceByDate[attendanceDate][row.subject] = row.status;
        });
      }

      return res.status(200).json(students);
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const rawYear = body?.year ?? body?.selectedYear ?? body?.anio ?? body?.anio ?? 1;
      const { id, name, cedula, email, phone, BoletaVisible, paymentStatus, paidAmount, payments, grades, attendance, attendanceByDate } = body || {};
      const year = Number(rawYear);

      if (!name || Number.isNaN(year)) {
        return res.status(400).json({ error: 'Falta nombre o el año es inválido.' });
      }

      const payload = {
        id: id || `student-${Date.now()}`,
        name,
        cedula: cedula || null,
        email: email || null,
        phone: phone || null,
        year,
        status: body?.status || '',
        BoletaVisible: BoletaVisible === 'SI' ? 'SI' : 'NO',
        payment_status: paymentStatus || 'no_pago',
        paid_amount: safeNumber(paidAmount, 0),
        payments: payments || {},
        ...(hasGrades(grades) ? { grades } : {}),
        attendance: attendance || {},
        attendance_by_date: attendanceByDate || {},
      };

      const response = await supabaseFetch('/students?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify([payload]),
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        return res.status(response.status).json({
          error: getSupabaseError(data, 'Supabase rechazó el estudiante.'),
        });
      }

      const saved = Array.isArray(data) ? data[0] : data;
      return res.status(201).json(saved || payload);
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const { id, name, cedula, email, phone, year, BoletaVisible, paymentStatus, paidAmount, payments, grades, attendance, attendanceByDate } = body || {};

      if (!id) {
        return res.status(400).json({ error: 'Falta id del estudiante.' });
      }

      const changes = {};
      if (name !== undefined) changes.name = name;
      if (cedula !== undefined) changes.cedula = cedula;
      if (email !== undefined) changes.email = email;
      if (phone !== undefined) changes.phone = phone;
      if (year !== undefined) changes.year = Number(year);
      if (BoletaVisible !== undefined) changes.BoletaVisible = BoletaVisible === 'SI' ? 'SI' : 'NO';
      if (paymentStatus !== undefined) changes.payment_status = paymentStatus;
      if (paidAmount !== undefined) changes.paid_amount = safeNumber(paidAmount, 0);
      if (payments !== undefined) changes.payments = payments;
      if (hasGrades(grades)) changes.grades = grades;
      if (attendance !== undefined) changes.attendance = attendance;
      if (attendanceByDate !== undefined) changes.attendance_by_date = attendanceByDate;
      if (body?.status !== undefined) changes.status = body.status;

      const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(changes),
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        return res.status(response.status).json({ error: getSupabaseError(data, 'Supabase rechazó la actualización.') });
      }

      const updated = Array.isArray(data) ? data[0] : data;
      return res.status(200).json(updated || { id });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || (await parseBody(req)).id;
      if (!id) {
        return res.status(400).json({ error: 'Falta id para eliminar.' });
      }

      const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      });

      if (response.status === 204 || response.ok) {
        return res.status(200).json({ success: true, id });
      }

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: data.message || data.error || 'No se pudo eliminar el estudiante.' });
    }

    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['GET', 'POST', 'PATCH', 'DELETE'] });
  } catch (error) {
    return res.status(500).json({ error: 'Error en la API de estudiantes.', details: error.message });
  }
};
