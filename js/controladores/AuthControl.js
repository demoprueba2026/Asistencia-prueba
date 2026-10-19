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

