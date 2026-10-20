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
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.textContent = currentUser.name;
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
