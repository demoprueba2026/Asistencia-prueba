const SENDER_WHATSAPP_NUMBER = '04142475155';
const DEFAULT_PHONE = '04125486575';
const DEFAULT_MESSAGE = 'La estudiante Arianny Suarez está asistente';
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SEND_WHATSAPP = `${API_BASE_URL}/api/send-whatsapp`;
const API_SEND_EMAIL = `${API_BASE_URL}/api/send-email`;
const API_STUDENTS = `${API_BASE_URL}/api/students`;
const API_ATTENDANCE = `${API_BASE_URL}/api/attendance`;
const API_SEND_DAILY_EMAILS = `${API_BASE_URL}/api/cron-daily-emails`;
const deletedStudentIds = new Set();

const isRemovedStudent = (student) => deletedStudentIds.has(String(student?.id));

let currentUser = null; 

console.log('DOM detectado:', {
  loginForm: document.getElementById('loginForm'),
  yearSelect: document.getElementById('yearSelect'),
  landingView: document.getElementById('landingView')
});


const TEACHERS = {
  "Patricia Salinas": {
    password: "Tita2026$$",
    name: "Prof: Patricia",
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
  "Sara Romero": {
    password: "20330592",
    name: "Administrador de Sistema",
    puedeVerDatosPersonales: true,
    soloAdmin: true
  },
  "Nestor Pérez": {
    password: "13557016",
    name: "Prof: Néstor",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    esAdmin: true,
    puedeVerDatosPersonales: true,
    puedeGestionarBoletas: true
  },
  "Andy Suárez": {
    password: "14965485",
    name: "Prof: Andy",
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

const syncStudentManagementControls = () => {
  const mainBtn = document.getElementById('mainAddStudent');
  const sendDailyEmailsBtn = document.getElementById('sendDailyEmailsNow');
  const landingBtn = document.getElementById('landingAddStudent');
  const btnAdminNestor = document.getElementById('btnModuloAdminNestor');
  const reportsBtn = document.getElementById('btnVerReportes');
  const gradesBtn = document.getElementById('btnCargarNotas');

  if (mainBtn) mainBtn.style.display = canManageStudents() ? 'inline-block' : 'none';
  if (sendDailyEmailsBtn) sendDailyEmailsBtn.style.display = canManageStudents() ? 'inline-block' : 'none';
  if (landingBtn) landingBtn.style.display = canManageStudents() ? 'inline-block' : 'none';
  if (reportsBtn) reportsBtn.style.display = canViewReports() ? 'inline-block' : '';
  if (gradesBtn) gradesBtn.style.display = canLoadStudentGrades() ? 'inline-block' : 'none';
  
  if (btnAdminNestor) {
    const esProfNestor = currentUser && (currentUser.name.includes("Néstor") || currentUser.name.includes("Nestor"));
    const esAdminExclusivo = currentUser && currentUser.soloAdmin;

    if (esProfNestor || esAdminExclusivo) {
      btnAdminNestor.classList.remove('hidden');
      btnAdminNestor.style.display = 'inline-block';
    } else {
      btnAdminNestor.classList.add('hidden');
      btnAdminNestor.style.display = 'none';
    }
  }
};

const isRegistrationPage = () => window.location.pathname.toLowerCase().endsWith('/registro.html') || window.location.pathname.toLowerCase().endsWith('registro.html');

const redirectToRegistrationPage = () => {
  if (!isRegistrationPage()) {
    window.location.href = 'registro.html';
  }
};

const redirectToLoginPage = () => {
  window.location.href = 'index.html';
};

const handleLogin = (e) => {
  e.preventDefault();

  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();

  if (TEACHERS[user] && TEACHERS[user].password === pass) {
    currentUser = TEACHERS[user];
    syncStudentManagementControls();

    sessionStorage.setItem('activeUser', JSON.stringify(currentUser));

    if (currentUser.soloReportes) {
      window.location.replace('reportes.html');
      return;
    }

    if (currentUser.soloAdmin) {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('landingView')?.classList.add('hidden');
      abrirAdminNestor();
      showToast(`Bienvenido/a, ${currentUser.name}`);
      return;
    }

    if (!isRegistrationPage()) {
      redirectToRegistrationPage();
      return;
    }

    document.getElementById('loginForm').style.display = 'none';
    const introCenter = document.querySelector('.landing-intro center');
    if (introCenter) introCenter.style.display = 'none';

    const yearsSection = document.getElementById('years-section');
    if (yearsSection) yearsSection.style.display = 'block';

    const yearsContainer = document.getElementById('years-container');
    yearsContainer.innerHTML = '';
    let primerBotonAno = null;

    getAllowedYears().forEach((year) => {
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = `${year}° Año`;
      btn.style.margin = '5px';
     
      btn.addEventListener('click', () => {
        selectedYear = String(year);
        document.getElementById('landingView').classList.add('hidden');
        document.getElementById('mainView').classList.remove('hidden');
        renderStudentList();
        renderSelectionInfo();
      });
      if (!primerBotonAno) primerBotonAno = btn;
      yearsContainer.appendChild(btn);
    });

    if (window.location.hash === '#registro-asistencia') {
      primerBotonAno?.click();
      history.replaceState(null, '', window.location.pathname);
    }

    showToast(`Bienvenido/a, ${currentUser.name}`);
  } else {
    showToast('Usuario o contraseña incorrectos');
  }
};

const setupPasswordReveal = () => {
  const passwordInput = document.getElementById('loginPassword');
  const revealButton = document.getElementById('revealLoginPassword');
  if (!passwordInput || !revealButton) return;

  const setPasswordVisible = (visible) => {
    passwordInput.type = visible ? 'text' : 'password';
    revealButton.setAttribute('aria-pressed', String(visible));
    revealButton.setAttribute('aria-label', visible ? 'Suelta para ocultar la contraseña' : 'Mantén presionado para ver la contraseña');
  };

  revealButton.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    if (revealButton.setPointerCapture) revealButton.setPointerCapture(event.pointerId);
    setPasswordVisible(true);
  });
  revealButton.addEventListener('pointerup', () => setPasswordVisible(false));
  revealButton.addEventListener('pointercancel', () => setPasswordVisible(false));
  revealButton.addEventListener('lostpointercapture', () => setPasswordVisible(false));
  revealButton.addEventListener('blur', () => setPasswordVisible(false));
  revealButton.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    setPasswordVisible(true);
  });
  revealButton.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') setPasswordVisible(false);
  });
  document.addEventListener('pointerup', () => setPasswordVisible(false));
  document.addEventListener('pointercancel', () => setPasswordVisible(false));
  window.addEventListener('blur', () => setPasswordVisible(false));
};

const miFormulario = document.getElementById('loginForm');
if (miFormulario) {
  miFormulario.addEventListener('submit', handleLogin);
}

const yearSelect = document.getElementById('yearSelect');
const subjectSelect = document.getElementById('subjectSelect');
const dateInput = document.getElementById('dateInput');
const currentSelectionEl = document.getElementById('currentSelection');
const studentSummaryEl = document.getElementById('studentSummary');
const studentForm = document.getElementById('studentForm');
const studentNameInput = document.getElementById('studentName');
const studentCedulaInput = document.getElementById('studentCedula');
const studentEmailInput = document.getElementById('studentEmail');
const studentPhoneInput = document.getElementById('studentPhone');
const studentListContainer = document.getElementById('studentListContainer');
const studentSearchInput = document.getElementById('studentSearchInput');
const studentSearchEmpty = document.getElementById('studentSearchEmpty');
const lastEmailStatusEl = document.getElementById('lastEmailStatus');
const toastEl = document.getElementById('toast');
const exportWordBtn = document.getElementById('exportWord');
const subjectInfoEl = document.getElementById('subjectInfo');
const addStudentView = document.getElementById('addStudentView');
const addStudentSubjectInfo = document.getElementById('addStudentSubjectInfo');
const landingView = document.getElementById('landingView');
const mainView = document.getElementById('mainView');
const landingAddStudentBtn = document.getElementById('landingAddStudent');
const mainAddStudentBtn = document.getElementById('mainAddStudent');
const cerrarSesionBtn = document.getElementById('btnCerrarSesion');
const closeAddStudentBtn = document.getElementById('closeAddStudent');
const backToLandingBtn = document.getElementById('backToLanding');
const yearTabs = document.getElementById('yearTabs');
const subjectCards = document.getElementById('subjectCards');

let selectedYear = '1';
let selectedSubject = SUBJECTS_BY_YEAR[1][0].id;
let selectedDate = new Date().toISOString().slice(0, 10);
let attendanceData = {};
let editingStudentId = null;
let addStudentReturnView = 'landing';
let estudianteAbonoSeleccionado = null;

const showView = (view) => {
  if (currentUser?.soloAdmin && view !== 'adminNestor') return;

  const hasLanding = Boolean(landingView);
  const hasMainView = Boolean(mainView);

  if (landingView) {
    landingView.classList.toggle('hidden', view !== 'landing');
  } else if (hasMainView && view === 'landing') {
    mainView.classList.remove('hidden');
  }

  if (mainView) {
    const shouldShowMain = view === 'main' || view === 'addStudent' || (!hasLanding && view === 'landing');
    mainView.classList.toggle('hidden', !shouldShowMain);
  }

  if (addStudentView) addStudentView.classList.toggle('hidden', view !== 'addStudent');
  const adminView = document.getElementById('adminNestorView');
  if (adminView) adminView.classList.toggle('hidden', view !== 'adminNestor');
};

const getSubjectLabel = (year, subjectId) => {
  return getSubjectsByYear(year).find((subject) => subject.id === subjectId)?.label || 'Materia';
};

const updateAddStudentSubjectInfo = () => {
  const label = getSubjectLabel(selectedYear, selectedSubject);
  if (addStudentSubjectInfo) {
    addStudentSubjectInfo.textContent = `Curso: Año ${selectedYear} · Materia: ${label}`;
  }
};

const openAddStudentView = (returnTo) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para agregar estudiantes');
    return;
  }
  addStudentReturnView = returnTo;
  updateAddStudentSubjectInfo();
  showView('addStudent');
  studentForm.reset();
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  studentNameInput.focus();
};

const openEditStudentView = (student) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para editar estudiantes');
    return;
  }
  addStudentReturnView = 'main';
  updateAddStudentSubjectInfo();
  showView('addStudent');
  editingStudentId = student.id;
  studentNameInput.value = student.name;
  studentCedulaInput.value = student.cedula || '';
  studentEmailInput.value = student.email || '';
  studentPhoneInput.value = student.phone;
  studentForm.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  studentNameInput.focus();
};

const closeAddStudentView = () => {
  showView(addStudentReturnView);
};

const cerrarSesion = () => {
  currentUser = null;
  sessionStorage.removeItem('activeUser');

  if (!document.getElementById('landingView') || isRegistrationPage()) {
    redirectToLoginPage();
    return;
  }

  showView('landing');
  document.getElementById('loginForm')?.reset();
  const yearsSection = document.getElementById('years-section');
  if (yearsSection) yearsSection.style.display = 'none';
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.style.display = 'flex';
  syncStudentManagementControls();
};

const selectLandingYear = (year) => {
  selectedYear = year;
  const subjects = getSubjectsByYear(year);
  selectedSubject = subjects[0]?.id || selectedSubject;
  updateSubjectOptions(year);
  renderLanding();
};

const navigateToMain = (subjectId) => {
  selectedSubject = subjectId;
  selectedYear = selectedYear || '1';
  updateSubjectOptions(selectedYear);
  showView('main');
  renderStudentList();
  renderSelectionInfo();
};

const renderLanding = () => {
  const renderYearTabsInner = () => {
    if (!yearTabs) return;
    yearTabs.innerHTML = '';
    const yearsToShow = getAllowedYears();

    yearsToShow.forEach((year) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `year-tab ${String(selectedYear) === String(year) ? 'active' : ''}`;
      button.textContent = `Año ${year}`;
      button.addEventListener('click', () => selectLandingYear(year));
      yearTabs.appendChild(button);
    });
  };
  renderYearTabsInner();
  
  if (subjectCards) {
    const subjects = getSubjectsByYear(selectedYear);
    subjectCards.innerHTML = '';
    subjects.forEach((subject) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `subject-card ${selectedSubject === subject.id ? 'active' : ''}`;
      card.innerHTML = `<h3>${subject.label}</h3><span>Año ${selectedYear}</span>`;
      card.addEventListener('click', () => navigateToMain(subject.id));
      subjectCards.appendChild(card);
    });
  }
};

const handleLandingAddStudent = () => openAddStudentView('landing');

const renderSelectionInfo = () => {
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);
  const studentCount = getCurrentStudents().length;
  if (currentSelectionEl) {
    currentSelectionEl.textContent = `Año ${selectedYear} · Materia: ${subjectLabel} · Fecha: ${selectedDate} · Estudiantes: ${studentCount}`;
  }
  if (studentSummaryEl) {
    studentSummaryEl.textContent = `${studentCount} estudiante${studentCount === 1 ? '' : 's'} en esta materia`;
  }
  if (subjectInfoEl) {
    subjectInfoEl.textContent = `Materia seleccionada: ${subjectLabel}`;
  }
};

const updateSubjectOptions = (year) => {
  const subjects = getSubjectsByYear(year);
  subjectSelect.innerHTML = '';
  subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.label;
    subjectSelect.appendChild(option);
  });
  if (!subjects.some((subject) => subject.id === selectedSubject)) {
    selectedSubject = subjects[0]?.id || '';
  }
  subjectSelect.value = selectedSubject;
  renderLanding();
};

const getInitialData = () => {
  const data = { years: {}, selectedDate, lastDailyEmailSentDate: '', boletaVisibleState: 'NO' };
  for (let year = 1; year <= 5; year += 1) {
    data.years[year] = {
      students: [
        {
          id: `arianny-${year}`,
          name: 'Arianny Suarez',
          email: 'arianny@example.com',
          phone: DEFAULT_PHONE,
          status: '',
          paymentStatus: 'no_pago',
          paidAmount: 0,
          attendance: {},
          year,
        },
      ],
    };
  }
  return data;
};

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

const sincronizarAsistencia = async (student, status) => {
  try {
    const response = await fetch(API_ATTENDANCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: student.id,
        name: student.name,
        cedula: student.cedula,
        email: student.email,
        phone: student.phone,
        year: Number(selectedYear),
        subject: selectedSubject,
        subjectLabel: getSubjectLabel(selectedYear, selectedSubject),
        status,
        date: selectedDate,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Error ${response.status} al guardar asistencia`);
    }
    return await response.json();
  } catch (error) {
    console.warn('No se pudo sincronizar la asistencia con el servidor:', error);
    showToast('No se pudo guardar la asistencia en la nube');
    return { success: false, error: error.message || 'no se pudo conectar con el servidor' };
  }
};

const showToast = (message) => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
  }, 2800);
};

const showAttendanceModal = (message) => {
  const modal = document.getElementById('attendanceModal');
  const msg = document.getElementById('attendanceModalMessage');
  const closeBtn = document.getElementById('attendanceModalClose');
  if (!modal || !msg) return;
  msg.textContent = message;
  modal.classList.remove('hidden');
  if (closeBtn) {
    const handler = () => {
      modal.classList.add('hidden');
      closeBtn.removeEventListener('click', handler);
    };
    closeBtn.addEventListener('click', handler);
  }
  clearTimeout(showAttendanceModal.timeoutId);
  showAttendanceModal.timeoutId = setTimeout(() => {
    modal.classList.add('hidden');
  }, 2500);
};

const buildSelectors = () => {
  if (!yearSelect || !subjectSelect) return;
  yearSelect.innerHTML = '';
  subjectSelect.innerHTML = '';

  const yearsToShow = getAllowedYears();
  yearsToShow.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  });

  const stringYears = yearsToShow.map(String);
  if (!stringYears.includes(String(selectedYear))) {
    selectedYear = stringYears[0];
  }
 
  yearSelect.value = String(selectedYear);
  updateSubjectOptions(selectedYear);
};

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

const applyStudentNameFilter = () => {
  if (!studentListContainer || !studentSearchInput) return;

  const searchText = normalizarTexto(studentSearchInput.value.trim());
  const rows = studentListContainer.querySelectorAll('tbody tr');
  let visibleRows = 0;

  rows.forEach((row) => {
    const studentName = normalizarTexto(row.cells[0]?.textContent || '');
    const matches = studentName.includes(searchText);
    row.style.display = matches ? '' : 'none';
    if (matches) visibleRows += 1;
  });

  if (studentSearchEmpty) {
    studentSearchEmpty.style.display = rows.length > 0 && visibleRows === 0 ? 'block' : 'none';
  }
};

const renderStudentList = () => {
  let students = getCurrentStudents().filter((student) => !isRemovedStudent(student));
  (async () => {
    try {
      const r = await fetch(`${API_STUDENTS}?year=${encodeURIComponent(selectedYear)}&date=${encodeURIComponent(selectedDate)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (r.ok && r.status !== 304) {
        const data = await r.json().catch(() => ([]));
        if (Array.isArray(data)) {
          attendanceData.years[selectedYear] = attendanceData.years[selectedYear] || {};
          attendanceData.years[selectedYear].students = data.map((row) => {
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
              year: Number(selectedYear),
            };
            normalizarPagosEstudiante(studentObj);
            return studentObj;
          }).filter((student) => !isRemovedStudent(student));
          students = attendanceData.years[selectedYear].students;
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar estudiantes desde Supabase:', e);
    }

    if (!students || !students.length) {
      if (studentListContainer) {
        studentListContainer.innerHTML = '<p style="color: #000000; font-weight: bold;">No hay estudiantes aún en este curso y materia.</p>';
      }
      if (studentSearchEmpty) studentSearchEmpty.style.display = 'none';
      renderSelectionInfo();
      return;
    }

    const canViewPersonalData = canViewStudentPersonalData();
    const table = document.createElement('div');
    table.className = 'table-wrapper student-attendance-list';
    if (canViewPersonalData && canManageStudents()) {
      table.classList.add('student-attendance-list--editable');
    }
    table.innerHTML = `
      <table style="color: #000000;">
        <thead>
          <tr style="color: #000000;">
            <th style="color: #000000; font-weight: bold;">Nombre</th>
            ${canViewPersonalData ? `
              <th style="color: #000000; font-weight: bold;">Cédula</th>
              <th style="color: #000000; font-weight: bold;">Correo</th>
              <th style="color: #000000; font-weight: bold;">Representante</th>
            ` : ''}
            <th style="color: #000000; font-weight: bold;">${canMarkAttendance() ? 'Asistencia' : ''}</th>
          </tr>
        </thead>
        <tbody style="color: #000000;">
          ${students
            .map((student) => {
              const currentStatus = getAttendanceStatus(student, selectedSubject);
              const asistClass = currentStatus === 'asistente' ? 'active' : '';
              const inasistClass = currentStatus === 'inasistente' ? 'active' : '';
              const canEditStudents = canManageStudents();
              const attendanceButtons = canMarkAttendance() ? `
                <button class="state-button btn-asistente ${asistClass}" data-action="asistente" data-id="${student.id}" aria-pressed="${currentStatus === 'asistente'}" title="${currentStatus === 'asistente' ? 'Estado actual: asistente' : 'Marcar como asistente'}">${currentStatus === 'asistente' ? '<span class="state-check">✓</span>' : ''}<span>Asistente</span></button>
                <button class="state-button btn-inasistente ${inasistClass}" data-action="inasistente" data-id="${student.id}" aria-pressed="${currentStatus === 'inasistente'}" title="${currentStatus === 'inasistente' ? 'Estado actual: inasistente' : 'Marcar como inasistente'}">${currentStatus === 'inasistente' ? '<span class="state-check">✓</span>' : ''}<span>Inasistente</span></button>` : '';
              const studentActionButtons = `
                ${attendanceButtons}
                ${canEditStudents ? `<button class="secondary" style="color: #000000;" data-action="edit" data-id="${student.id}">Editar</button>` : ''}
                ${canEditStudents ? `<button class="secondary" style="color: #000000;" data-action="delete" data-id="${student.id}">Borrar</button>` : ''}`;
              return `
                <tr data-id="${student.id}" style="color: #000000;">
                  <td class="student-name-cell" style="color: #000000; font-weight: bold;">
                    <span class="student-name">${student.name}</span>
                    <div class="state-buttons state-buttons--mobile">${studentActionButtons}</div>
                  </td>
                  ${canViewPersonalData ? `
                    <td data-label="Cédula" style="color: #000000;">${student.cedula || 'No registrada'}</td>
                    <td data-label="Correo" style="color: #000000;">${student.email || '-'}</td>
                    <td data-label="Representante" style="color: #000000;">${student.phone || '-'}</td>
                  ` : ''}
                  <td data-label="${canMarkAttendance() ? 'Asistencia' : ''}">
                    <div class="state-buttons state-buttons--desktop">${studentActionButtons}</div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    if (studentListContainer) {
      studentListContainer.innerHTML = '';
      if (canViewPersonalData) {
        table.classList.add('student-attendance-list--personal-data');
      }
      studentListContainer.appendChild(table);
    }
    applyStudentNameFilter();
    renderSelectionInfo();
  })();
};

const updateYearSelection = () => {
  const allowedYears = getAllowedYears().map(String);
  const intentoDeAno = String(yearSelect.value);

  if (!allowedYears.includes(intentoDeAno)) {
    showToast('⚠️ No tienes permisos para gestionar este año.');
    yearSelect.value = selectedYear;
    return;
  }

  selectedYear = intentoDeAno;
  updateSubjectOptions(selectedYear);
  renderStudentList();
};

const updateSubjectSelection = () => {
  selectedSubject = subjectSelect.value;
  renderStudentList();
};

const updateDateSelection = (event) => {
  selectedDate = event.target.value;
  saveData();
  renderStudentList();
  renderSelectionInfo();
};

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

const updateLastEmailStatus = () => {
  if (!lastEmailStatusEl) return;
  if (!attendanceData.lastDailyEmailSentDate) {
    lastEmailStatusEl.textContent = 'Último resumen diario: no enviado aún.';
    return;
  }
  lastEmailStatusEl.textContent = `Último resumen diario enviado: ${attendanceData.lastDailyEmailSentDate}`;
};

const sendDailyEmailsNow = async () => {
  const button = document.getElementById('sendDailyEmailsNow');
  if (!button || !confirm('Se enviará ahora el resumen de asistencia de hoy a todos los estudiantes con registros. El envío programado seguirá activo y podría enviar esos correos nuevamente. ¿Continuar?')) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Enviando...';

  try {
    const response = await fetch(API_SEND_DAILY_EMAILS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Error ${response.status} al enviar los correos`);
    if (Array.isArray(result.sent) && result.sent.length) renderStudentList();

    if (result.message) {
      showToast(result.message);
      return;
    }

    const sentCount = Array.isArray(result.sent) ? result.sent.length : 0;
    const failedCount = Number(result.failedEmailCount || 0);
    const missingStudentCount = result.missingStudents?.length || 0;
    const missingEmailCount = result.missingEmails?.length || 0;
    showToast(`Prueba: ${sentCount} enviado(s), ${failedCount} fallido(s), ${missingStudentCount} estudiante(s) no encontrado(s), ${missingEmailCount} sin correo.`);
  } catch (error) {
    showToast(error.message || 'No se pudieron enviar los correos.');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
};

const setStudentStatus = async (id, status) => {
  const students = getCurrentStudents();
  const student = students.find((item) => String(item.id) === String(id));
  if (!student) return;
 
  student.attendance = student.attendance || {};
  student.attendance[selectedSubject] = status;
  student.status = status;
  student.attendanceByDate = student.attendanceByDate || {};
  student.attendanceByDate[selectedDate] = student.attendanceByDate[selectedDate] || {};
  student.attendanceByDate[selectedDate][selectedSubject] = status;
 
  saveData();
  const result = await sincronizarAsistencia(student, status);
  renderStudentList();
 
  const statusLabel = status === 'asistente' ? 'asistente' : 'inasistente';
  showAttendanceModal(result?.success
    ? `Se marcó ${statusLabel}. Se incluirá en el resumen diario por materias.`
    : `Se marcó ${statusLabel}, pero no se pudo guardar en la nube: ${result?.error || 'error de conexión'}`);
};

const deleteStudent = (id) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para borrar estudiantes');
    return;
  }
  attendanceData.years[selectedYear].students = getCurrentStudents().filter((student) => String(student.id) !== String(id));
  deletedStudentIds.add(String(id));
  saveData();
  sincronizarEstudiante({ id }, 'DELETE');
  renderStudentList();
  showToast('Estudiante eliminado correctamente');
};

const startEditStudent = (id) => {
  const student = findStudentById(id);
  if (student) openEditStudentView(student);
};

const saveEditedStudent = async () => {
  if (!canManageStudents()) return;
  const student = findStudentById(editingStudentId);
  if (!student) return;

  const name = normalizeName(studentNameInput.value);
  const cedula = studentCedulaInput.value.trim();
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();
  if (!name || !email) {
    showToast('Completa nombre y correo para guardar');
    return;
  }
  const previousStudent = { ...student };
  student.name = name;
  student.cedula = cedula;
  student.email = email;
  student.phone = phone;
  saveData();
  const savedStudent = await sincronizarEstudiante(student, 'PATCH');
  if (!savedStudent) {
    Object.assign(student, previousStudent);
    saveData();
    return;
  }
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  renderStudentList();
  studentForm.reset();
  showToast('Datos actualizados correctamente');
};

const handleStudentFormSubmit = async (event) => {
  event.preventDefault();

  if (!canManageStudents()) return;

  const name = normalizeName(studentNameInput.value);
  const cedula = studentCedulaInput.value.trim();
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();

  if (!name || !email) {
    showToast('Debes ingresar nombre y correo');
    return;
  }

  if (editingStudentId) {
    await saveEditedStudent();
    return;
  }

  const resolvedYear = Number(selectedYear || document.getElementById('yearSelect')?.value || 1);
  const targetYearKey = String(resolvedYear);

  console.log('payload estudiante antes de guardar:', {
    name,
    email,
    year: resolvedYear,
    selectedYear,
    yearSelect: document.getElementById('yearSelect')?.value,
  });

  const newStudent = {
    id: window.crypto?.randomUUID?.() || `student-${Date.now()}`,
    name,
    cedula,
    email,
    phone,
    status: '',
    paymentStatus: 'no_pago',
    paidAmount: 0,
    payments: {},
    grades: {},
    attendance: {},
    BoletaVisible: 'NO',
    year: resolvedYear,
  };
  attendanceData.years[targetYearKey] = attendanceData.years[targetYearKey] || { students: [] };
  attendanceData.years[targetYearKey].students.push(newStudent);
  saveData();
  const savedStudent = await sincronizarEstudiante(newStudent);
  if (savedStudent?.id !== undefined) newStudent.id = savedStudent.id;
  studentForm.reset();
  renderStudentList();
  showToast('Estudiante agregado correctamente');
  if (addStudentView && !addStudentView.classList.contains('hidden')) {
    showView('main');
  }
};

const exportCurrentToPdf = () => {
  const students = getCurrentStudents();
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);

  if (!students.length) {
    showToast('No hay estudiantes para exportar en PDF');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('No se pudo cargar la exportación PDF');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text(`Asistencia - Año ${selectedYear} - ${subjectLabel}`, 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Fecha: ${selectedDate}`, 14, y);
  y += 10;

  students.forEach((student) => {
    const phone = canViewStudentPersonalData() ? student.phone || '-' : 'Oculto';
    doc.text(`${student.name} - ${phone} - Status: ${student.status || 'pendiente'}`, 14, y);
    y += 7;
  });

  doc.save(`asistencia_ano${selectedYear}_${subjectLabel}_${selectedDate}.pdf`);
  showToast('PDF descargado correctamente');
};

const handleStudentListClick = (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;
 
  const action = actionButton.dataset.action;
  const studentId = actionButton.dataset.id;

  if (action === 'delete') {
    deleteStudent(studentId);
    return;
  }
  if (action === 'edit') {
    startEditStudent(studentId);
    return;
  }
 
  if (action === 'asistente' || action === 'inasistente') {
    if (!canMarkAttendance()) return;
    if (!selectedDate || selectedDate.trim() === '') {
      showToast('⚠️ Por favor, selecciona una fecha primero');
      return;
    }
    setStudentStatus(studentId, action);
  }
};

const abrirAdminNestor = async () => {
  const esProfNestor = currentUser && (currentUser.name.includes("Néstor") || currentUser.name.includes("Nestor"));
  const esAdminExclusivo = currentUser && currentUser.soloAdmin;

  if (!esProfNestor && !esAdminExclusivo) {
    showToast('⚠️ Acceso restringido al Módulo Administrativo.');
    return;
  }

  const btnCerrar = document.getElementById('btnCerrarAdmin');
  if (btnCerrar) {
    btnCerrar.textContent = currentUser.soloAdmin ? '🚪 Cerrar Sesión' : '← Volver al Sistema';
  }

  await cargarTodosLosEstudiantesDesdeSupabase();
  configurarPeriodosPago();
  actualizarVistaAdminNestor();
  showView('adminNestor');
};

const cerrarAdminNestor = () => {
  if (currentUser && currentUser.soloAdmin) {
    currentUser = null;
    sessionStorage.removeItem('activeUser');
    redirectToLoginPage();
    return;
  }
  showView('main');
};

const cambiarEstadoBoletas = (habilitado) => {
  attendanceData.boletaVisibleState = habilitado ? 'SI' : 'NO';
  saveData();
  actualizarVistaAdminNestor();
  showToast(habilitado ? '✅ Boletines habilitados para consulta' : '🔒 Boletines bloqueados correctamente');
};

const autorizarBoletaEstudiante = async (studentId, year) => {
  if (!canManageBoletas()) {
    showToast('No tienes permiso para autorizar boletas');
    return;
  }

  const student = (attendanceData.years[year]?.students || []).find(s => String(s.id) === String(studentId));
  if (!student) return;

  const boletaAutorizada = String(student.BoletaVisible || '').toUpperCase().trim() === 'SI';
  student.BoletaVisible = boletaAutorizada ? 'NO' : 'SI';
  saveData();
  const savedStudent = await sincronizarEstudiante(student, 'PATCH');
  if (!savedStudent) {
    student.BoletaVisible = boletaAutorizada ? 'SI' : 'NO';
    saveData();
    actualizarVistaAdminNestor();
    return;
  }
  actualizarVistaAdminNestor();
  showToast(`Boleta de ${student.name} ${student.BoletaVisible === 'SI' ? 'autorizada (SI)' : 'bloqueada (NO)'}`);
};
window.autorizarBoletaEstudiante = autorizarBoletaEstudiante;

const cambiarEstadoPago = async (studentId, year, estado) => {
  const student = findStudentByYear(year, studentId) || findStudentById(studentId);
  if (!student) return;

  const monto = estado === 'pago' ? costoPeriodo(periodoPagoActual) : 0;
  guardarPagoPeriodo(student, estado, monto, periodoPagoActual);
  student.paymentStatus = estado;
  student.paidAmount = monto;

  saveData();
  await sincronizarEstudiante(student, 'PATCH');
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
  if (estado !== 'no_pago') {
    mostrarReciboPago(student, Number(student.year || year));
  }
  const nombrePeriodo = PERIODOS_PAGO.find(p => p.id === periodoPagoActual)?.label || periodoPagoActual;
  showToast(`Estado de ${student.name} para ${nombrePeriodo}: ${estado === 'no_pago' ? 'NO PAGO' : estado.toUpperCase()}`);
};

const abrirModalAbono = (studentId, year, name) => {
  estudianteAbonoSeleccionado = { studentId, year, name };
  const student = findStudentByYear(year, studentId) || findStudentById(studentId);
  const pagoMes = student ? obtenerPagoPeriodo(student, periodoPagoActual) : null;
  const nombrePeriodo = PERIODOS_PAGO.find(p => p.id === periodoPagoActual)?.label || periodoPagoActual;

  const studentNameEl = document.getElementById('abonoStudentName');
  if (studentNameEl) {
    if (pagoMes && pagoMes.status === 'abono' && pagoMes.amount > 0) {
      studentNameEl.innerHTML = `Estudiante: <strong>${name}</strong><br><span style="font-size:0.9rem; color:#b45309; font-weight:normal;">Abono actual en ${nombrePeriodo}: <strong>$${pagoMes.amount}</strong></span>`;
      const inputEl = document.getElementById('montoAbonoInput');
      if (inputEl) inputEl.value = pagoMes.amount;
    } else {
      studentNameEl.innerHTML = `Estudiante: <strong>${name}</strong><br><span style="font-size:0.9rem; color:#64748b; font-weight:normal;">Período a abonar: <strong>${nombrePeriodo}</strong></span>`;
      const inputEl = document.getElementById('montoAbonoInput');
      if (inputEl) inputEl.value = '';
    }
  }
  const modal = document.getElementById('abonoModal');
  if (modal) modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('montoAbonoInput')?.focus(), 50);
};

const cerrarModalAbono = () => {
  estudianteAbonoSeleccionado = null;
  const modal = document.getElementById('abonoModal');
  if (modal) modal.classList.add('hidden');
};

const guardarAbono = async () => {
  if (!estudianteAbonoSeleccionado) return;
  const inputEl = document.getElementById('montoAbonoInput');
  const monto = parseFloat(inputEl?.value || '0');

  if (isNaN(monto) || monto < 0) {
    showToast('⚠️ Ingresa un monto válido');
    return;
  }

  const { studentId, year, name } = estudianteAbonoSeleccionado;
  cerrarModalAbono();
  const student = findStudentByYear(year, studentId) || findStudentById(studentId);

  if (student) {
    const cuota = costoPeriodo(periodoPagoActual);
    let estado = 'abono';
    if (monto === 0) {
      estado = 'no_pago';
    } else if (monto >= cuota) {
      estado = 'pago';
    }

    guardarPagoPeriodo(student, estado, monto, periodoPagoActual);
    student.paymentStatus = estado;
    student.paidAmount = normalizarMontoPago(monto);
    saveData();
    await sincronizarEstudiante(student, 'PATCH');
    actualizarVistaAdminNestor();
    renderizarGraficasAdmin();
    if (estado !== 'no_pago') {
      mostrarReciboPago(student, Number(student.year || year));
    }
    const nombrePeriodo = PERIODOS_PAGO.find(p => p.id === periodoPagoActual)?.label || periodoPagoActual;
    showToast(`Abono de $${monto} guardado para ${name} (${nombrePeriodo})`);
  }
};

const actualizarVistaAdminNestor = () => {
  const container = document.getElementById('adminStudentOverviewContainer');
  if (!container) return;

  let totalAlumnos = 0;
  let html = `<table class="admin-payments-table" style="width:100%; border-collapse:collapse; margin-top:10px; color: #000000;">
    <thead>
      <tr style="background:#f1f5f9; text-align:left; color: #000000;">
        <th style="padding:10px; color: #000000; font-weight:bold;">Año</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Cédula</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Nombre</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Período</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Fecha</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Estado Pago</th>
        <th style="padding:10px; color: #000000; font-weight:bold; text-align:center;">Acciones de Pago y Boleta</th>
      </tr>
    </thead>
    <tbody style="color: #000000;">`;

  for (let year = 1; year <= 5; year++) {
    const list = (attendanceData.years[year]?.students || []).filter((student) => !isRemovedStudent(student));
    list.forEach(st => {
      const pago = obtenerPagoPeriodo(st);
      if (!coincideConFiltrosPago(st, pago)) return;
      totalAlumnos++;
      let badgeStyle = "background:#fee2e2; color:#dc2626;";
      let estadoTexto = "No pago";

      if (pago.status === 'pago') {
        badgeStyle = "background:#dcfce7; color:#15803d;";
        estadoTexto = "Pago Completo";
      } else if (pago.status === 'abono') {
        badgeStyle = "background:#fef9c3; color:#a16207;";
        estadoTexto = `Abonó: $${pago.amount}`;
      }

      const boletaEstudianteAutorizada = String(st.BoletaVisible || '').toUpperCase().trim() === 'SI';
      const btnBoletaEstilo = boletaEstudianteAutorizada 
        ? "background-color: #16a34a; color: white;" 
        : "background-color: #0284c7; color: white;";
      const textoBotonBoleta = boletaEstudianteAutorizada ? 'desautorizar boleta' : 'autorizar boleta';
      const botonBoleta = canManageBoletas()
        ? `<button style="${btnBoletaEstilo} border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" aria-pressed="${boletaEstudianteAutorizada}" onclick="autorizarBoletaEstudiante('${st.id}', ${year})">${textoBotonBoleta}</button>`
        : '';

      html += `
        <tr style="border-bottom:1px solid #e2e8f0; color: #000000;">
          <td data-label="Año" style="padding:8px; color: #000000;">${year}° Año</td>
          <td data-label="Cédula" style="padding:8px; color: #000000;">${canViewStudentPersonalData() ? st.cedula || 'No registrada' : 'Oculto'}</td>
          <td data-label="Nombre" style="padding:8px; font-weight:bold; color: #000000;">${st.name}</td>
          <td data-label="Período" style="padding:8px; color: #000000;">${PERIODOS_PAGO.find(periodo => periodo.id === periodoPagoActual)?.label || periodoPagoActual}</td>
          <td data-label="Fecha" style="padding:8px; color: #000000;">${pago.date || 'Sin fecha'}</td>
          <td data-label="Estado Pago" style="padding:8px;">
            <span class="badge-pago" style="${badgeStyle}">${estadoTexto}</span>
          </td>
          <td data-label="Acciones de pago y boleta" style="padding:8px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button class="btn-pago-verde" onclick="cambiarEstadoPago('${st.id}', ${year}, 'pago')">$ Pago</button>
              <button class="btn-pago-rojo" onclick="cambiarEstadoPago('${st.id}', ${year}, 'no_pago')">No pago</button>
              <button class="btn-pago-amarillo" onclick="abrirModalAbono('${st.id}', ${year}, '${st.name}')">$ Abono</button>
              ${botonBoleta}
            </div>
          </td>
        </tr>`;
    });
  }

  html += `</tbody></table><p style="margin-top:12px; font-weight:bold; color:#000000;">Total Estudiantes en Sistema: ${totalAlumnos}</p>`;
  container.innerHTML = html;
};

let chartEstadoPagosAdmin = null;
let chartFinanzasAdmin = null;
const CUOTA_MENSUAL_ESTUDIANTE = 60;
const COSTO_INSCRIPCION = 300;
const PERIODOS_PAGO = [  { id: 'inscripcion', label: 'Inscripción' },  { id: 'enero', label: 'Enero' },  { id: 'febrero', label: 'Febrero' },  { id: 'marzo', label: 'Marzo' },  { id: 'abril', label: 'Abril' },  { id: 'mayo', label: 'Mayo' },  { id: 'junio', label: 'Junio' },  { id: 'julio', label: 'Julio' },  { id: 'agosto', label: 'Agosto' },  { id: 'septiembre', label: 'Septiembre' },  { id: 'octubre', label: 'Octubre' },  { id: 'noviembre', label: 'Noviembre' },  { id: 'diciembre', label: 'Diciembre' },];
let periodoPagoActual = getMesActualId();
let fechaPagoActual = new Date().toISOString().slice(0, 10);
let filtroFechaPago = null;

const obtenerTodosLosEstudiantes = () => Object.values(attendanceData.years || {})
  .flatMap((yearData, index) => (yearData.students || []).map(student => ({ ...student, calculatedYear: index + 1 })));

const normalizarMontoPago = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const obtenerPagoPeriodo = (student, periodo = periodoPagoActual) => {
  if (!student) return { status: 'no_pago', amount: 0, date: '' };
  const pagos = parsePayments(student.payments);
  const pagoGuardado = pagos[periodo];
  if (pagoGuardado && (pagoGuardado.status || pagoGuardado.amount !== undefined)) {
    return {
      status: pagoGuardado.status || 'no_pago',
      amount: normalizarMontoPago(pagoGuardado.amount),
      date: pagoGuardado.date || '',
    };
  }
  return { status: 'no_pago', amount: 0, date: '' };
};

const coincideConFiltrosPago = (student, pago) => {
  const busqueda = (document.getElementById('busquedaPagoInput')?.value || '').toLowerCase().trim();
  const anoSeleccionado = document.getElementById('filtroAnoAdminSelect')?.value || '';

  const cedula = String(student.cedula || '').toLowerCase().trim();
  const cedulaSoloNum = cedula.replace(/\D/g, '');
  const busquedaSoloNum = busqueda.replace(/\D/g, '');

  const coincideCedula = !busqueda
    || cedula.includes(busqueda)
    || (busquedaSoloNum.length > 0 && cedulaSoloNum.includes(busquedaSoloNum));

  return coincideCedula
    && (!anoSeleccionado || String(student.calculatedYear || student.year) === anoSeleccionado)
    && (!filtroFechaPago || pago.date === filtroFechaPago);
};

const costoPeriodo = (periodo = periodoPagoActual) => periodo === 'inscripcion' ? COSTO_INSCRIPCION : CUOTA_MENSUAL_ESTUDIANTE;

const guardarPagoPeriodo = (student, status, amount = 0, periodo = periodoPagoActual) => {
  if (!student) return;
  student.payments = parsePayments(student.payments);
  const monto = status === 'pago' ? costoPeriodo(periodo) : normalizarMontoPago(amount);
  student.payments[periodo] = {
    status,
    amount: monto,
    date: fechaPagoActual || new Date().toISOString().slice(0, 10),
  };
};

const mostrarReciboPago = (student, year) => {
  const pagos = Object.entries(student.payments || {})
    .filter(([, pago]) => pago.status === 'pago' || pago.status === 'abono')
    .sort(([firstPeriod, firstPago], [secondPeriod, secondPago]) => {
      if (firstPeriod === 'inscripcion') return secondPeriod === 'inscripcion' ? 0 : -1;
      if (secondPeriod === 'inscripcion') return 1;
      return String(firstPago.date || '').localeCompare(String(secondPago.date || ''));
    });
  const cedulaKey = Object.keys(student).find(key => normalizarTexto(key).includes('cedula'));
  const nombrePeriodo = periodo => PERIODOS_PAGO.find(item => item.id === periodo)?.label || periodo;
  document.getElementById('reciboNombre').textContent = student.name;
  document.getElementById('reciboCedula').textContent = canViewStudentPersonalData()
    ? student[cedulaKey] || 'No registrada'
    : 'Oculto';
  document.getElementById('reciboAno').textContent = `${year}° Año`;
  const obtenerMontoPago = (periodo, pago) => parseFloat(pago.amount) || (pago.status === 'pago' ? costoPeriodo(periodo) : 0);
  document.getElementById('reciboPagosBody').innerHTML = pagos.length
    ? pagos.map(([periodo, pago]) => {
      const montoPagado = obtenerMontoPago(periodo, pago);
      const montoAbono = pago.status === 'abono' ? `$${montoPagado.toFixed(2)}` : '-';
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${nombrePeriodo(periodo)}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${pago.date || 'Sin fecha'}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${montoAbono}</td><td class="admin-receipt-amount">$${montoPagado.toFixed(2)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="4" style="padding: 15px; text-align: center;">No hay pagos registrados.</td></tr>';
  document.getElementById('reciboTotal').textContent = pagos.reduce((total, [periodo, pago]) => total + obtenerMontoPago(periodo, pago), 0).toFixed(2);
  document.getElementById('reciboPagoModal').classList.remove('hidden');
};

const cerrarReciboPago = () => document.getElementById('reciboPagoModal').classList.add('hidden');

const ensureHtml2Canvas = () => new Promise((resolve) => {
  if (window.html2canvas) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.head.appendChild(script);
});

const descargarReciboPagoPDF = async () => {
  const btnDescargar = document.getElementById('btnDescargarFactura');
  const contenidoOriginal = btnDescargar ? btnDescargar.innerHTML : '';
  if (btnDescargar) {
    btnDescargar.disabled = true;
    btnDescargar.innerHTML = `
      <svg style="width:16px;height:16px;animation:spin 1s linear infinite;fill:currentColor;" viewBox="0 0 24 24">
        <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
      </svg>
      Generando PDF...
    `;
  }

  try {
    const ready = await ensureHtml2Canvas();
    if (!ready || !window.html2canvas) {
      showToast('⚠️ No se pudo cargar la librería para generar la factura.');
      return;
    }
    if (!window.jspdf?.jsPDF) {
      showToast('⚠️ No se pudo cargar el generador de PDF.');
      return;
    }

    const receiptPaper = document.querySelector('#reciboPagoModal .admin-receipt-paper');
    if (!receiptPaper) {
      showToast('⚠️ No se encontró la factura para descargar.');
      return;
    }

    const sealImg = receiptPaper.querySelector('.admin-receipt-seal');
    if (sealImg && !sealImg.complete) {
      await sealImg.decode().catch(() => {});
    }

    const studentName = document.getElementById('reciboNombre')?.textContent?.trim() || 'Estudiante';
    const canvas = await window.html2canvas(receiptPaper, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);

    const proportionalHeight = (canvas.height * availableWidth) / canvas.width;
    const scale = Math.min(1, availableHeight / proportionalHeight);
    const finalWidth = availableWidth * scale;
    const finalHeight = proportionalHeight * scale;
    const posX = (pageWidth - finalWidth) / 2;
    const posY = 15;

    doc.addImage(canvas.toDataURL('image/png'), 'PNG', posX, posY, finalWidth, finalHeight);

    const safeName = studentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '');
    const fechaHoy = new Date().toISOString().slice(0, 10);
    doc.save(`Factura_${safeName}_${fechaHoy}.pdf`);
    showToast('✅ Factura descargada en PDF correctamente');
  } catch (err) {
    console.error('Error generando factura PDF:', err);
    showToast('⚠️ Ocurrió un error al descargar la factura');
  } finally {
    if (btnDescargar) {
      btnDescargar.disabled = false;
      btnDescargar.innerHTML = contenidoOriginal;
    }
  }
};

const configurarPeriodosPago = () => {
  const select = document.getElementById('periodoPagoSelect');
  if (!select) return;
  select.innerHTML = PERIODOS_PAGO.map(periodo => `<option value="${periodo.id}">${periodo.label}</option>`).join('');
  if (!PERIODOS_PAGO.some(periodo => periodo.id === periodoPagoActual)) periodoPagoActual = getMesActualId();
  select.value = periodoPagoActual;
  const fechaInput = document.getElementById('fechaPagoInput');
  if (fechaInput) fechaInput.value = fechaPagoActual;
  actualizarEtiquetaPeriodoPago();
};

const actualizarEtiquetaPeriodoPago = () => {
  const etiqueta = document.getElementById('periodoPagoActualLabel');
  const periodo = PERIODOS_PAGO.find(item => item.id === periodoPagoActual);
  if (etiqueta && periodo) etiqueta.textContent = `(${periodo.label})`;
};

const actualizarFiltrosPago = () => {
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarPeriodoPago = (periodo) => {
  periodoPagoActual = periodo;
  filtroFechaPago = null;
  actualizarEtiquetaPeriodoPago();
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarFechaPago = (fecha) => {
  fechaPagoActual = fecha || new Date().toISOString().slice(0, 10);
  filtroFechaPago = fecha || null;
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const aplicarFiltroFechaPago = (filtro) => {
  const fecha = new Date();
  if (filtro === 'ayer') fecha.setDate(fecha.getDate() - 1);
  if (filtro === 'semana') fecha.setDate(fecha.getDate() - 7);
  filtroFechaPago = filtro === 'todo' ? null : fecha.toISOString().slice(0, 10);
  if (filtroFechaPago) {
    fechaPagoActual = filtroFechaPago;
    const inputFecha = document.getElementById('fechaPagoInput');
    if (inputFecha) inputFecha.value = filtroFechaPago;
  }
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

window.abrirAdminNestor = abrirAdminNestor;
window.cerrarAdminNestor = cerrarAdminNestor;
window.cambiarEstadoPago = cambiarEstadoPago;
window.abrirModalAbono = abrirModalAbono;
window.cerrarModalAbono = cerrarModalAbono;
window.guardarAbono = guardarAbono;
window.cambiarPeriodoPago = cambiarPeriodoPago;
window.cambiarFechaPago = cambiarFechaPago;
window.aplicarFiltroFechaPago = aplicarFiltroFechaPago;
window.actualizarFiltrosPago = actualizarFiltrosPago;
window.cerrarReciboPago = cerrarReciboPago;
window.descargarReciboPagoPDF = descargarReciboPagoPDF;

const alternarEstadisticasGlobales = () => {
  const panel = document.getElementById('estadisticasGlobalesAdmin');
  const button = document.getElementById('btnAbrirEstadisticasGlobales');
  if (!panel) return;
  const ocultar = panel.classList.toggle('hidden');
  button.textContent = ocultar ? 'Abrir Dashboard de Estadísticas Globales ➔' : 'Ocultar Estadísticas Globales';
  if (!ocultar) renderizarGraficasAdmin();
};

const renderizarGraficasAdmin = () => {
  let totalPagados = 0;
  let totalAbonados = 0;
  let totalNoPagados = 0;

  let montoRecolectado = 0;
  let montoAdeudado = 0;

  for (let year = 1; year <= 5; year++) {
    const list = attendanceData.years[year]?.students || [];
    list.forEach(st => {
      const pago = obtenerPagoPeriodo(st);
      if (!coincideConFiltrosPago(st, pago)) return;
      const estado = pago.status || 'no_pago';
      const cuota = costoPeriodo();

      if (estado === 'pago') {
        totalPagados++;
        montoRecolectado += parseFloat(pago.amount) || cuota;
      } else if (estado === 'abono') {
        totalAbonados++;
        const abono = parseFloat(pago.amount) || 0;
        montoRecolectado += abono;
        montoAdeudado += Math.max(0, cuota - abono);
      } else {
        totalNoPagados++;
        montoAdeudado += cuota;
      }
    });
  }

  const ctxPagos = document.getElementById('graficaEstadoPagosAdmin');
  if (ctxPagos) {
    if (chartEstadoPagosAdmin) chartEstadoPagosAdmin.destroy();
    chartEstadoPagosAdmin = new Chart(ctxPagos.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Pagaron Completo', 'Han Abonado', 'No Han Pagado'],
        datasets: [{
          data: [totalPagados, totalAbonados, totalNoPagados],
          backgroundColor: ['#16a34a', '#eab308', '#dc2626'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  const ctxFinanzas = document.getElementById('graficaFinancieraMensualAdmin');
  if (ctxFinanzas) {
    if (chartFinanzasAdmin) chartFinanzasAdmin.destroy();
    chartFinanzasAdmin = new Chart(ctxFinanzas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Recolectado ($)', 'Adeudado ($)'],
        datasets: [{
          label: 'Monto ($)',
          data: [montoRecolectado, montoAdeudado],
          backgroundColor: ['#0284c7', '#f97316'],
          borderColor: ['#0369a1', '#c2410c'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
};

let miGrafica = null;

const abrirReportes = () => {
  window.location.href = 'reportes.html';
};

const abrirNotas = () => {
  if (!canLoadStudentGrades()) {
    showToast('Debes iniciar sesión como profesor para cargar notas');
    return;
  }
  window.location.href = 'notas.html';
};

const cerrarReportes = () => {
  document.getElementById('seccionReportes').style.display = 'none';
  document.getElementById('contenedorPrincipal').style.display = 'block';
};

const generarGraficaYTabla = () => {
  const estudianteId = document.getElementById('selectorEstudianteReporte').value;
  const fechaInicio = document.getElementById('fechaInicioReporte').value;
  const fechaFin = document.getElementById('fechaFinReporte').value;

  if (!estudianteId) return;

  const estudiante = getCurrentStudents().find(e => String(e.id) === String(estudianteId));
  if (!estudiante) return;

  let totalAsistencias = 0;
  let totalInasistencias = 0;

  if (estudiante.historialAsistencia) {
    Object.entries(estudiante.historialAsistencia).forEach(([fechaGuardada, estado]) => {
      let entraEnRango = true;
      if (fechaInicio && fechaGuardada < fechaInicio) entraEnRango = false;
      if (fechaFin && fechaGuardada > fechaFin) entraEnRango = false;

      if (entraEnRango) {
        if (estado === 'asistente') totalAsistencias++;
        if (estado === 'inasistente') totalInasistencias++;
      }
    });
  }

  const tbody = document.getElementById('tablaReporteBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr style="color: #000000;">
        <td style="color: #000000; font-weight: bold; padding: 8px;">${estudiante.nombre || estudiante.name}</td>
        <td style="color: green; font-weight: bold; padding: 8px;">${totalAsistencias}</td>
        <td style="color: red; font-weight: bold; padding: 8px;">${totalInasistencias}</td>
      </tr>
    `;
  }

  const ctx = document.getElementById('graficaAsistencia')?.getContext('2d');
  if (ctx) {
    if (typeof miGrafica !== 'undefined' && miGrafica) {
      miGrafica.destroy();
    }

    miGrafica = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Asistencias', 'Inasistencias'],
        datasets: [{
          label: 'Días en el rango seleccionado',
          data: [totalAsistencias, totalInasistencias],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }
};

const init = () => {
  loadData();
  
  const savedUser = sessionStorage.getItem('activeUser');
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      const currentTeacher = Object.values(TEACHERS).find(teacher => teacher.name === parsedUser.name);
      if (currentTeacher) {
        currentUser = currentTeacher;
        sessionStorage.setItem('activeUser', JSON.stringify(currentTeacher));
      } else {
        sessionStorage.removeItem('activeUser');
      }
    } catch (error) {
      sessionStorage.removeItem('activeUser');
    }
  }

  if (currentUser?.soloReportes && !window.location.pathname.toLowerCase().endsWith('reportes.html')) {
    window.location.replace('reportes.html');
    return;
  }

  buildSelectors();

  if (yearSelect) yearSelect.value = selectedYear;
  updateSubjectOptions(selectedYear);
  if (dateInput) dateInput.value = selectedDate;
  
  renderLanding();

  if (currentUser) {
    if (currentUser.soloAdmin) {
      abrirAdminNestor();
    } else if (window.location.hash === '#registro-asistencia' || !document.getElementById('landingView')) {
      document.getElementById('landingView')?.classList.add('hidden');
      document.getElementById('mainView')?.classList.remove('hidden');
      showView('main');
      renderStudentList();
      history.replaceState(null, '', window.location.pathname);
    } else {
      showView('landing');
    }
  } else {
    if (document.getElementById('landingView')) {
      document.getElementById('landingView')?.classList.remove('hidden');
    }
    showView(document.getElementById('landingView') ? 'landing' : 'main');
  }

  syncStudentManagementControls();
  renderSelectionInfo();
  updateLastEmailStatus();
  configurarPeriodosPago();

  if (yearSelect) yearSelect.addEventListener('change', updateYearSelection);
  if (subjectSelect) subjectSelect.addEventListener('change', updateSubjectSelection);
  if (dateInput) dateInput.addEventListener('change', updateDateSelection);
  if (studentForm) studentForm.addEventListener('submit', handleStudentFormSubmit);
  if (studentSearchInput) studentSearchInput.addEventListener('input', applyStudentNameFilter);
  if (studentListContainer) studentListContainer.addEventListener('click', handleStudentListClick);
  if (exportWordBtn) exportWordBtn.addEventListener('click', exportCurrentToPdf);
  if (landingAddStudentBtn) landingAddStudentBtn.addEventListener('click', handleLandingAddStudent);
  if (mainAddStudentBtn) mainAddStudentBtn.addEventListener('click', () => openAddStudentView('main'));
  const sendDailyEmailsBtn = document.getElementById('sendDailyEmailsNow');
  if (sendDailyEmailsBtn) sendDailyEmailsBtn.addEventListener('click', sendDailyEmailsNow);
  if (cerrarSesionBtn) cerrarSesionBtn.addEventListener('click', cerrarSesion);
  if (closeAddStudentBtn) closeAddStudentBtn.addEventListener('click', closeAddStudentView);
  const montoAbonoInput = document.getElementById('montoAbonoInput');
  if (montoAbonoInput) {
    montoAbonoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        guardarAbono();
      }
    });
  }
  if (backToLandingBtn) {
    backToLandingBtn.addEventListener('click', () => {
      if (!document.getElementById('landingView') || isRegistrationPage()) {
        redirectToLoginPage();
        return;
      }
      showView('landing');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupPasswordReveal();
  init();
});
