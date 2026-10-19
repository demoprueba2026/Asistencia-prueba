const nodemailer = require('nodemailer');

const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;

const requireEnv = (res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'No se ha configurado Supabase en el servidor.' });
    return false;
  }
  if (!GMAIL_USER || !GMAIL_PASS) {
    res.status(500).json({ error: 'No se ha configurado Gmail en el servidor.' });
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

const parseStudentRecords = (students) => {
  return students.reduce((acc, student) => {
    acc[student.id] = student;
    return acc;
  }, {});
};

const buildMessage = (student, attendances) => {
  const lines = attendances.map((item) => {
    const status = item.status === 'asistente' ? 'Asistió' : 'No asistió';
    const label = item.subject_label || item.subject;
    return `- ${label}: ${status}`;
  });

  return `Estimado/a representante,

Aquí está el resumen diario de asistencia del estudiante ${student.name} para el ${student.year} Año.

Materias:
${lines.join('\n')}

Este correo se envía automáticamente a las 2:15 PM, hora de Venezuela, con la asistencia registrada hasta ese momento.

Saludos cordiales,
Sistema de Gestión del U.E.P Instituto Libertad Sede Petare`;
};

const sendEmail = async (student, attendances) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Sistema Escolar" <${EMAIL_FROM}>`,
    to: student.email,
    subject: `✅ Resumen diario de asistencia: ${student.name}`,
    text: buildMessage(student, attendances),
  });

  return info;
};

const markAttendancesAsSent = async (attendances) => {
  const ids = attendances.map((item) => item.id).filter((id) => id !== null && id !== undefined);
  if (!ids.length || ids.length !== attendances.length) {
    throw new Error('No se pudieron identificar las asistencias incluidas en el correo.');
  }

  const response = await supabaseFetch(`/attendances?id=in.(${ids.join(',')})&email_sent_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ email_sent_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'No se pudo registrar el envío de asistencia.');
  }
};

const getToday = () => new Date().toISOString().slice(0, 10);

module.exports = async (req, res) => {
  if (!requireEnv(res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const today = getToday();
    // obtener asistencias del día
    const attendancesResponse = await supabaseFetch(`/attendances?date=eq.${encodeURIComponent(today)}&email_sent_at=is.null`);
    const attendances = await attendancesResponse.json();
    if (!attendancesResponse.ok) {
      throw new Error(attendances.message || attendances.error || 'No se pudieron consultar las asistencias de hoy.');
    }
    console.log('cron: attendances fetched count=', Array.isArray(attendances) ? attendances.length : 0);

    if (!Array.isArray(attendances) || !attendances.length) {
      return res.json({ success: true, message: 'No hay registros de asistencia para hoy.' });
    }

    const studentIds = [...new Set(attendances.map((item) => item.student_id))];
    console.log('cron: studentIds raw=', studentIds);
    const studentsResponse = await supabaseFetch('/students?select=id,name,email,year');
    const students = await studentsResponse.json();
    console.log('cron: students fetched count=', Array.isArray(students) ? students.length : 0);
    if (!studentsResponse.ok) {
      throw new Error(students.message || students.error || 'No se pudieron consultar los estudiantes.');
    }
    if (!Array.isArray(students)) {
      throw new Error('Supabase devolvió un formato inválido al consultar los estudiantes.');
    }
    const studentMap = parseStudentRecords(students);

    const grouped = attendances.reduce((acc, item) => {
      if (!acc[item.student_id]) acc[item.student_id] = [];
      acc[item.student_id].push(item);
      return acc;
    }, {});

    const sent = [];
    const emailFailures = [];
    const missingStudents = [];
    const missingEmails = [];
    for (const [studentId, entries] of Object.entries(grouped)) {
      // try direct lookup; also try string/number variants
      let student = studentMap[studentId];
      if (!student) {
        // try numeric key
        student = studentMap[String(studentId)];
      }
      if (!student) {
        missingStudents.push(studentId);
        continue;
      }
      if (!student.email) {
        missingEmails.push(student.id);
        continue;
      }
      try {
        await sendEmail(student, entries);
        await markAttendancesAsSent(entries);
        sent.push(student.email);
      } catch (e) {
        console.error('cron: error sending to', student.email, e);
        emailFailures.push(student.id);
      }
    }

    const result = { success: true, sent, failedEmailCount: emailFailures.length, missingStudents, missingEmails };
    if (req.query && (req.query.debug === '1' || req.query.debug === 'true')) {
      // include intermediate data for debugging
      result.debug = { attendancesCount: attendances.length, studentIds, studentsCount: students.length };
    }

    return res.json(result);
  } catch (error) {
    console.error('cron-daily-emails error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
