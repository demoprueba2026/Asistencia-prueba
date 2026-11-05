const sincronizarAsistencia = async (student, status) => {
  try {
    const teacherName = (typeof currentUser !== 'undefined' && currentUser?.name)
      ? currentUser.name
      : (JSON.parse(sessionStorage.getItem('activeUser') || '{}').name || '');
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

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
        teacher: teacherName,
        time: timeFormatted,
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

