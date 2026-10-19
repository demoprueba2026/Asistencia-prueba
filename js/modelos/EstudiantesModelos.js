const parsePayments = (val) => {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return { ...val };
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const getMesActualId = () => {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return meses[new Date().getMonth()] || 'inscripcion';
};

const normalizarPagosEstudiante = (student) => {
  if (!student) return {};
  student.payments = parsePayments(student.payments);
  if (Object.keys(student.payments).length === 0 && student.paymentStatus && student.paymentStatus !== 'no_pago') {
    const mes = getMesActualId();
    student.payments[mes] = {
      status: student.paymentStatus,
      amount: normalizarMontoPago(student.paidAmount),
      date: student.paymentDate || new Date().toISOString().slice(0, 10),
    };
  }
  return student.payments;
};

const normalizeStudentYearData = (data) => {
  const normalized = data && typeof data === 'object' ? data : { years: {} };
  normalized.years = normalized.years || {};

  const legacyStudents = Array.isArray(normalized.students)
    ? normalized.students
    : Object.values(normalized.students || {});

  if (legacyStudents.length) {
    legacyStudents.forEach((student) => {
      if (!student || !student.id) return;
      const year = Number(student.year || student.ano || student.anio || 1);
      const studentsByYear = ensureYearStudents.call({ years: normalized.years }, year);
      const exists = studentsByYear.some((item) => String(item.id) === String(student.id));
      if (!exists) {
        const studentObj = {
          ...student,
          year,
          paymentStatus: student.paymentStatus || 'no_pago',
          paidAmount: student.paidAmount || 0,
          payments: parsePayments(student.payments),
          BoletaVisible: String(student.BoletaVisible || student.boleta_visible || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
          attendance: student.attendance || {},
          attendanceByDate: student.attendanceByDate || student.attendance_by_date || {
            [selectedDate]: Object.fromEntries(Object.entries(student.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
          },
        };
        normalizarPagosEstudiante(studentObj);
        studentsByYear.push(studentObj);
      }
    });
    delete normalized.students;
  }

  Object.keys(normalized.years).forEach((year) => {
    normalized.years[year].students = (normalized.years[year].students || []).map((student) => {
      const studentObj = {
        ...student,
        paymentStatus: student.paymentStatus || 'no_pago',
        paidAmount: student.paidAmount || 0,
        payments: parsePayments(student.payments),
        BoletaVisible: String(student.BoletaVisible || student.boleta_visible || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
        attendance: student.attendance || {},
        attendanceByDate: student.attendanceByDate || student.attendance_by_date || {
          [selectedDate]: Object.fromEntries(Object.entries(student.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
        },
        year: Number(student.year || year),
      };
      normalizarPagosEstudiante(studentObj);
      return studentObj;
    });
  });

  for (let year = 1; year <= 5; year += 1) {
    ensureYearStudents.call({ years: normalized.years }, year);
  }

  return normalized;
};

const cargarTodosLosEstudiantesDesdeSupabase = async () => {
  const emptyYears = {};
  for (let year = 1; year <= 5; year += 1) {
    emptyYears[year] = { students: [] };
  }

  attendanceData = normalizeStudentYearData({ years: emptyYears, selectedDate });
  attendanceData.selectedDate = selectedDate;

  try {
    const response = await fetch(API_STUDENTS, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      console.warn('No se pudo cargar todos los estudiantes desde Supabase; se muestra estado vacío en memoria.');
      return;
    }

    const data = await response.json().catch(() => []);
    if (!Array.isArray(data)) return;

    data.forEach((row) => {
      const year = Number(row.year || 1);
      attendanceData.years[year] = attendanceData.years[year] || { students: [] };
      const studentObj = {
        id: row.id,
        name: row.name,
        cedula: row.cedula || '',
        email: row.email || '',
        phone: row.phone || '',
        grades: row.grades || {},
        status: row.status || '',
        paymentStatus: row.paymentStatus || row.payment_status || 'no_pago',
        paidAmount: row.paidAmount ?? row.paid_amount ?? 0,
        payments: parsePayments(row.payments),
        BoletaVisible: row.BoletaVisible || row.boleta_visible || 'NO',
        attendance: row.attendance || {},
        attendanceByDate: row.attendance_by_date || row.attendanceByDate || {
          [selectedDate]: Object.fromEntries(Object.entries(row.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
        },
        year,
      };
      normalizarPagosEstudiante(studentObj);
      attendanceData.years[year].students.push(studentObj);
    });
  } catch (error) {
    console.warn('No se pudo conectar con Supabase para cargar estudiantes:', error);
  }
};

const loadData = async () => {
  await cargarTodosLosEstudiantesDesdeSupabase();
};

const saveData = () => {
  attendanceData.selectedDate = selectedDate;
};

const sincronizarEstudiante = async (student, method = 'POST') => {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (method !== 'DELETE') options.body = JSON.stringify(student);
    const url = method === 'DELETE'
      ? `${API_STUDENTS}?id=${encodeURIComponent(student.id)}`
      : API_STUDENTS;
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Error ${response.status} al sincronizar estudiante`);
    }
    return method === 'DELETE' ? true : await response.json();
  } catch (error) {
    console.warn('No se pudo sincronizar el estudiante con el servidor:', error);
    showToast('No se pudo guardar el estudiante en la nube');
    return false;
  }
};

