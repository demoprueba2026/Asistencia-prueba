const configurarPeriodosPago = () => {
  const select = document.getElementById('periodoPagoSelect');
  if (!select) return;
  select.innerHTML = PERIODOS_PAGO.map(periodo => `<option value="${periodo.id}">${periodo.label}</option>`).join('');
  if (!PERIODOS_PAGO.some(periodo => periodo.id === periodoPagoActual)) periodoPagoActual = getMesActualId();
  select.value = periodoPagoActual;
  const fechaInput = document.getElementById('fechaPagoInput');
  if (fechaInput) fechaInput.value = fechaPagoActual;
  actualizarEtiquetaPeriodoPago();
};

const actualizarEtiquetaPeriodoPago = () => {
  const etiqueta = document.getElementById('periodoPagoActualLabel');
  const periodo = PERIODOS_PAGO.find(item => item.id === periodoPagoActual);
  if (etiqueta && periodo) etiqueta.textContent = `(${periodo.label})`;
};

const actualizarFiltrosPago = () => {
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarPeriodoPago = (periodo) => {
  periodoPagoActual = periodo;
  filtroFechaPago = null;
  actualizarEtiquetaPeriodoPago();
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarFechaPago = (fecha) => {
  fechaPagoActual = fecha || new Date().toISOString().slice(0, 10);
  filtroFechaPago = fecha || null;
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const aplicarFiltroFechaPago = (filtro) => {
  const fecha = new Date();
  if (filtro === 'ayer') fecha.setDate(fecha.getDate() - 1);
  if (filtro === 'semana') fecha.setDate(fecha.getDate() - 7);
  filtroFechaPago = filtro === 'todo' ? null : fecha.toISOString().slice(0, 10);
  if (filtroFechaPago) {
    fechaPagoActual = filtroFechaPago;
    const inputFecha = document.getElementById('fechaPagoInput');
    if (inputFecha) inputFecha.value = filtroFechaPago;
  }
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

window.abrirAdminNestor = abrirAdminNestor;
window.cerrarAdminNestor = cerrarAdminNestor;
window.cambiarEstadoPago = cambiarEstadoPago;
window.abrirModalAbono = abrirModalAbono;
window.cerrarModalAbono = cerrarModalAbono;
window.guardarAbono = guardarAbono;
window.cambiarPeriodoPago = cambiarPeriodoPago;
window.cambiarFechaPago = cambiarFechaPago;
window.aplicarFiltroFechaPago = aplicarFiltroFechaPago;
window.actualizarFiltrosPago = actualizarFiltrosPago;
window.cerrarReciboPago = cerrarReciboPago;
window.descargarReciboPagoPDF = descargarReciboPagoPDF;

