const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const isRemovedStudent = (student) => deletedStudentIds.has(String(student?.id));

let currentUser = null; 

console.log('DOM detectado:', {
  loginForm: document.getElementById('loginForm'),
  yearSelect: document.getElementById('yearSelect'),
  landingView: document.getElementById('landingView')
});


const SUBJECTS_BY_YEAR = {
  1: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  2: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  3: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
    { id: 'crp', label: 'CRP' },
  ],
  4: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
  ],
  5: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ciencias-tierra', label: 'Ciencias de la Tierra' },
    { id: 'ghc', label: 'GHC' },
    { id: 'frances', label: 'Francés' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
};

const getSubjectsByYear = (year) => {
  const allSubjects = SUBJECTS_BY_YEAR[Number(year)] || [];
  if (!currentUser || !currentUser.allowedSubjects) return allSubjects;
  const subjectsForYear = currentUser.allowedSubjectsByYear?.[Number(year)];
  const allowedSubjects = subjectsForYear || currentUser.allowedSubjects;
  if (allowedSubjects.includes("todas")) return allSubjects;
  return allSubjects.filter(subject => allowedSubjects.includes(subject.id));
};

const getAllowedYears = () => {
  if (!currentUser?.allowedYears) return [1, 2, 3, 4, 5];
  if (Array.isArray(currentUser.allowedYears)) return currentUser.allowedYears;
  return [1, 2, 3, 4, 5];
};

const canManageStudents = () => Boolean(currentUser?.puedeAgregarEstudiantes || currentUser?.esAdmin);
const canViewStudentPersonalData = () => Boolean(currentUser?.puedeVerDatosPersonales || currentUser?.esAdmin);
const canManageBoletas = () => Boolean(currentUser?.puedeGestionarBoletas || currentUser?.esAdmin);
const canLoadStudentGrades = () => Boolean(currentUser?.puedeCargarNotas || currentUser?.puedeGestionarActividades || currentUser?.esAdmin);
const canViewReports = () => Boolean(currentUser?.soloReportes || currentUser?.esAdmin || currentUser?.puedeVerReportes);
const canMarkAttendance = () => Boolean(currentUser?.puedeMarcarAsistencia || currentUser?.esAdmin);
