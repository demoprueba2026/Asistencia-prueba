const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');
const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const findStudentById = (id) => {
  const students = getCurrentStudents();
  const match = students.find((student) => String(student.id) === String(id));
  if (match) return match;

  for (const yearKey of Object.keys(attendanceData.years || {})) {
    const found = (attendanceData.years[yearKey]?.students || []).find((student) => String(student.id) === String(id));
    if (found) return found;
  }
  return undefined;
};

const getAttendanceStatus = (student, subjectId) => {
  return student.attendanceByDate?.[selectedDate]?.[subjectId] || '';
};

