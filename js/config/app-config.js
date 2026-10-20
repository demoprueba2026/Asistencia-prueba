const isRemovedStudent = (student) => deletedStudentIds.has(String(student?.id));

let currentUser = null; 

console.log('DOM detectado:', {
  loginForm: document.getElementById('loginForm'),
  yearSelect: document.getElementById('yearSelect'),
  landingView: document.getElementById('landingView')
});


const TEACHERS = {
  "Prueba4": {
    password: "Prueba4",
    name: "Prof: sub director",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    puedeVerDatosPersonales: true,
    esAdmin: false
  },
  "Abraham Ramirez": {
    password: "Dorado123.",
    name: "Prof: Abrahan",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    puedeVerDatosPersonales: true,
    esAdmin: false
  },
  "Prueba3": {
    password: "Prueba3",
    name: "Administrador de Sistema",
    puedeVerDatosPersonales: true,
    soloAdmin: true
  },
  "David": {
    password: "prueba1",
    name: "Prof: Admin",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    esAdmin: true,
    soloAdmin: true
    puedeGestionarActividades: true,
    puedeVerDatosPersonales: true,
    puedeGestionarBoletas: true
  },
  "Prueba2": {
    password: "Prueba2",
    name: "Prof: Control de esturdio",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    puedeGestionarActividades: true,
    puedeVerDatosPersonales: true,
    esAdmin: false
  },
  "Miriam Ariza": {
    password: "Chala2011",
    name: "Prof: Miriam",
    allowedYears: [1, 2, 3, 4, 5],
    allowedSubjects: ['orientacion-convivencia'],
    allowedSubjectsByYear: {
      3: ['orientacion-convivencia', 'crp'],
    },
    puedeAgregarEstudiantes: false
  },
  "Tibisay Plaza": {
    password: "tibyplaza5",
    name: "Prof: Tibisay",
    allowedYears: [1, 2], 
    allowedSubjects: ['matematicas'],
    puedeAgregarEstudiantes: false
  },
"Nancy Figueredo": {
    password: "1989",
    name: "Prof: Nancy",
    allowedYears: [5],
    allowedSubjects: ['biologia','ciencias-tierra'],
    puedeAgregarEstudiantes: false
  },
  "Yudisay Hernández": {
    password: "Danna.20",
    name: "Prof: Yudisay",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['castellano'],
    puedeAgregarEstudiantes: false
  },
  "Lenis Ávila": {
    password: "beno1406",
    name: "Prof: Lenis",
    allowedYears: [3, 4, 5], 
    allowedSubjects: ['ingles'],
    puedeAgregarEstudiantes: false
  },
  "Johana Pedron": {
    password: "Melanie06",
    name: "Prof: Johana",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['frances'],
    puedeAgregarEstudiantes: false
  },
  "Lidis Hernández": {
    password: "Activo2",
    name: "Prof: Lidis",
    allowedYears: [1, 2], 
    allowedSubjects: ['ingles'],
    puedeAgregarEstudiantes: false
  },
  "Yoxelith Camaripano": {
    password: "Yoxe21102009",
    name: "Prof: Yoxelith",
    allowedYears: [1, 2, 3, 4], 
    allowedSubjects: ['ciencias-naturales', 'biologia'],
    puedeAgregarEstudiantes: false
  },
  "Alexis Serrano": {
    password: "AS1335",
    name: "Prof: Alexis",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['ghc'],
    puedeAgregarEstudiantes: false
  },
  "Oriana Blanco": {
    password: "blanco488",
    name: "Prof: Oriana",
    allowedYears: [1, 2], 
    allowedSubjects: ['arte-patrimonio'],
    puedeAgregarEstudiantes: false
  },
  "Leidy Gonzalez": {
    password: "gonza2026",
    name: "Prof: Leidy",
    allowedYears: [3, 4, 5], 
    allowedSubjects: ['quimica'],
    puedeAgregarEstudiantes: false
  },
  "Ricardo Salcedo": {
    password: "23092024",
    name: "Prof: Ricardo",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['educacion-fisica', 'formacion-soberania'],
    puedeAgregarEstudiantes: false
  },
};

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

const canManageStudents = () => Boolean(currentUser?.puedeAgregarEstudiantes);
const canViewStudentPersonalData = () => Boolean(currentUser?.puedeVerDatosPersonales);
const canManageBoletas = () => Boolean(currentUser?.puedeGestionarBoletas);
const canLoadStudentGrades = () => Boolean(currentUser && !currentUser.soloAdmin && !currentUser.soloReportes);
const isProfessorNestor = () => Boolean(currentUser?.name?.includes('Néstor') || currentUser?.name?.includes('Nestor'));
const canViewReports = () => isProfessorNestor() || currentUser?.name === 'Prof: Andy' || currentUser?.soloReportes;
const canMarkAttendance = () => !isProfessorNestor();

