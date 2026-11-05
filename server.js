const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const {
  authenticateStaffRequest,
  hasPermission,
  getStudentPatchPermissions,
  isYearAllowed,
  isSubjectAllowed,
  filterStudentFieldsForUser,
} = require('./lib/security');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WABA_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ATTENDANCE_FILE = path.join(__dirname, 'attendance-data.json');
const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

const timeoutMs = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en Supabase.')), ms));

const supabaseFetch = async (pathName, options = {}) => {
  if (!IS_SUPABASE_CONFIGURED) {
    throw new Error('Supabase no está configurado.');
  }

  const url = `${SUPABASE_URL}/rest/v1${pathName}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await Promise.race([
    fetch(url, { ...options, headers }),
    timeoutMs(15000),
  ]);

  return response;
};

const authorizeStaff = (permission) => async (req, res, next) => {
  try {
    const result = await authenticateStaffRequest(req);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const requiredPermission = typeof permission === 'function' ? permission(req) : permission;
    if (requiredPermission && !hasPermission(result.user, requiredPermission)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta operación.' });
    }
    req.staffUser = result.user;
    req.staffProfile = result.profile;
    req.authUser = result.authUser;
    return next();
  } catch (error) {
    console.error('Error verificando la sesión del personal:', error);
    return res.status(503).json({ error: 'No se pudo verificar la sesión con Supabase Auth.' });
  }
};

const getPortalStudentFields = (student) => {
  const isExempt = String(student.cedula || '').trim().replace(/\D/g, '') === '28000002';
  const isAuthorized = String(student.BoletaVisible || '').trim().toUpperCase() === 'SI' || isExempt;
  const publicFields = {
    id: student.id,
    name: student.name,
    cedula: student.cedula,
    year: student.year,
    BoletaVisible: isExempt ? 'SI' : student.BoletaVisible,
  };
  if (!isAuthorized) return publicFields;
  return {
    ...publicFields,
    payment_status: isExempt ? 'pago' : (student.payment_status || student.paymentStatus || 'no_pago'),
    paid_amount: isExempt ? Math.max(30, Number(student.paid_amount ?? student.paidAmount ?? 0)) : (student.paid_amount ?? student.paidAmount ?? 0),
    payments: student.payments || {},
    grades: student.grades || {},
  };
};

const publicStudentLookup = async (req, res, next) => {
  if (req.headers.authorization || (!req.query.id && !req.query.cedula)) return next();
  try {
    if (IS_SUPABASE_CONFIGURED) {
      const filter = req.query.id
        ? `id=eq.${encodeURIComponent(String(req.query.id))}`
        : `cedula=eq.${encodeURIComponent(String(req.query.cedula))}`;
      const columns = encodeURIComponent('id,name,cedula,year,"BoletaVisible",payment_status,paid_amount,payments,grades');
      const response = await supabaseFetch(`/students?select=${columns}&${filter}&limit=1`);
      const rows = await response.json().catch(() => []);
      if (!response.ok) return res.status(response.status).json({ error: 'No se pudo consultar la boleta.' });
      return res.json(Array.isArray(rows) ? rows.map(getPortalStudentFields) : []);
    }

    const data = loadAttendanceData();
    const student = req.query.id
      ? data.students[String(req.query.id)]
      : Object.values(data.students).find((row) => String(row.cedula || '') === String(req.query.cedula));
    return res.json(student ? [getPortalStudentFields(normalizeStudentRecord(student))] : []);
  } catch (error) {
    console.error('Error consultando la boleta por identificador:', error);
    return res.status(500).json({ error: 'No se pudo consultar la boleta.' });
  }
};

const loadAttendanceData = () => {
  try {
    if (!fs.existsSync(ATTENDANCE_FILE)) {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({ students: {}, lastDailyEmailSentDate: '' }, null, 2));
    }
    const raw = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      students: parsed.students || {},
      lastDailyEmailSentDate: parsed.lastDailyEmailSentDate || '',
    };
  } catch (error) {
    console.error('Error leyendo attendance-data.json:', error);
    return { students: {}, lastDailyEmailSentDate: '' };
  }
};

const saveAttendanceData = (data) => {
  try {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando attendance-data.json:', error);
  }
};

const normalizeStudentRecord = (row = {}, fallbackYear = 1) => {
  const year = Number(row.year ?? row.anio ?? row.ano ?? fallbackYear ?? 1);
  const isExempt = String(row.cedula || '').trim().replace(/\D/g, '') === '28000002';
  return {
    id: row.id ?? row.student_id ?? row.studentId ?? `student-${Date.now()}`,
    name: row.name || '',
    cedula: row.cedula || (isExempt ? '28000002' : ''),
    email: row.email || '',
    phone: row.phone || '',
    grades: row.grades || {},
    year,
    status: row.status || '',
    paymentStatus: isExempt ? 'pago' : (row.payment_status || row.paymentStatus || 'no_pago'),
    paidAmount: isExempt ? Math.max(30, Number(row.paid_amount ?? row.paidAmount ?? 0)) : Number(row.paid_amount ?? row.paidAmount ?? 0),
    payments: row.payments || {},
    BoletaVisible: isExempt ? 'SI' : (row.BoletaVisible || row.boleta_visible || 'NO'),
    attendance: row.attendance || row.attendance_json || {},
    attendanceByDate: row.attendance_by_date || row.attendanceByDate || {},
  };
};

const hasGrades = (grades) => grades && typeof grades === 'object' && Object.keys(grades).length > 0;

const toSafeStudentPayload = (student = {}, dateOverride = null) => ({
  id: student.id,
  name: student.name || '',
  cedula: student.cedula || null,
  email: student.email || null,
  phone: student.phone || null,
  ...(hasGrades(student.grades) ? { grades: student.grades } : {}),
  year: Number(student.year || 1),
  status: student.status || '',
  payment_status: student.paymentStatus || 'no_pago',
  paid_amount: Number(student.paidAmount ?? 0),
  payments: student.payments || {},
  BoletaVisible: student.BoletaVisible || 'NO',
  attendance: student.attendance || {},
  attendance_by_date: student.attendanceByDate || (dateOverride ? { [dateOverride]: {} } : {}),
});

const syncLocalStudent = (student) => {
  const data = loadAttendanceData();
  const id = String(student.id);
  const baseStudent = data.students[id] || { id, attendance: {}, attendanceByDate: {} };
  const item = { ...baseStudent, ...normalizeStudentRecord(student, Number(student.year || baseStudent.year || 1)) };
  if (!item.attendance) item.attendance = {};
  if (!item.attendanceByDate) item.attendanceByDate = {};
  data.students[id] = item;
  saveAttendanceData(data);
};

const createStudentInSupabase = async (student) => {
  const payload = [toSafeStudentPayload(student)];
  const response = await supabaseFetch('/students', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { Prefer: 'return=representation' },
  });
  const result = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Supabase rechazó el estudiante.');
  }

  return Array.isArray(result) && result.length ? normalizeStudentRecord(result[0], Number(student.year || 1)) : normalizeStudentRecord(payload[0], Number(student.year || 1));
};

const patchStudentToSupabase = async (id, changes, allowedYears) => {
  const payload = { ...changes };
  if (payload.attendance !== undefined) payload.attendance = payload.attendance;
  if (payload.attendance_by_date !== undefined) payload.attendance_by_date = payload.attendance_by_date;

  const yearFilter = Array.isArray(allowedYears)
    ? `&year=in.(${allowedYears.map(Number).filter(Number.isInteger).join(',')})`
    : '';
  const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(id)}${yearFilter}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { Prefer: 'return=representation' },
  });
  const result = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Supabase rechazó la actualización del estudiante.');
  }
  if (!Array.isArray(result) || !result.length) {
    throw new Error('Estudiante no encontrado en Supabase.');
  }
  return normalizeStudentRecord(result[0]);
};

const deleteStudentFromSupabase = async (id, allowedYears) => {
  const yearFilter = Array.isArray(allowedYears)
    ? `&year=in.(${allowedYears.map(Number).filter(Number.isInteger).join(',')})`
    : '';
  const response = await supabaseFetch(`/students?id=eq.${encodeURIComponent(id)}${yearFilter}`, { method: 'DELETE' });
  if (response.status === 204) return { success: true };
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Supabase rechazó la eliminación.');
  }
  return result;
};

const getStudentsFromSupabase = async (year, date, allowedYears) => {
  const yearFilter = year
    ? `year=eq.${encodeURIComponent(String(year))}`
    : Array.isArray(allowedYears)
      ? `year=in.(${allowedYears.map(Number).filter(Number.isInteger).join(',')})`
      : '';
  const query = yearFilter ? `?${yearFilter}` : '';
  const response = await supabaseFetch(`/students${query}`);
  const result = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(result.message || result.error || 'No se pudo consultar Supabase.');
  }
  const students = Array.isArray(result) ? result.map((row) => normalizeStudentRecord(row, Number(year || row.year || 1))) : [];
  if (date && students.length) {
    try {
      const attendanceResponse = await supabaseFetch(
        `/attendances?date=eq.${encodeURIComponent(String(date))}&select=student_id,subject,status,email_sent_at`
      );
      const attendanceRows = await attendanceResponse.json().catch(() => []);
      if (attendanceResponse.ok && Array.isArray(attendanceRows)) {
        const map = new Map(students.map((s) => [String(s.id), s]));
        attendanceRows.forEach((row) => {
          const student = map.get(String(row.student_id));
          if (!student) return;
          student.attendanceByDate = student.attendanceByDate || {};
          student.attendanceByDate[date] = student.attendanceByDate[date] || {};
          student.attendanceByDate[date][row.subject] = row.status;
        });
      }
    } catch (e) {
      console.warn('No se pudo consultar asistencias por fecha en Supabase:', e);
    }
  }
  return students;
};

const writeAttendanceToSupabase = async ({ id, name, cedula, email, phone, year, subject, subjectLabel, status, date, teacher, time }) => {
  const attendanceDate = date || new Date().toISOString().slice(0, 10);
  const markTime = time || new Date().toISOString();
  const studentPayload = {
    id,
    name,
    cedula: cedula || null,
    email: email || null,
    phone: phone || null,
    year: Number(year),
  };

  const studentResponse = await supabaseFetch('/students?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([studentPayload]),
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
  });
  const studentResult = await studentResponse.json().catch(() => []);
  if (!studentResponse.ok) {
    throw new Error(studentResult.message || studentResult.error || 'No se pudo guardar el estudiante en Supabase.');
  }

  const currentStudentResponse = await supabaseFetch(`/students?id=eq.${encodeURIComponent(id)}`);
  const currentStudents = await currentStudentResponse.json().catch(() => []);
  const currentStudent = Array.isArray(currentStudents) && currentStudents.length ? currentStudents[0] : {};
  const attendanceMap = currentStudent.attendance || {};
  const byDate = currentStudent.attendance_by_date || {};
  attendanceMap[subject] = { status, label: subjectLabel || subject, teacher: teacher || null, time: markTime };
  byDate[attendanceDate] = byDate[attendanceDate] || {};
  byDate[attendanceDate][subject] = { status, teacher: teacher || null, time: markTime };

  await supabaseFetch(`/students?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      attendance: attendanceMap,
      attendance_by_date: byDate,
    }),
    headers: { Prefer: 'return=representation' },
  });

  const query = `/attendances?student_id=eq.${encodeURIComponent(id)}&date=eq.${encodeURIComponent(attendanceDate)}&subject=eq.${encodeURIComponent(subject)}`;
  const existingResponse = await supabaseFetch(query);
  const existingRows = await existingResponse.json().catch(() => []);
  if (!existingResponse.ok) {
    throw new Error(existingRows.message || existingRows.error || 'No se pudo consultar la asistencia en Supabase.');
  }

  const attendanceRow = {
    student_id: id,
    date: attendanceDate,
    subject,
    subject_label: subjectLabel || subject,
    status,
    teacher: teacher || null,
    created_at: new Date().toISOString(),
  };

  if (Array.isArray(existingRows) && existingRows.length) {
    const updateResponse = await supabaseFetch(`/attendances?id=eq.${encodeURIComponent(existingRows[0].id)}`, {
      method: 'PATCH',
      body: JSON.stringify(attendanceRow),
      headers: { Prefer: 'return=representation' },
    });
    const updateResult = await updateResponse.json().catch(() => []);
    if (!updateResponse.ok) {
      throw new Error(updateResult.message || updateResult.error || 'No se pudo actualizar la asistencia en Supabase.');
    }
    return Array.isArray(updateResult) && updateResult.length ? updateResult[0] : updateResult;
  }

  const insertResponse = await supabaseFetch('/attendances', {
    method: 'POST',
    body: JSON.stringify([attendanceRow]),
    headers: { Prefer: 'return=representation' },
  });
  const insertResult = await insertResponse.json().catch(() => []);
  if (!insertResponse.ok) {
    throw new Error(insertResult.message || insertResult.error || 'No se pudo registrar la asistencia en Supabase.');
  }
  return Array.isArray(insertResult) && insertResult.length ? insertResult[0] : insertResult;
};

// Hora de envío diaria en Venezuela (por defecto 12:00)
const DAILY_SEND_HOUR = Number(process.env.DAILY_SEND_HOUR || 12);
const DAILY_SEND_MINUTE = Number(process.env.DAILY_SEND_MINUTE || 0);
const getNextNoonDelay = () => {
  const now = new Date();
  const nextSend = new Date(now);
  nextSend.setHours(DAILY_SEND_HOUR, DAILY_SEND_MINUTE, 0, 0);
  if (now >= nextSend) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  return nextSend - now;
};

const buildStudentAttendanceMessage = (student) => {
  const attendanceEntries = Object.entries(student.attendance || {});
  const rows = attendanceEntries.map(([subjectId, entry]) => {
    const label = typeof entry === 'object' ? (entry.label || subjectId) : subjectId;
    const savedStatus = typeof entry === 'object' ? entry.status : entry;
    const status = savedStatus === 'asistente' ? 'Asistió' : 'No asistió';
    return `- ${label}: ${status}`;
  });

  return `Estimado/a representante,

Aquí está el resumen diario de asistencia del estudiante ${student.name} para el ${student.year} año.

Materias:
${rows.join('\n')}

Este correo se envía automáticamente a las ${DAILY_SEND_HOUR}:${String(DAILY_SEND_MINUTE).padStart(2,'0')} hora de Venezuela con la asistencia registrada hasta ese momento.

Saludos cordiales,
Sistema de Gestión del U.E.P Instituto Libertad Sede Petare`;
};

const sendEmailToStudent = async (student) => {
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.warn('No se ha configurado Gmail en el servidor. No se envía correo.');
    return;
  }
  if (!student.email) return;
  if (!student.attendance || !Object.keys(student.attendance).length) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Sistema Escolar" <${EMAIL_FROM}>`,
    to: student.email,
    subject: `✅ Resumen diario de asistencia: ${student.name}`,
    text: buildStudentAttendanceMessage(student),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo diario enviado a ${student.email}: ${info.messageId}`);
  } catch (error) {
    console.error(`Error enviando correo diario a ${student.email}:`, error);
  }
};

const sendDailyAttendanceEmails = async () => {
  const data = loadAttendanceData();
  const today = new Date().toISOString().slice(0, 10);
  if (data.lastDailyEmailSentDate === today) {
    console.log('El resumen diario ya se envió hoy.');
    return;
  }

  const students = Object.values(data.students).filter((student) => student.email && student.attendance && Object.keys(student.attendance).length);
  if (!students.length) {
    console.log('No hay estudiantes con asistencia registrada para enviar.');
    return;
  }

  for (const student of students) {
    await sendEmailToStudent(student);
  }

  data.lastDailyEmailSentDate = today;
  saveAttendanceData(data);
  console.log('Resumen diario enviado y fecha registrada:', today);
};

const scheduleDailyAttendanceEmails = () => {
  const delay = getNextNoonDelay();
  const minutes = Math.round(delay / 1000 / 60);
  console.log(`Próximo envío diario programado en ${minutes} minutos (a las ${DAILY_SEND_HOUR}:${String(DAILY_SEND_MINUTE).padStart(2,'0')}).`);
  setTimeout(async () => {
    await sendDailyAttendanceEmails();
    scheduleDailyAttendanceEmails();
  }, delay);
};

if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn('WARNING: Falta GMAIL_USER o GMAIL_PASS en el archivo .env');
}

if (IS_SUPABASE_CONFIGURED) {
  console.log('Supabase conectado. La app usará la base de datos de Supabase y mantendrá respaldo local.');
} else {
  console.log('Supabase no configurado. La app continúa con respaldo local en attendance-data.json.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.all('/api/session', (req, res) => require('./api/session')(req, res));

app.get('/api/students', publicStudentLookup, authorizeStaff('students.read'), async (req, res) => {
  try {
    if (req.query.date && !hasPermission(req.staffUser, 'attendance.read') && !hasPermission(req.staffUser, 'attendance.mark')) {
      return res.status(403).json({ error: 'No tienes permiso para consultar registros de asistencia.' });
    }
    const year = req.query.year ? Number(req.query.year) : null;
    if (year && !isYearAllowed(req.staffUser, year)) {
      return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
    }
    const allowedYears = req.staffUser.esAdmin ? undefined : req.staffUser.allowedYears;
    if (!req.staffUser.esAdmin && !allowedYears.length) {
      return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
    }
    if (IS_SUPABASE_CONFIGURED) {
      const students = await getStudentsFromSupabase(req.query.year, req.query.date, allowedYears);
      return res.json(students.map((student) => filterStudentFieldsForUser(student, req.staffUser)));
    }

    const data = loadAttendanceData();
    const students = Object.values(data.students)
      .filter((student) => !year || Number(student.year) === year)
      .filter((student) => req.staffUser.esAdmin || allowedYears.map(Number).includes(Number(student.year)))
      .map(normalizeStudentRecord);
    return res.json(students.map((student) => filterStudentFieldsForUser(student, req.staffUser)));
  } catch (error) {
    console.error('Error cargando estudiantes:', error);
    return res.status(500).json({ error: error.message || 'No se pudo cargar la lista de estudiantes.' });
  }
});

app.post('/api/students', authorizeStaff('students.write'), async (req, res) => {
  const { id, name, cedula, email, phone, year, BoletaVisible, paymentStatus, paidAmount, payments, grades } = req.body || {};
  if (!name || !year) {
    return res.status(400).json({ error: 'Falta nombre o año.' });
  }
  if (!isYearAllowed(req.staffUser, year)) {
    return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
  }
  if (hasGrades(grades) && !hasPermission(req.staffUser, 'students.grades')) {
    return res.status(403).json({ error: 'No tienes permiso para registrar calificaciones.' });
  }
  const hasSensitivePayments = (payments && Object.keys(payments).length > 0)
    || Number(paidAmount) > 0
    || (paymentStatus && paymentStatus !== 'no_pago')
    || BoletaVisible === 'SI';
  if (hasSensitivePayments && !hasPermission(req.staffUser, 'payments.write')) {
    return res.status(403).json({ error: 'No tienes permiso para modificar pagos o autorizar boletas.' });
  }

  try {
    const student = {
      id: id || `student-${Date.now()}`,
      name,
      cedula: cedula || '',
      email: email || '',
      phone: phone || '',
      year: Number(year),
      BoletaVisible: BoletaVisible === 'SI' ? 'SI' : 'NO',
      paymentStatus: paymentStatus || 'no_pago',
      paidAmount: Number(paidAmount || 0),
      payments: payments || {},
      ...(hasGrades(grades) ? { grades } : {}),
      attendance: {},
      attendanceByDate: {},
    };

    if (IS_SUPABASE_CONFIGURED) {
      const savedStudent = await createStudentInSupabase(student);
      syncLocalStudent(savedStudent);
      return res.status(201).json(filterStudentFieldsForUser(savedStudent, req.staffUser));
    }

    const data = loadAttendanceData();
    const studentId = student.id;
    if (data.students[studentId]) {
      return res.status(409).json({ error: 'Ya existe un estudiante con ese identificador.' });
    }
    data.students[studentId] = student;
    saveAttendanceData(data);
    return res.status(201).json(filterStudentFieldsForUser(student, req.staffUser));
  } catch (error) {
    console.error('Error guardando estudiante:', error);
    return res.status(500).json({ error: error.message || 'No se pudo guardar el estudiante.' });
  }
});

app.patch('/api/students', authorizeStaff((req) => getStudentPatchPermissions(req.body)), async (req, res) => {
  const { id, name, cedula, email, phone, year, BoletaVisible, payments, paymentStatus, paidAmount, grades } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Falta id del estudiante.' });
  }
  if (year !== undefined && !isYearAllowed(req.staffUser, year)) {
    return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
  }
  const hasPaymentChange = BoletaVisible !== undefined
    || paymentStatus !== undefined
    || paidAmount !== undefined
    || payments !== undefined;
  if (hasPaymentChange && !hasPermission(req.staffUser, 'payments.write')) {
    return res.status(403).json({ error: 'No tienes permiso para modificar pagos o autorizar boletas.' });
  }
  if (req.body.attendance !== undefined || req.body.attendanceByDate !== undefined) {
    return res.status(403).json({ error: 'Las asistencias deben modificarse desde el registro de asistencia.' });
  }
  const allowedYears = req.staffUser.esAdmin
    ? undefined
    : req.staffUser.allowedYears.map(Number).filter(Number.isInteger);
  if (!req.staffUser.esAdmin && !allowedYears.length) {
    return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
  }
  try {
    const changes = {
      name,
      cedula,
      email,
      phone,
      year: year === undefined ? undefined : Number(year),
      BoletaVisible,
      payments,
      ...(hasGrades(grades) ? { grades } : {}),
      payment_status: paymentStatus,
      paid_amount: paidAmount === undefined ? undefined : Number(paidAmount),
    };

    if (req.body && typeof req.body === 'object' && req.body.attendance !== undefined) {
      changes.attendance = req.body.attendance;
    }
    if (req.body && typeof req.body === 'object' && req.body.attendanceByDate !== undefined) {
      changes.attendance_by_date = req.body.attendanceByDate;
    }

    Object.keys(changes).forEach((key) => {
      if (changes[key] === undefined) delete changes[key];
    });

    if (IS_SUPABASE_CONFIGURED) {
      const updated = await patchStudentToSupabase(id, changes, allowedYears);
      syncLocalStudent(updated);
      return res.json(filterStudentFieldsForUser(updated, req.staffUser));
    }

    const data = loadAttendanceData();
    const student = data.students[id];
    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }
    if (!isYearAllowed(req.staffUser, student.year)) {
      return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
    }
    if (name !== undefined) student.name = name;
    if (cedula !== undefined) student.cedula = cedula;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (year !== undefined) student.year = Number(year);
    if (BoletaVisible !== undefined) student.BoletaVisible = BoletaVisible;
    if (payments !== undefined) student.payments = payments;
    if (hasGrades(grades)) student.grades = grades;
    if (paymentStatus !== undefined) student.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) student.paidAmount = paidAmount;
    data.students[id] = student;
    saveAttendanceData(data);
    return res.json(filterStudentFieldsForUser(student, req.staffUser));
  } catch (error) {
    console.error('Error actualizando estudiante:', error);
    return res.status(500).json({ error: error.message || 'No se pudo actualizar el estudiante.' });
  }
});

app.delete('/api/students', authorizeStaff('students.write'), async (req, res) => {
  const id = req.query.id || req.body?.id;
  if (!id) {
    return res.status(400).json({ error: 'Falta id del estudiante.' });
  }
  if (!req.staffUser.esAdmin && !req.staffUser.allowedYears.length) {
    return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
  }

  try {
    if (IS_SUPABASE_CONFIGURED) {
      const result = await deleteStudentFromSupabase(
        id,
        req.staffUser.esAdmin ? undefined : req.staffUser.allowedYears
      );
      const data = loadAttendanceData();
      delete data.students[id];
      saveAttendanceData(data);
      return res.json({ success: true, id, ...result });
    }

    const data = loadAttendanceData();
    if (!data.students[id]) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }
    if (!isYearAllowed(req.staffUser, data.students[id].year)) {
      return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
    }
    delete data.students[id];
    saveAttendanceData(data);
    return res.json({ success: true, id });
  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    return res.status(500).json({ error: error.message || 'No se pudo eliminar el estudiante.' });
  }
});

app.get('/api/sync-state', authorizeStaff('students.read'), async (req, res) => {
  try {
    if (!req.staffUser.esAdmin && !req.staffUser.allowedYears.length) {
      return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
    }
    const students = IS_SUPABASE_CONFIGURED
      ? await getStudentsFromSupabase(undefined, undefined, req.staffUser.esAdmin ? undefined : req.staffUser.allowedYears)
      : Object.values(loadAttendanceData().students)
        .filter((student) => req.staffUser.esAdmin || req.staffUser.allowedYears.map(Number).includes(Number(student.year)))
    const years = {};
    students.forEach((student) => {
      const year = Number(student.year || 1);
      if (!years[year]) years[year] = { students: [] };
      years[year].students.push(filterStudentFieldsForUser(student, req.staffUser));
    });
    res.json({ years, boletaVisibleState: 'NO' });
  } catch (error) {
    console.error('Error cargando estado de sincronización:', error);
    res.status(500).json({ error: error.message || 'No se pudo consultar el estado.' });
  }
});

app.post('/api/attendance', authorizeStaff('attendance.mark'), async (req, res) => {
  const { id, year, subject, subjectLabel, status, date, time } = req.body || {};
  if (!id || !year || !subject || !status) {
    return res.status(400).json({ error: 'Falta id, año, materia o estado.' });
  }
  if (!isYearAllowed(req.staffUser, year)) {
    return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
  }
  if (!isSubjectAllowed(req.staffUser, year, subject)) {
    return res.status(403).json({ error: 'No tienes permiso para registrar esta materia.' });
  }
  if (!['asistente', 'inasistente'].includes(String(status).toLowerCase())) {
    return res.status(400).json({ error: 'El estado de asistencia no es válido.' });
  }

  try {
    const data = loadAttendanceData();
    const currentStudent = IS_SUPABASE_CONFIGURED
      ? (await getStudentsFromSupabase(year)).find((student) => String(student.id) === String(id))
      : data.students[String(id)];
    if (!currentStudent) return res.status(404).json({ error: 'No se encontró el estudiante.' });
    if (Number(currentStudent.year) !== Number(year)) {
      return res.status(403).json({ error: 'El estudiante no pertenece al año académico seleccionado.' });
    }

    const name = currentStudent.name;
    const cedula = currentStudent.cedula || '';
    const email = currentStudent.email || '';
    const phone = currentStudent.phone || '';
    const teacher = req.staffUser.name;
    const attendanceDate = date || new Date().toISOString().slice(0, 10);
    const markTime = time || new Date().toISOString();
    const normalizedStatus = String(status).toLowerCase();
    if (IS_SUPABASE_CONFIGURED) {
      await writeAttendanceToSupabase({
        id, name, cedula, email, phone, year, subject, subjectLabel,
        status: normalizedStatus, date: attendanceDate, teacher,
      });
      currentStudent.name = name;
      currentStudent.email = email;
      currentStudent.phone = phone || '';
      currentStudent.year = Number(year);
      currentStudent.attendance = currentStudent.attendance || {};
      currentStudent.attendance[subject] = { status: normalizedStatus, label: subjectLabel || subject, teacher, time: markTime };
      currentStudent.attendanceByDate = currentStudent.attendanceByDate || {};
      currentStudent.attendanceByDate[attendanceDate] = currentStudent.attendanceByDate[attendanceDate] || {};
      currentStudent.attendanceByDate[attendanceDate][subject] = { status: normalizedStatus, teacher, time: markTime };
      data.students[id] = currentStudent;
      saveAttendanceData(data);

      return res.json({ ...filterStudentFieldsForUser(currentStudent, req.staffUser), success: true });
    }

    currentStudent.name = name;
    currentStudent.cedula = cedula || currentStudent.cedula || '';
    currentStudent.email = email;
    currentStudent.phone = phone || currentStudent.phone || '';
    currentStudent.year = Number(year);
    currentStudent.attendance = currentStudent.attendance || {};
    currentStudent.attendance[subject] = { status: normalizedStatus, label: subjectLabel || subject, teacher, time: markTime };
    currentStudent.attendanceByDate = currentStudent.attendanceByDate || {};
    currentStudent.attendanceByDate[attendanceDate] = currentStudent.attendanceByDate[attendanceDate] || {};
    currentStudent.attendanceByDate[attendanceDate][subject] = { status: normalizedStatus, teacher, time: markTime };
    data.students[id] = currentStudent;
    saveAttendanceData(data);

    return res.json({ ...filterStudentFieldsForUser(currentStudent, req.staffUser), success: true });
  } catch (error) {
    console.error('Error guardando asistencia:', error);
    return res.status(500).json({ error: error.message || 'No se pudo guardar la asistencia.' });
  }
});

app.get('/api/attendance', authorizeStaff('attendance.read'), async (req, res) => {
  const { date, year, subject } = req.query || {};
  const allowedYears = req.staffUser.esAdmin ? undefined : req.staffUser.allowedYears.map(Number);
  if (!req.staffUser.esAdmin && !allowedYears.length) {
    return res.status(403).json({ error: 'Esta cuenta no tiene años académicos asignados.' });
  }
  if (date && IS_SUPABASE_CONFIGURED) {
    try {
      let query = `?select=*&order=created_at.asc&date=eq.${encodeURIComponent(String(date))}`;
      if (subject && subject !== 'todas' && subject !== 'general') {
        query += `&subject=eq.${encodeURIComponent(String(subject))}`;
      }
      if (allowedYears) {
        const rosterResponse = await supabaseFetch(
          `/students?select=id&year=in.(${allowedYears.join(',')})`
        );
        const roster = await rosterResponse.json().catch(() => []);
        if (!rosterResponse.ok) {
          return res.status(rosterResponse.status).json({ error: 'No se pudieron verificar los años autorizados.' });
        }
        const ids = Array.isArray(roster)
          ? roster.map((student) => encodeURIComponent(String(student.id)))
          : [];
        if (!ids.length) return res.json([]);
        query += `&student_id=in.(${ids.join(',')})`;
      }
      const response = await supabaseFetch(`/attendances${query}`);
      const data = await response.json().catch(() => []);
      if (response.ok && Array.isArray(data)) {
        return res.json(data);
      }
    } catch (e) {}
  }
  const data = loadAttendanceData();
  if (date) {
    const records = [];
    Object.values(data.students || {}).forEach((student) => {
      if (!req.staffUser.esAdmin && !isYearAllowed(req.staffUser, student.year)) return;
      const byDate = student.attendanceByDate?.[date] || {};
      Object.entries(byDate).forEach(([sub, info]) => {
        if (subject && subject !== 'todas' && sub !== subject) return;
        records.push({
          student_id: student.id,
          student_name: student.name,
          date,
          subject: sub,
          status: typeof info === 'object' ? (info.status || 'asistente') : info,
          teacher: typeof info === 'object' ? info.teacher : null,
          created_at: typeof info === 'object' ? info.time : null,
        });
      });
    });
    return res.json(records);
  }
  if (year && !isYearAllowed(req.staffUser, year)) {
    return res.status(403).json({ error: 'No tienes acceso a este año académico.' });
  }
  const students = Object.values(data.students)
    .filter((student) => !year || String(student.year) === String(year))
    .filter((student) => req.staffUser.esAdmin || allowedYears.includes(Number(student.year)));
  if (!req.staffUser.puedeVerDatosPersonales && !req.staffUser.esAdmin) {
    students.forEach((student) => {
      delete student.cedula;
      delete student.email;
      delete student.phone;
      delete student.payments;
      delete student.paymentStatus;
      delete student.paidAmount;
    });
  }
  if (!hasPermission(req.staffUser, 'students.grades')) {
    students.forEach((student) => {
      delete student.grades;
    });
  }
  if (!hasPermission(req.staffUser, 'attendance.read') && !hasPermission(req.staffUser, 'attendance.mark')) {
    students.forEach((student) => {
      delete student.attendance;
      delete student.attendanceByDate;
      delete student.attendance_by_date;
    });
  }
  res.json({ students, lastDailyEmailSentDate: data.lastDailyEmailSentDate });
});

app.post('/api/send-daily-emails', authorizeStaff('students.write'), async (req, res) => {
  try {
    await sendDailyAttendanceEmails();
    res.json({ success: true, message: 'Envio diario ejecutado.' });
  } catch (error) {
    console.error('Error forzando envío diario:', error);
    res.status(500).json({ error: 'No se pudo ejecutar el envío diario.' });
  }
});

app.all('/api/cron-daily-emails', async (req, res) => {
  try {
    return require('./cron-daily-emails')(req, res);
  } catch (error) {
    console.error('Error en cron-daily-emails:', error);
    res.status(500).json({ error: 'Error ejecutando cron-daily-emails.' });
  }
});

app.post('/api/send-whatsapp', authorizeStaff('students.write'), async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Falta el número de destino o el mensaje.' });
  }

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ error: 'No se ha configurado WhatsApp Business API en el servidor.' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error enviando WhatsApp:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error enviando el mensaje por WhatsApp.' });
  }
});

app.post('/api/send-email', authorizeStaff('students.write'), async (req, res) => {
  const { to, subject, message, fromName } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'Falta destinatario, asunto o mensaje.' });
  }

  if (!GMAIL_USER || !GMAIL_PASS) {
    return res.status(500).json({ error: 'No se ha configurado Gmail en el servidor.' });
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

    return res.json({ success: true, data: info });
  } catch (error) {
    console.error('Error enviando correo:', error);
    return res.status(500).json({ error: error.message || 'Error al enviar el correo.', details: error.toString() });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: el puerto ${PORT} ya está en uso. Cierra el proceso que usa el puerto o cambia PORT en .env.`);
    process.exit(1);
  }
  console.error('Error en el servidor:', error);
});

scheduleDailyAttendanceEmails();
