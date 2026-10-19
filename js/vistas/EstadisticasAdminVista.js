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

