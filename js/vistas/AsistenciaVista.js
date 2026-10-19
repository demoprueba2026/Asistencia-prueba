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

