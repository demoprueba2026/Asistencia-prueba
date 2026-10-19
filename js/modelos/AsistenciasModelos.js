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

