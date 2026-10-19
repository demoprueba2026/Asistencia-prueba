let chartEstadoPagosAdmin = null;
let chartFinanzasAdmin = null;
const CUOTA_MENSUAL_ESTUDIANTE = 60;
const COSTO_INSCRIPCION = 300;
const PERIODOS_PAGO = [  { id: 'inscripcion', label: 'Inscripción' },  { id: 'enero', label: 'Enero' },  { id: 'febrero', label: 'Febrero' },  { id: 'marzo', label: 'Marzo' },  { id: 'abril', label: 'Abril' },  { id: 'mayo', label: 'Mayo' },  { id: 'junio', label: 'Junio' },  { id: 'julio', label: 'Julio' },  { id: 'agosto', label: 'Agosto' },  { id: 'septiembre', label: 'Septiembre' },  { id: 'octubre', label: 'Octubre' },  { id: 'noviembre', label: 'Noviembre' },  { id: 'diciembre', label: 'Diciembre' },];
let periodoPagoActual = getMesActualId();
let fechaPagoActual = new Date().toISOString().slice(0, 10);
let filtroFechaPago = null;

const obtenerTodosLosEstudiantes = () => Object.values(attendanceData.years || {})
  .flatMap((yearData, index) => (yearData.students || []).map(student => ({ ...student, calculatedYear: index + 1 })));

const normalizarMontoPago = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const obtenerPagoPeriodo = (student, periodo = periodoPagoActual) => {
  if (!student) return { status: 'no_pago', amount: 0, date: '' };
  const pagos = parsePayments(student.payments);
  const pagoGuardado = pagos[periodo];
  if (pagoGuardado && (pagoGuardado.status || pagoGuardado.amount !== undefined)) {
    return {
      status: pagoGuardado.status || 'no_pago',
      amount: normalizarMontoPago(pagoGuardado.amount),
      date: pagoGuardado.date || '',
    };
  }
  return { status: 'no_pago', amount: 0, date: '' };
};

const coincideConFiltrosPago = (student, pago) => {
  const busqueda = (document.getElementById('busquedaPagoInput')?.value || '').toLowerCase().trim();
  const anoSeleccionado = document.getElementById('filtroAnoAdminSelect')?.value || '';

  const cedula = String(student.cedula || '').toLowerCase().trim();
  const cedulaSoloNum = cedula.replace(/\D/g, '');
  const busquedaSoloNum = busqueda.replace(/\D/g, '');

  const coincideCedula = !busqueda
    || cedula.includes(busqueda)
    || (busquedaSoloNum.length > 0 && cedulaSoloNum.includes(busquedaSoloNum));

  return coincideCedula
    && (!anoSeleccionado || String(student.calculatedYear || student.year) === anoSeleccionado)
    && (!filtroFechaPago || pago.date === filtroFechaPago);
};

const costoPeriodo = (periodo = periodoPagoActual) => periodo === 'inscripcion' ? COSTO_INSCRIPCION : CUOTA_MENSUAL_ESTUDIANTE;

const guardarPagoPeriodo = (student, status, amount = 0, periodo = periodoPagoActual) => {
  if (!student) return;
  student.payments = parsePayments(student.payments);
  const monto = status === 'pago' ? costoPeriodo(periodo) : normalizarMontoPago(amount);
  student.payments[periodo] = {
    status,
    amount: monto,
    date: fechaPagoActual || new Date().toISOString().slice(0, 10),
  };
};

