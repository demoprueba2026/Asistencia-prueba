const ensureYearStudents = (year) => {
  const normalizedYear = Number(year) || 1;
  attendanceData.years = attendanceData.years || {};
  if (!attendanceData.years[normalizedYear]) {
    attendanceData.years[normalizedYear] = { students: [] };
  }
  if (!Array.isArray(attendanceData.years[normalizedYear].students)) {
    attendanceData.years[normalizedYear].students = [];
  }
  return attendanceData.years[normalizedYear].students;
};

const findStudentByYear = (year, studentId) => {
  const yearStudents = ensureYearStudents(year);
  return yearStudents.find((student) => String(student.id) === String(studentId));
};

const getCurrentStudents = () => {
  return ensureYearStudents(selectedYear);
};

