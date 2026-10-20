const abrirAdminNestor = async () => {
  const esProfNestor = currentUser && (currentUser.name.includes("Néstor") || currentUser.name.includes("Nestor"));
  const esDavid = currentUser && (currentUser.name.includes("David") || currentUser.username === "david");
  const esAdmin = currentUser && (currentUser.esAdmin || currentUser.soloAdmin || esProfNestor || esDavid);

  if (!esAdmin) {
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

