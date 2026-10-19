// CONFIGURACIÓN DE ENLACES
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR2dzgdf5bWl2KBYcGTWxjjiIk6qKQ5NWjde1eyiv0Gy0velu_8JTPdu8O8WicEJQ/pub?output=csv`;
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SYNC_STATE = `${API_BASE_URL}/api/sync-state`; // Endpoint hacia la base de datos
const API_STUDENTS = `${API_BASE_URL}/api/students`;
const PORTAL_BASE_PATH = window.location.pathname.match(/^(.*\/portal-estudiantes\.html)(?:\/.*)?$/)?.[1] || window.location.pathname;
const PERIODOS_PAGO = [
  { id: 'inscripcion', label: 'Inscripción' },
  { id: 'enero', label: 'Enero' },
  { id: 'febrero', label: 'Febrero' },
  { id: 'marzo', label: 'Marzo' },
  { id: 'abril', label: 'Abril' },
  { id: 'mayo', label: 'Mayo' },
  { id: 'junio', label: 'Junio' },
  { id: 'julio', label: 'Julio' },
  { id: 'agosto', label: 'Agosto' },
  { id: 'septiembre', label: 'Septiembre' },
  { id: 'octubre', label: 'Octubre' },
  { id: 'noviembre', label: 'Noviembre' },
  { id: 'diciembre', label: 'Diciembre' },
];

let datosEstudianteActual = null;
let chartsInstancias = {};
let boletaAutorizadaActual = false;

const materiasOficiales = [ "Castellano", "Ingles", "Matematica", "Educacion Fisica", "Arte y Patrimonio", "Ciencias Naturales", "GHC", "Orientacion y Convivencia" ];
const codigosMaterias = { "Castellano": "CA", "Ingles": "LE", "Matematica": "MA", "Educacion Fisica": "EF", "Arte y Patrimonio": "AyP", "Ciencias Naturales": "CN", "GHC": "GHC", "Orientacion y Convivencia": "OyC", "CRP": "FRA" };
const nombresLargoMaterias = { "Castellano": "CASTELLANO", "Ingles": "INGLÉS Y OTRAS LENGUAS EXTRANJERAS", "Matematica": "MATEMÁTICAS", "Educacion Fisica": "EDUCACIÓN FÍSICA", "Arte y Patrimonio": "ARTE Y PATRIMONIO", "Ciencias Naturales": "CIENCIAS NATURALES", "GHC": "GEOGRAFÍA, HISTORIA Y CIUDADANÍA", "Orientacion y Convivencia": "ORIENTACIÓN Y CONVIVENCIA" };

const normalizarTexto = (texto) => texto ? String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
const normalizarCedula = (cedula) => String(cedula || '').trim().toUpperCase().replace(/\D/g, '') || String(cedula || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizarMontoPago = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const coincideConEstudiante = (registro, estudiante) => {
  const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
  const nombreKey = obtenerClaveEstudiante(estudiante, 'nombre');
  const cedulaRegistroKey = obtenerClaveEstudiante(registro, 'cedula');
  const nombreRegistroKey = obtenerClaveEstudiante(registro, 'nombre');
  const cedulaEstudiante = normalizarCedula(estudiante[cedulaKey]);
  const nombreEstudiante = normalizarTexto(estudiante[nombreKey] || estudiante.Nombre || estudiante.name);
  const cedulaRegistro = normalizarCedula(registro[cedulaRegistroKey] || registro.identificacion);
  const nombreRegistro = normalizarTexto(registro[nombreRegistroKey] || registro.name || registro.Nombre);

  if (cedulaEstudiante && cedulaRegistro) {
    return cedulaEstudiante === cedulaRegistro;
  }
  return Boolean(nombreEstudiante && nombreRegistro && nombreEstudiante === nombreRegistro);
};

const obtenerClaveEstudiante = (estudiante, tipo) => Object.keys(estudiante || {}).find(key => {
  const clave = normalizarTexto(key);
  if (tipo === 'cedula') return clave.includes('cedula');
  if (tipo === 'ano') return clave.includes('ano') || clave.includes('grado');
  return clave.includes('nombre') || clave.includes('estudiante') || clave === 'name';
});

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const obtenerNotasDeSheets = async () => {
  try {
    const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Sheets respondió con ${response.status}`);

    const text = await response.text();
    const rows = text.split(/\r?\n/).filter(row => row.trim() !== '').map(parseCsvLine);
    if (!rows.length) return [];

    const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim());
    return rows.slice(1).map(row => headers.reduce((student, header, index) => {
      student[header] = row[index] || '';
      return student;
    }, {}));
  } catch (error) {
    console.error('Error al leer Google Sheets:', error);
    return null;
  }
};
const extraerValorColumna = (datos, materia, lapso) => {
  const materiaNormalizada = normalizarTexto(materia).replace(/[^a-z0-9]+/g, ' ').trim();
  const idsMateria = {
    castellano: ['castellano'],
    ingles: ['ingles'],
    matematica: ['matematicas', 'matematica'],
    matematicas: ['matematicas', 'matematica'],
    crp: ['frances', 'crp'],
    'educacion fisica': ['educacion-fisica'],
    'arte y patrimonio': ['arte-patrimonio'],
    'ciencias naturales': ['ciencias-naturales'],
    fisica: ['fisica'],
    quimica: ['quimica'],
    biologia: ['biologia'],
    'ciencias de la tierra': ['ciencias-tierra'],
    'formacion para la soberania': ['formacion-soberania'],
    ghc: ['ghc'],
    'geografia historia y ciudadania': ['ghc'],
    'orientacion y convivencia': ['orientacion-convivencia'],
    frances: ['frances'],
  };
  const savedGradeEntries = (idsMateria[materiaNormalizada] || [])
    .map((subjectId) => {
      const grades = datos?.grades?.[subjectId];
      const period = Object.keys(grades || {}).find((key) => normalizarTexto(key) === normalizarTexto(lapso));
      return period ? { value: grades[period] } : null;
    })
    .filter((entry) => entry !== null);
  const savedGradeEntry = savedGradeEntries.find((entry) => entry.value !== null && entry.value !== '')
    || savedGradeEntries[0];
  if (savedGradeEntry) {
    return savedGradeEntry.value === null || savedGradeEntry.value === ''
      ? '-'
      : String(savedGradeEntry.value);
  }

  const claveBuscada = normalizarTexto(`${materia}_${lapso}`).replace(/\s+/g, '');
  const clave = Object.keys(datos || {}).find((nombre) => {
    const nombreNormalizado = normalizarTexto(nombre).replace(/\s+/g, '');
    return nombreNormalizado === claveBuscada;
  });
  return clave ? datos[clave] || '-' : '-';
};

const actualizarTexto = (id, valor) => {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor || '-';
};

const renderizarBoletaEstudiante = (estudiante) => {
  const materias = [
    ['Castellano', 'CA'],
    ['Inglés', 'LE'],
    ['Matemáticas', 'MA'],
    ['Educación Fisíca', 'EF'],
    ['Arte y Patrimonio', 'AyP'],
    ['Ciencias Naturales', 'CN'],
    ['Geografía, historia y ciudadania', 'GHC'],
    ['Orientación y convivencia', 'OyC'],
  ];
  const materiasAdicionales = [
    ['Física', 'FI'],
    ['Química', 'QU'],
    ['Biología', 'BI'],
    ['Ciencias de la Tierra', 'CT'],
    ['Formación para la Soberanía', 'FS'],
  ].filter(([materia]) => ['1er', '2do', '3er', 'Final']
    .some((lapso) => extraerValorColumna(estudiante, materia, lapso) !== '-'));
  const materiasBoleta = [...materias, ...materiasAdicionales];

  const cuerpo = document.getElementById('tablaNotasBody');
  if (cuerpo) {
    cuerpo.innerHTML = materiasBoleta.map(([materia]) => `
      <tr>
        <td class="col-area">${materia.toUpperCase()}</td>
        <td>${extraerValorColumna(estudiante, materia, '1er')}</td>
        <td>${extraerValorColumna(estudiante, materia, '2do')}</td>
        <td>${extraerValorColumna(estudiante, materia, '3er')}</td>
        <td>${extraerValorColumna(estudiante, materia, 'Final')}</td>
        <td>-</td><td>-</td><td>-</td><td>-</td>
        <td>-</td><td>-</td><td>-</td>
      </tr>
    `).join('');
  }

  actualizarTexto('prom1er', extraerValorColumna(estudiante, 'Promedio del estudiante', '1er'));
  actualizarTexto('prom2do', extraerValorColumna(estudiante, 'Promedio del estudiante', '2do'));
  actualizarTexto('prom3er', extraerValorColumna(estudiante, 'Promedio del estudiante', '3er'));
  actualizarTexto('promFinal', extraerValorColumna(estudiante, 'Promedio del estudiante', 'Final'));

  const ano = estudiante[obtenerClaveEstudiante(estudiante, 'ano')];
  const seccionKey = Object.keys(estudiante).find((key) => normalizarTexto(key).includes('seccion'));
  actualizarTexto('anoEscolarDisplay', 'AÑO ESCOLAR 2026-2027');
  actualizarTexto('anoDisplay', ano || '-');
  actualizarTexto('seccionDisplay', 'U');

  actualizarTexto('crp1er', extraerValorColumna(estudiante, 'Francés', '1er'));
  actualizarTexto('crp2do', extraerValorColumna(estudiante, 'Francés', '2do'));
  actualizarTexto('crp3er', extraerValorColumna(estudiante, 'Francés', '3er'));
  actualizarTexto('crpFinal', extraerValorColumna(estudiante, 'Francés', 'Final'));
  renderizarGraficos(materias.slice(0, 7), estudiante, estudiante, estudiante);
};

const renderizarGraficos = (materias, datosPrimerLapso, datosSegundoLapso, datosTercerLapso) => {
  if (typeof Chart === 'undefined') return;

  const colores = ['#4472c4', '#ed7d31', '#7f7f7f'];
  const lapsos = [
    ['chart1erLapso', '1er', datosPrimerLapso, colores[0]],
    ['chart2doLapso', '2do', datosSegundoLapso, colores[1]],
    ['chart3erLapso', '3er', datosTercerLapso, colores[2]],
  ];
  const etiquetas = materias.map(([, codigo]) => codigo);

  lapsos.forEach(([id, lapso, datos, color]) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    chartsInstancias[id]?.destroy();

    chartsInstancias[id] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          data: materias.map(([materia]) => {
            const valor = Number.parseFloat(String(extraerValorColumna(datos, materia, lapso)).replace(',', '.'));
            return Number.isFinite(valor) ? valor : null;
          }),
          backgroundColor: color,
          borderColor: color,
          borderWidth: 0,
          barPercentage: 0.42,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#333333', font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            max: 20,
            ticks: { stepSize: 2, color: '#333333', font: { size: 10 } },
            grid: { color: '#b7b7b7', lineWidth: 1 },
          },
        },
      },
    });
  });
};

window.descargarBoletaPDF = async () => {
  if (!datosEstudianteActual || !window.jspdf?.jsPDF || !window.html2canvas) return;

  const boton = document.getElementById('btnDescargarBoleta');
  const textoOriginal = boton?.textContent;
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Generando PDF...';
  }

  try {
    const { jsPDF } = window.jspdf;
    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const boleta = document.querySelector('.boletin-paper');
    const imagenBoleta = await window.html2canvas(boleta, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
    });
    const margen = 8;
    const anchoPagina = documento.internal.pageSize.getWidth();
    const altoPagina = documento.internal.pageSize.getHeight();
    const anchoDisponible = anchoPagina - (margen * 2);
    const altoDisponible = altoPagina - (margen * 2);
    const altoProporcional = (imagenBoleta.height * anchoDisponible) / imagenBoleta.width;
    const escala = Math.min(1, altoDisponible / altoProporcional);
    const anchoFinal = anchoDisponible * escala;
    const altoFinal = altoProporcional * escala;
    const posicionX = (anchoPagina - anchoFinal) / 2;
    const posicionY = (altoPagina - altoFinal) / 2;

    documento.addImage(imagenBoleta.toDataURL('image/png'), 'PNG', posicionX, posicionY, anchoFinal, altoFinal);
    const nombre = String(datosEstudianteActual.Nombre || 'estudiante').trim().replace(/\s+/g, '_');
    documento.save(`Boleta_${nombre}.pdf`);
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }
};

// Modificación importante: Fetch a la API en lugar de LocalStorage
const obtenerEstadoGlobalBackend = async () => {
  try {
    const response = await fetch(`${API_SYNC_STATE}?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) return await response.json();
  } catch (error) {
    console.error("Error al consultar la autorización desde el backend:", error);
  }
  return null;
};

const valorBoletaAutorizada = (estudiante) => {
  if (!estudiante) return null;
  const estado = estudiante.BoletaVisible
    ?? estudiante.boleta_visible
    ?? estudiante.boletaVisible
    ?? estudiante.boletaAutorizada;
  if (estado === undefined || estado === null || estado === '') return null;
  if (typeof estado === 'boolean') return estado;
  const valorNormalizado = String(estado).toUpperCase().trim();
  if (['SI', 'SÍ', 'TRUE', '1', 'AUTORIZADO', 'AUTORIZADA'].includes(valorNormalizado)) return true;
  if (['NO', 'FALSE', '0', 'DESAUTORIZADO', 'DESAUTORIZADA'].includes(valorNormalizado)) return false;
  return null;
};

const verificarAutorizacionBoleta = async (estudiante) => {
  const estudianteRegistrado = await obtenerEstudiantePagosBackend(estudiante);
  const autorizacionDirecta = valorBoletaAutorizada(estudianteRegistrado);
  if (autorizacionDirecta !== null) return autorizacionDirecta;

  const backendData = await obtenerEstadoGlobalBackend();
  
  if (backendData && backendData.years) {
    let estadoEstudianteBackend = null;
    for (let year in backendData.years) {
      const estudiantesAno = backendData.years[year].students || [];
      const estudianteEncontrado = estudiantesAno.find(st => coincideConEstudiante(st, estudiante));
      
      if (estudianteEncontrado) {
        estadoEstudianteBackend = valorBoletaAutorizada(estudianteEncontrado);
        break;
      }
    }

    if (estadoEstudianteBackend !== null) return estadoEstudianteBackend;
  }

  return false;
};

const obtenerEstudiantePagosBackend = async (estudiante) => {
  const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
  const cedula = estudiante?.[cedulaKey];
  if (!cedula) return null;

  try {
    const response = await fetch(`${API_STUDENTS}?cedula=${encodeURIComponent(cedula)}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const estudiantes = await response.json().catch(() => []);
    return Array.isArray(estudiantes)
      ? estudiantes.find((registro) => coincideConEstudiante(registro, estudiante)) || estudiantes[0] || null
      : null;
  } catch (error) {
    console.warn('No se pudieron consultar los pagos del estudiante:', error);
    return null;
  }
};

const obtenerEstudianteSupabasePorId = async (id) => {
  try {
    const response = await fetch(`${API_STUDENTS}?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const estudiantes = await response.json().catch(() => []);
    return Array.isArray(estudiantes)
      ? estudiantes.find((estudiante) => String(estudiante.id) === String(id)) || null
      : null;
  } catch (error) {
    console.warn('No se pudo consultar el estudiante por ID:', error);
    return null;
  }
};

const actualizarUrlEstudiante = (id) => {
  const url = new URL(window.location.href);
  url.pathname = `${PORTAL_BASE_PATH}/${encodeURIComponent(id)}`;
  window.history.replaceState({}, '', url);
};

const obtenerIdEstudianteDeUrl = () => {
  const segmento = window.location.pathname.slice(PORTAL_BASE_PATH.length).replace(/^\/+/, '').split('/')[0];
  return segmento ? decodeURIComponent(segmento) : '';
};

document.getElementById('loginEstudianteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedulaIngresada = document.getElementById('estudianteCedula').value;
  const botonSubmit = e.target.querySelector('button');
  const msjError = document.getElementById('errorMensaje');
  
  botonSubmit.textContent = "Buscando datos...";
  msjError.style.display = 'none';

  try {
    const todasLasNotas = await obtenerNotasDeSheets();
    if (!todasLasNotas) {
      msjError.textContent = '❌ Error conectando con la base de datos.';
      msjError.style.display = 'block';
      return;
    }

    const alumnoEncontrado = todasLasNotas.find((estudiante) => {
      const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
      return cedulaKey && normalizarCedula(estudiante[cedulaKey]) === normalizarCedula(cedulaIngresada);
    });

    if (!alumnoEncontrado) {
      msjError.textContent = '❌ Cédula no encontrada. Verifica los datos ingresados.';
      msjError.style.display = 'block';
      return;
    }

    const nombreKey = obtenerClaveEstudiante(alumnoEncontrado, 'nombre');
    alumnoEncontrado.Nombre = alumnoEncontrado[nombreKey];
    const estudianteSupabase = await obtenerEstudiantePagosBackend(alumnoEncontrado);
    if (!estudianteSupabase?.id) {
      msjError.textContent = '❌ No se encontró el registro de este estudiante en Supabase.';
      msjError.style.display = 'block';
      return;
    }

    alumnoEncontrado.id = estudianteSupabase.id;
    alumnoEncontrado.grades = estudianteSupabase.grades || {};
    datosEstudianteActual = alumnoEncontrado;
    actualizarUrlEstudiante(estudianteSupabase.id);
    boletaAutorizadaActual = await verificarAutorizacionBoleta(datosEstudianteActual);
    mostrarDashboard();
    await renderizarReciboEstudiante();
    mostrarDocumento(boletaAutorizadaActual ? 'boleta' : 'recibo');
  } catch (error) {
    console.error('No se pudo cargar el portal del estudiante:', error);
    msjError.textContent = '❌ No se pudieron cargar los datos del estudiante.';
    msjError.style.display = 'block';
  } finally {
    botonSubmit.textContent = 'Entrar';
  }
});

const cargarEstudianteDesdeUrl = async () => {
  const id = obtenerIdEstudianteDeUrl();
  if (!id) return;

  const landingView = document.getElementById('landingView');
  const loadingView = document.getElementById('portalLoading');
  const msjError = document.getElementById('errorMensaje');
  landingView.classList.add('hidden');
  loadingView.classList.remove('hidden');

  const mostrarError = (mensaje) => {
    loadingView.classList.add('hidden');
    landingView.classList.remove('hidden');
    landingView.style.display = '';
    msjError.textContent = mensaje;
    msjError.style.display = 'block';
  };

  try {
    const estudianteSupabase = await obtenerEstudianteSupabasePorId(id);
    if (!estudianteSupabase) {
      mostrarError('❌ No se encontró un estudiante con ese enlace.');
      return;
    }

    const todasLasNotas = await obtenerNotasDeSheets();
    if (!todasLasNotas) {
      mostrarError('❌ Error conectando con la base de datos.');
      return;
    }

    const alumnoEncontrado = todasLasNotas.find((estudiante) => coincideConEstudiante(estudiante, estudianteSupabase));
    if (!alumnoEncontrado) {
      mostrarError('❌ No se encontraron las calificaciones de este estudiante.');
      return;
    }

    const nombreKey = obtenerClaveEstudiante(alumnoEncontrado, 'nombre');
    alumnoEncontrado.Nombre = alumnoEncontrado[nombreKey];
    alumnoEncontrado.id = estudianteSupabase.id;
    alumnoEncontrado.grades = estudianteSupabase.grades || {};
    datosEstudianteActual = alumnoEncontrado;
    boletaAutorizadaActual = await verificarAutorizacionBoleta(datosEstudianteActual);
    mostrarDashboard();
    await renderizarReciboEstudiante();
    mostrarDocumento(boletaAutorizadaActual ? 'boleta' : 'recibo');
  } catch (error) {
    console.error('No se pudo cargar el estudiante desde el enlace:', error);
    mostrarError('❌ No se pudieron cargar los datos del estudiante.');
  }
};

cargarEstudianteDesdeUrl();

const mostrarDashboard = () => {
  const nombre = datosEstudianteActual?.Nombre || '';
  const cedulaKey = obtenerClaveEstudiante(datosEstudianteActual, 'cedula');
  const cedula = datosEstudianteActual?.[cedulaKey] || '';
  const nombreBoleta = document.getElementById('nombreCompletoDisplay');
  const cedulaBoleta = document.getElementById('cedulaDisplay');
  if (nombreBoleta) nombreBoleta.textContent = nombre;
  if (cedulaBoleta) cedulaBoleta.textContent = cedula;
  renderizarBoletaEstudiante(datosEstudianteActual);
  document.getElementById('nombreAlumnoDisplay').textContent = nombre;
  document.getElementById('portalLoading').classList.add('hidden');
  document.getElementById('landingView').classList.add('hidden');
  document.getElementById('mainView').classList.remove('hidden');
  document.getElementById('mainView').style.display = '';
};

const mostrarDocumento = (documento) => {
  if (documento === 'recibo' && datosEstudianteActual) {
    renderizarReciboEstudiante();
  }
  const mostrarBoleta = documento === 'boleta' && boletaAutorizadaActual;
  const boletaPanel = document.getElementById('boletaPanel');
  const reciboPanel = document.getElementById('reciboPanel');
  const tabBoleta = document.getElementById('tabBoleta');
  const tabRecibo = document.getElementById('tabRecibo');
  const boletaBloqueada = document.getElementById('boletaBloqueada');

  if (boletaPanel) boletaPanel.classList.toggle('hidden', !mostrarBoleta);
  if (reciboPanel) reciboPanel.classList.toggle('hidden', mostrarBoleta);
  if (tabBoleta) {
    tabBoleta.classList.toggle('active', mostrarBoleta);
    tabBoleta.style.display = boletaAutorizadaActual ? '' : 'none';
    tabBoleta.setAttribute('aria-selected', String(mostrarBoleta));
  }
  if (tabRecibo) {
    tabRecibo.classList.toggle('active', !mostrarBoleta);
    tabRecibo.setAttribute('aria-selected', String(!mostrarBoleta));
  }
  if (boletaBloqueada) boletaBloqueada.style.display = boletaAutorizadaActual ? 'none' : 'block';
};

// Reemplazar consulta de recibo de pagos
const renderizarReciboEstudiante = async () => {
  let estudianteBackend = null;
  let anoEstudiante = '';

  estudianteBackend = await obtenerEstudiantePagosBackend(datosEstudianteActual);
  if (estudianteBackend) anoEstudiante = estudianteBackend.year || '';

  const backendData = await obtenerEstadoGlobalBackend();

  if (!estudianteBackend && backendData && backendData.years) {
    Object.entries(backendData.years).some(([year, yearData]) => {
      const encontrado = (yearData.students || []).find(student => {
        return coincideConEstudiante(student, datosEstudianteActual);
      });
      if (encontrado) {
        estudianteBackend = encontrado;
        anoEstudiante = year;
        return true;
      }
      return false;
    });
  }

  const parsePayments = (val) => {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return { ...val };
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const pagosRegistrados = parsePayments(estudianteBackend?.payments);

  const estadoPago = String(estudianteBackend?.paymentStatus ?? estudianteBackend?.payment_status ?? '').toLowerCase();
  const montoPago = normalizarMontoPago(estudianteBackend?.paidAmount ?? estudianteBackend?.paid_amount ?? 0);

  const pagos = Object.entries(pagosRegistrados)
    .filter(([, pago]) => pago && typeof pago === 'object')
    .map(([periodo, pago]) => ({
      periodo,
      status: String(pago.status || 'no_pago').toLowerCase(),
      amount: normalizarMontoPago(pago.amount ?? pago.monto ?? 0),
      date: pago.date || '',
    }));

  if (!pagos.length && (estadoPago === 'pago' || estadoPago === 'abono')) {
    pagos.push({
      periodo: 'actual',
      status: estadoPago,
      amount: montoPago,
      date: '',
    });
  }

  const pagosFiltrados = pagos
    .filter((pago) => pago.status === 'pago' || pago.status === 'abono')
    .sort((first, second) => {
      if (first.periodo === 'inscripcion') return second.periodo === 'inscripcion' ? 0 : -1;
      if (second.periodo === 'inscripcion') return 1;
      return String(first.date || '').localeCompare(String(second.date || ''));
    });

  const cedulaKey = obtenerClaveEstudiante(datosEstudianteActual, 'cedula');
  const obtenerMontoPago = (pago) => normalizarMontoPago(pago.amount) || (pago.status === 'pago' ? 30 : 0);
  const nombrePeriodo = periodo => PERIODOS_PAGO.find(item => item.id === periodo)?.label || periodo;

  document.getElementById('reciboEstudianteNombre').textContent = datosEstudianteActual.Nombre;
  document.getElementById('reciboEstudianteCedula').textContent = datosEstudianteActual[cedulaKey] || estudianteBackend?.cedula || 'No registrada';
  document.getElementById('reciboEstudianteAno').textContent = datosEstudianteActual[obtenerClaveEstudiante(datosEstudianteActual, 'ano')] || `${anoEstudiante}° Año`;

  document.getElementById('reciboEstudiantePagosBody').innerHTML = pagosFiltrados.length
    ? pagosFiltrados.map((pago) => {
      const montoPagado = obtenerMontoPago(pago);
      const montoAbono = pago.status === 'abono'
        ? `$${montoPagado.toFixed(2)} (Abono)`
        : '- (Pago completo)';
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${nombrePeriodo(pago.periodo)}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${pago.date || 'Sin fecha'}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${montoAbono}</td><td class="recibo-amount">$${montoPagado.toFixed(2)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="4" style="padding: 15px; text-align: center;">No hay pagos registrados.</td></tr>';

  const totalPagado = pagosFiltrados.reduce((total, pago) => total + obtenerMontoPago(pago), 0);
  document.getElementById('reciboEstudianteTotal').textContent = totalPagado.toFixed(2);
};

window.cerrarSesion = () => {
  datosEstudianteActual = null;
  boletaAutorizadaActual = false;
  const mainView = document.getElementById('mainView');
  const landingView = document.getElementById('landingView');
  const loginForm = document.getElementById('loginEstudianteForm');
  const cedulaInput = document.getElementById('estudianteCedula');
  const errorMensaje = document.getElementById('errorMensaje');

  window.history.replaceState({}, '', PORTAL_BASE_PATH);
  mainView.style.display = 'none';
  mainView.classList.add('hidden');
  landingView.classList.remove('hidden');
  landingView.style.display = 'flex';
  if (loginForm) loginForm.reset();
  if (errorMensaje) errorMensaje.style.display = 'none';
  document.getElementById('boletaBloqueada').style.display = 'none';
  landingView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (cedulaInput) cedulaInput.focus();
};