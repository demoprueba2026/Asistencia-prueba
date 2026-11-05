try {
  require('dotenv').config();
} catch (e) {}

const {
  SUPABASE_SERVICE_ROLE_KEY,
  isConfigured,
  requireStaff,
  hasPermission,
  getStudentPatchPermissions,
  isYearAllowed,
  filterStudentFieldsForUser,
} = require('../lib/security');

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
  SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim().replace(/^["']|["']$/g, '');

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
const publicPortalRecord = (student) => {
  const isExempt = String(student.cedula || '').trim().replace(/\D/g, '') === '28000002';
  const isAuthorized = String(student.BoletaVisible || '').trim().toUpperCase() === 'SI' || isExempt;
  const publicFields = {
    id: student.id,
    name: student.name,
    cedula: student.cedula,
    year: student.year,
    BoletaVisible: isAuthorized && isExempt ? 'SI' : student.BoletaVisible,
  };
  if (!isAuthorized) return publicFields;
  return {
    ...publicFields,
    payment_status: isExempt ? 'pago' : (student.payment_status || 'no_pago'),
    paid_amount: isExempt ? Math.max(30, safeNumber(student.paid_amount, 0)) : safeNumber(student.paid_amount, 0),
    payments: student.payments || {},
    grades: student.grades || {},
  };
};

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
    return res.status(500).json({
      error: 'Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.',
      hasUrl: Boolean(SUPABASE_URL),
      hasKey: Boolean(SUPABASE_KEY),
      hint: 'Agrégalas en Vercel (Project Settings -> Environment Variables) o en el archivo .env si ejecutas en local.'
    });
  }

  try {
    if (req.method === 'GET') {
        const { year, id, cedula, date } = req.query || {};
        const publicLookup = !req.headers?.authorization && Boolean(id || cedula);
        let staffUser = null;
        if (!publicLookup) {
          staffUser = await requireStaff(req, res, 'students.read');
          if (!staffUser) return;
          if (year && !isYearAllowed(staffUser, year)) {
            return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
          }
          if (date && !hasPermission(staffUser, 'attendance.read') && !hasPermission(staffUser, 'attendance.mark')) {
            return res.status(403).json({ error: 'No tienes permiso para consultar registros de asistencia.' });
          }
        } else if (!isConfigured()) {
          return res.status(503).json({ error: 'El servicio de consulta del portal no está configurado.' });
        }

        const filters = [];
        if (year) filters.push(`year=eq.${encodeURIComponent(String(year))}`);
        if (id) filters.push(`id=eq.${encodeURIComponent(String(id))}`);
        if (cedula) filters.push(`cedula=eq.${encodeURIComponent(String(cedula))}`);
        if (!publicLookup && !year && !staffUser.esAdmin) {
          const allowedYears = staffUser.allowedYears.map(Number).filter(Number.isInteger);
          if (!allowedYears.length) {
            return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
          }
          filters.push(`year=in.(${allowedYears.join(',')})`);
        }
        const columns = publicLookup
          ? 'id,name,cedula,year,"BoletaVisible",payment_status,paid_amount,payments,grades'
          : '*';
        const queryOptions = [`select=${encodeURIComponent(columns)}`, ...filters, 'order=name.asc'];
        if (publicLookup) queryOptions.push('limit=1');
        const query = `?${queryOptions.join('&')}`;
        const response = await supabaseFetch(`/students${query}`);
        const data = await response.json().catch(() => []);
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || data.error || 'No se pudo consultar estudiantes.' });
      }

      const students = Array.isArray(data) ? data : [];
      if (publicLookup) {
        return res.status(200).json(students.map(publicPortalRecord));
      }
      const attendanceDate = date;
      if (attendanceDate && students.length) {
        const attendanceResponse = await supabaseFetch(
          `/attendances?date=eq.${encodeURIComponent(String(attendanceDate))}&select=*`
        );
        const attendanceRows = await attendanceResponse.json().catch(() => []);
        if (attendanceResponse.ok && Array.isArray(attendanceRows)) {
          const studentsById = new Map(students.map((student) => [String(student.id), student]));
          students.forEach((student) => {
            const attendanceByDate = student.attendance_by_date || student.attendanceByDate || {};
            attendanceByDate[attendanceDate] = attendanceByDate[attendanceDate] || {};
            student.attendance_by_date = attendanceByDate;
          });
          attendanceRows.forEach((row) => {
            const student = studentsById.get(String(row.student_id));
            if (!student) return;
            const attendanceByDate = student.attendance_by_date;
            attendanceByDate[attendanceDate][row.subject] = {
              status: row.status,
              teacher: row.teacher || null,
              time: row.created_at || null,
              label: row.subject_label || row.subject,
            };
          });
        }
      }

      if (Array.isArray(students)) {
        students.forEach((student) => {
          if (String(student.cedula || '').trim().replace(/\D/g, '') === '28000002') {
            student.BoletaVisible = 'SI';
            student.payment_status = 'pago';
          }
        });
      }

      return res.status(200).json(students.map((student) => filterStudentFieldsForUser(student, staffUser)));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const rawYear = body?.year ?? body?.selectedYear ?? body?.anio ?? body?.anio ?? 1;
      const { id, name, cedula, email, phone, BoletaVisible, paymentStatus, paidAmount, payments, grades, attendance, attendanceByDate } = body || {};
      const year = Number(rawYear);
      const staffUser = await requireStaff(req, res, 'students.write');
      if (!staffUser) return;
      if (!isYearAllowed(staffUser, year)) {
        return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
      }

      if (!name || Number.isNaN(year)) {
        return res.status(400).json({ error: 'Falta nombre o el año es inválido.' });
      }
      if (hasGrades(grades) && !hasPermission(staffUser, 'students.grades')) {
        return res.status(403).json({ error: 'No tienes permiso para registrar calificaciones.' });
      }
      const hasSensitivePayments = (payments && Object.keys(payments).length > 0)
        || Number(paidAmount) > 0
        || (paymentStatus && paymentStatus !== 'no_pago')
        || BoletaVisible === 'SI';
      if (hasSensitivePayments && !hasPermission(staffUser, 'payments.write')) {
        return res.status(403).json({ error: 'No tienes permiso para modificar pagos o autorizar boletas.' });
      }
      if (Object.keys(attendance || {}).length || Object.keys(attendanceByDate || {}).length) {
        return res.status(400).json({ error: 'Las asistencias deben registrarse desde el endpoint de asistencia.' });
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
        attendance: {},
        attendance_by_date: {},
      };

      const response = await supabaseFetch('/students', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([payload]),
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        return res.status(response.status).json({
          error: getSupabaseError(data, 'Supabase rechazó el estudiante.'),
        });
      }

      const saved = Array.isArray(data) ? data[0] : data;
      return res.status(201).json(filterStudentFieldsForUser(saved || payload, staffUser));
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const { id, name, cedula, email, phone, year, BoletaVisible, paymentStatus, paidAmount, payments, grades, attendance, attendanceByDate } = body || {};
      const patchPermissions = getStudentPatchPermissions(body);
      const staffUser = await requireStaff(req, res, patchPermissions);
      if (!staffUser) return;

      if (!id) {
        return res.status(400).json({ error: 'Falta id del estudiante.' });
      }
      if (year !== undefined && !isYearAllowed(staffUser, year)) {
        return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
      }
      const hasPaymentChange = BoletaVisible !== undefined
        || paymentStatus !== undefined
        || paidAmount !== undefined
        || payments !== undefined;
      if (hasPaymentChange && !hasPermission(staffUser, 'payments.write')) {
        return res.status(403).json({ error: 'No tienes permiso para modificar pagos o autorizar boletas.' });
      }
      if (attendance !== undefined || attendanceByDate !== undefined) {
        return res.status(403).json({ error: 'Las asistencias deben modificarse desde el registro de asistencia.' });
      }
      const allowedYears = staffUser.esAdmin
        ? []
        : staffUser.allowedYears.map(Number).filter(Number.isInteger);
      if (!staffUser.esAdmin && !allowedYears.length) {
        return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
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
      if (grades !== undefined && typeof grades === 'object' && grades !== null) changes.grades = grades;
      if (attendance !== undefined) changes.attendance = attendance;
      if (attendanceByDate !== undefined) changes.attendance_by_date = attendanceByDate;
      if (body?.status !== undefined) changes.status = body.status;

      const yearFilter = staffUser.esAdmin ? '' : `&year=in.(${allowedYears.join(',')})`;
      const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}${yearFilter}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(changes),
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        return res.status(response.status).json({ error: getSupabaseError(data, 'Supabase rechazó la actualización.') });
      }

      const updated = Array.isArray(data) ? data[0] : data;
      return res.status(200).json(updated ? filterStudentFieldsForUser(updated, staffUser) : { id });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || (await parseBody(req)).id;
      const staffUser = await requireStaff(req, res, 'students.write');
      if (!staffUser) return;
      if (!id) {
        return res.status(400).json({ error: 'Falta id para eliminar.' });
      }

      const yearFilter = staffUser.esAdmin
        ? ''
        : `&year=in.(${staffUser.allowedYears.map(Number).filter(Number.isInteger).join(',')})`;
      if (!staffUser.esAdmin && !staffUser.allowedYears.length) {
        return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
      }
      const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}${yearFilter}`, {
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
    console.error('Error en api/students:', error);
    const causeStr = error.cause ? (error.cause.message || error.cause.code || String(error.cause)) : '';
    let diagnostic = '';
    if (SUPABASE_URL.includes('tu-proyecto.supabase.co')) {
      diagnostic = 'Aún tienes el valor de ejemplo "tu-proyecto.supabase.co" en SUPABASE_URL. Debes reemplazarlo con la URL real de tu proyecto Supabase.';
    } else if (/^postgres(ql)?:\/\//i.test(SUPABASE_URL)) {
      diagnostic = 'Configuraste la cadena de conexión de PostgreSQL en SUPABASE_URL. Debes poner la Project URL (ejemplo: https://xxxxxxxx.supabase.co) de Supabase -> Project Settings -> API.';
    } else if (/enotfound/i.test(causeStr)) {
      diagnostic = `No se pudo resolver el dominio de Supabase (${SUPABASE_URL}). Revisa si tu proyecto fue pausado en Supabase o si la URL tiene un error tipográfico.`;
    } else if (/econnrefused|timeout/i.test(causeStr)) {
      diagnostic = 'No se pudo conectar al servidor de Supabase (conexión rechazada o timeout). Verifica que el proyecto esté activo en el panel de Supabase.';
    }

    return res.status(500).json({
      error: 'Error interno en la API de estudiantes.',
      details: error.message || String(error),
      cause: causeStr || undefined,
      urlUsed: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 20)}...` : 'vacía',
      diagnostic: diagnostic || undefined,
      hint: diagnostic || 'Verifica en Supabase que el proyecto no esté en estado Paused (pausado) y que la URL y KEY sean las de Project Settings -> API.'
    });
  }
};
