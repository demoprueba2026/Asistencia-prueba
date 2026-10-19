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

