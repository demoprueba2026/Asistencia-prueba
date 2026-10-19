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

