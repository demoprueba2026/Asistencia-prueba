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

