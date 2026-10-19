const API_STUDENTS = `${window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin}/api/students`;
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2dzgdf5bWl2KBYcGTWxjjiIk6qKQ5NWjde1eyiv0Gy0velu_8JTPdu8O8WicEJQ/pub?output=csv';
const PERIOD_LABELS = { '1er': '1er lapso', '2do': '2do lapso', '3er': '3er lapso', Final: 'Final' };
const SUBJECTS_BY_YEAR = {
  1: [
    { id: 'matematicas', label: 'Matemáticas' }, { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' }, { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' }, { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
  2: [
    { id: 'matematicas', label: 'Matemáticas' }, { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' }, { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' }, { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
  3: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' }, { id: 'crp', label: 'CRP' },
  ],
  4: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'frances', label: 'Francés' },
  ],
  5: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ciencias-tierra', label: 'Ciencias de la Tierra' },
    { id: 'ghc', label: 'GHC' }, { id: 'frances', label: 'Francés' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
};
const SHEET_SUBJECT_ALIASES = {
  matematica: ['matematica', 'matematicas'],
  matematicas: ['matematica', 'matematicas'],
  fisica: ['fisica'],
  quimica: ['quimica'],
  biologia: ['biologia'],
  'ciencias-tierra': ['ciencias de la tierra'],
  'educacion-fisica': ['educacion fisica'],
  'arte-patrimonio': ['arte y patrimonio'],
  'ciencias-naturales': ['ciencias naturales'],
  'orientacion-convivencia': ['orientacion y convivencia'],
  'formacion-soberania': ['formacion para la soberania'],
  frances: ['frances'],
  crp: ['frances', 'crp'],
};

const yearSelect = document.getElementById('yearSelect');
const subjectSelect = document.getElementById('subjectSelect');
const periodSelect = document.getElementById('periodSelect');
const studentsBody = document.getElementById('studentsBody');
const studentsHead = document.getElementById('studentsHead');
const activityList = document.getElementById('activityList');
const addActivityButton = document.getElementById('addActivity');
const assessmentTotal = document.getElementById('assessmentTotal');
const studentCount = document.getElementById('studentCount');
const statusMessage = document.getElementById('statusMessage');
const saveButton = document.getElementById('saveGrades');
const studentSearch = document.getElementById('studentSearch');

let currentUser;
let students = [];
let previousFilters = {};
let activities = [];
let originalActivities = [];
let draftScores = {};
let originalScores = {};
let draftEarnedPoints = {};
let originalEarnedPoints = {};
let manualEarnedPoints = {};
let originalManualEarnedPoints = {};

const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const normalizeCedula = (value) => String(value || '').toUpperCase().replace(/\D/g, '');

const setStatus = (message, type = '') => {
  statusMessage.textContent = message;
  statusMessage.className = `status${type ? ` ${type}` : ''}`;
};

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
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

const loadSheetRows = async () => {
  const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`La hoja de notas respondió con ${response.status}.`);
  const lines = (await response.text()).split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ''));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] || '';
      return record;
    }, {});
  });
};

const getRecordValue = (record, fragments) => {
  const key = Object.keys(record || {}).find((header) => fragments.some((fragment) => normalizeText(header).includes(fragment)));
  return key ? record[key] : '';
};

const matchSheetRecord = (student, sheetRows) => {
  const studentId = normalizeCedula(student.cedula);
  const studentName = normalizeText(student.name);
  return sheetRows.find((row) => {
    const rowId = normalizeCedula(getRecordValue(row, ['cedula', 'identificacion']));
    const rowName = normalizeText(getRecordValue(row, ['nombre', 'estudiante']));
    return (studentId && rowId && studentId === rowId)
      || (!(studentId && rowId) && studentName && rowName === studentName);
  });
};

const getSheetGrade = (record, subjectId, period) => {
  if (!record) return '';
  const subjectAliases = SHEET_SUBJECT_ALIASES[subjectId] || [subjectId.replace(/-/g, ' ')];
  const column = Object.keys(record).find((header) => {
    const normalizedHeader = normalizeText(header).replace(/\s+/g, '');
    return subjectAliases.some((alias) => normalizedHeader === normalizeText(`${alias}_${period}`).replace(/\s+/g, ''));
  });
  return column ? String(record[column] || '') : '';
};

const getAllowedYears = () => {
  const years = Array.isArray(currentUser.allowedYears) ? currentUser.allowedYears.map(Number) : [1, 2, 3, 4, 5];
  return years.filter((year) => Number.isInteger(year) && year >= 1 && year <= 5);
};

const canManageActivities = () => currentUser?.puedeGestionarActividades === true
  || normalizeText(currentUser?.name) === 'prof: andy';

const getSubjectsForYear = (year) => {
  const subjects = SUBJECTS_BY_YEAR[Number(year)] || [];
  const allowedByYear = currentUser.allowedSubjectsByYear?.[Number(year)];
  const allowed = allowedByYear || currentUser.allowedSubjects;
  return !Array.isArray(allowed) || allowed.includes('todas')
    ? subjects
    : subjects.filter((subject) => allowed.includes(subject.id));
};

const currentSubject = () => getSubjectsForYear(yearSelect.value).find((subject) => subject.id === subjectSelect.value);

const createActivityId = () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const copyJson = (value) => JSON.parse(JSON.stringify(value));

const distributeActivityWeights = () => {
  if (!activities.length) return;
  const weight = Math.floor((10000 / activities.length)) / 100;
  const remainder = Math.round((100 - weight * activities.length) * 100) / 100;
  activities.forEach((activity, index) => {
    activity.weight = index === activities.length - 1
      ? Math.round((weight + remainder) * 100) / 100
      : weight;
  });
};

const captureDraftScores = () => {
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    const { studentId, activityId } = input.dataset;
    if (!draftScores[studentId]) draftScores[studentId] = {};
    draftScores[studentId][activityId] = input.value;
  });
};

const captureDraftEarnedPoints = () => {
  studentsBody.querySelectorAll('.earned-points-input').forEach((input) => {
    const { studentId, activityId } = input.dataset;
    if (!draftEarnedPoints[studentId]) draftEarnedPoints[studentId] = {};
    draftEarnedPoints[studentId][activityId] = input.value;
  });
};

const getPreciseWeightedGrade = (studentId) => {
  const points = draftEarnedPoints[studentId] || {};
  let weightedPoints = 0;
  let hasScore = false;
  activities.forEach((activity) => {
    const earnedPoints = points[activity.id];
    if (earnedPoints !== '' && Number.isFinite(Number(earnedPoints))) {
      weightedPoints += Number(earnedPoints);
      hasScore = true;
    }
  });
  return hasScore ? Number(weightedPoints.toFixed(2)) : null;
};

const getWeightedGrade = (studentId) => {
  const grade = getPreciseWeightedGrade(studentId);
  return grade === null ? null : Math.round(grade);
};

const LAPSO_PERIODS = ['1er', '2do', '3er'];

const getLapsoGrade = (student, period) => {
  const subjectId = currentSubject()?.id;
  const value = subjectId ? student.grades?.[subjectId]?.[period] : null;
  if (value === null || value === undefined || value === '') return null;
  const grade = Number(value);
  return Number.isFinite(grade) ? Math.round(grade) : null;
};

const getDefinitiveGrade = (student) => {
  const lapsoGrades = LAPSO_PERIODS.map((period) => getLapsoGrade(student, period));
  if (lapsoGrades.some((grade) => grade === null)) return null;
  const exactGrade = Number((lapsoGrades.reduce((sum, grade) => sum + grade, 0) / LAPSO_PERIODS.length).toFixed(2));
  return { exactGrade, roundedGrade: Math.round(exactGrade) };
};

const formatFinalGrade = (grade) => (grade !== null && grade < 10 ? String(grade).padStart(2, '0') : String(grade));
const formatPreciseGrade = (grade) => String(Number(grade.toFixed(2)));

const renderGradePair = (cell, preciseGrade, roundedGrade) => {
  cell.replaceChildren();
  if (preciseGrade === null) {
    cell.textContent = '-';
    return;
  }

  const grades = document.createElement('span');
  grades.className = 'final-grade-values';
  [
    { label: 'Exacta', value: formatPreciseGrade(preciseGrade), className: 'final-grade-exact' },
    { label: 'Redondeada', value: formatFinalGrade(roundedGrade), className: 'final-grade-rounded' },
  ].forEach(({ label, value, className }) => {
    const grade = document.createElement('span');
    grade.className = `final-grade-value ${className}`;
    const gradeLabel = document.createElement('span');
    gradeLabel.textContent = label;
    const gradeValue = document.createElement('strong');
    gradeValue.textContent = value;
    grade.append(gradeLabel, gradeValue);
    grades.appendChild(grade);
  });
  cell.appendChild(grades);
};

const renderFinalGrade = (cell, studentId) => {
  const preciseGrade = getPreciseWeightedGrade(studentId);
  renderGradePair(cell, preciseGrade, preciseGrade === null ? null : Math.round(preciseGrade));
};


const getActivityMaximumPoints = (activity) => Number(((Number(activity.weight) || 0) * 20 / 100).toFixed(2));
const formatPoints = (points) => String(Number(points.toFixed(2)));

const calculateEarnedPoints = (score, activity) => {
  if (score === '' || !Number.isFinite(Number(score))) return '';
  return String(Number((Number(score) * Number(activity.weight) / 100).toFixed(2)));
};

const updateAutomaticEarnedPoints = (studentId, activity) => {
  if (manualEarnedPoints[studentId]?.[activity.id]) return;
  if (!draftEarnedPoints[studentId]) draftEarnedPoints[studentId] = {};
  const points = calculateEarnedPoints(draftScores[studentId]?.[activity.id] || '', activity);
  draftEarnedPoints[studentId][activity.id] = points;
  const input = studentsBody.querySelector(
    `.earned-points-input[data-student-id="${studentId}"][data-activity-id="${activity.id}"]`,
  );
  if (input) {
    input.value = points;
    input.max = String(getActivityMaximumPoints(activity));
  }
};

const recalculateAutomaticEarnedPoints = () => {
  students.forEach((student) => {
    activities.forEach((activity) => updateAutomaticEarnedPoints(String(student.id), activity));
  });
};

const updateActivityMaximumPoints = (item, activity) => {
  const points = item.querySelector('.assessment-points');
  if (points) points.textContent = `Aporta hasta ${formatPoints(getActivityMaximumPoints(activity))} de 20 puntos`;
};

const updateAssessmentTotal = () => {
  const total = activities.reduce((sum, activity) => sum + (Number(activity.weight) || 0), 0);
  assessmentTotal.textContent = `Ponderación total: ${Number(total.toFixed(2))}% (máximo 100%).`;
  assessmentTotal.classList.toggle('error', total > 100);
};

const updateTableHeaders = () => {
  const row = studentsHead.rows[0];
  while (row.cells.length > 2) row.deleteCell(row.cells.length - 1);
  if (periodSelect.value === 'Final') {
    LAPSO_PERIODS.forEach((period) => {
      const heading = document.createElement('th');
      heading.scope = 'col';
      heading.className = 'assessment-column';
      heading.textContent = `Nota redondeada (${PERIOD_LABELS[period]})`;
      row.appendChild(heading);
    });
    const definitiveHeading = document.createElement('th');
    definitiveHeading.id = 'gradeHeading';
    definitiveHeading.scope = 'col';
    definitiveHeading.textContent = 'Definitiva de la materia';
    row.appendChild(definitiveHeading);
    return;
  }
  activities.forEach((activity) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.className = 'assessment-column';
    heading.dataset.activityId = activity.id;
    const name = document.createElement('span');
    name.textContent = `${activity.name || 'Actividad sin nombre'} (nota /20)`;
    heading.appendChild(name);
    row.appendChild(heading);

    const weightHeading = document.createElement('th');
    weightHeading.scope = 'col';
    weightHeading.className = 'assessment-weight-column';
    weightHeading.dataset.activityId = activity.id;
    weightHeading.textContent = `${Number(activity.weight) || 0}% = ${formatPoints(getActivityMaximumPoints(activity))} pts`;
    row.appendChild(weightHeading);
  });
  const gradeHeading = document.createElement('th');
  gradeHeading.id = 'gradeHeading';
  gradeHeading.scope = 'col';
  gradeHeading.textContent = `Nota exacta y redondeada (${PERIOD_LABELS[periodSelect.value]})`;
  row.appendChild(gradeHeading);
};

const updateCalculatedGrades = () => {
  studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
    const cell = row.querySelector('.calculated-grade');
    if (periodSelect.value === 'Final') {
      const student = students.find((entry) => String(entry.id) === row.dataset.studentId);
      const definitiveGrade = student ? getDefinitiveGrade(student) : null;
      renderGradePair(cell, definitiveGrade?.exactGrade ?? null, definitiveGrade?.roundedGrade ?? null);
    } else {
      renderFinalGrade(cell, row.dataset.studentId);
    }
  });
  updateGradeSummary();
};

const updateGradeSummary = () => {
  const summary = { students: students.length, passed: 0, failed: 0, pending: 0 };
  students.forEach((student) => {
    const grade = periodSelect.value === 'Final'
      ? getDefinitiveGrade(student)?.roundedGrade ?? null
      : getWeightedGrade(String(student.id));
    if (grade === null) summary.pending += 1;
    else if (grade >= 10) summary.passed += 1;
    else summary.failed += 1;
  });
  document.getElementById('gradeSummaryStudents').textContent = String(summary.students);
  document.getElementById('gradeSummaryPassed').textContent = String(summary.passed);
  document.getElementById('gradeSummaryFailed').textContent = String(summary.failed);
  document.getElementById('gradeSummaryPending').textContent = String(summary.pending);
};

const renderActivityEditor = () => {
  activityList.replaceChildren();
  activities.forEach((activity) => {
    const item = document.createElement('div');
    item.className = 'assessment-item';
    item.dataset.activityId = activity.id;

    if (!canManageActivities()) {
      item.classList.add('read-only');
      const fields = document.createElement('div');
      fields.className = 'assessment-fields';
      const nameField = document.createElement('div');
      nameField.className = 'assessment-field';
      const nameLabel = document.createElement('span');
      nameLabel.className = 'assessment-field-label';
      nameLabel.textContent = 'Actividad';
      const name = document.createElement('strong');
      name.textContent = activity.name || 'Actividad sin nombre';
      nameField.append(nameLabel, name);
      const weightField = document.createElement('div');
      weightField.className = 'assessment-field';
      const weightLabel = document.createElement('span');
      weightLabel.className = 'assessment-field-label';
      weightLabel.textContent = 'Porcentaje';
      const weight = document.createElement('span');
      weight.textContent = `${Number(activity.weight) || 0}%`;
      const points = document.createElement('span');
      points.className = 'assessment-points';
      points.textContent = `Aporta hasta ${getActivityMaximumPoints(activity)} de 20 puntos`;
      weightField.append(weightLabel, weight, points);
      fields.append(nameField, weightField);
      item.append(fields);
      activityList.appendChild(item);
      return;
    }

    const fields = document.createElement('div');
    fields.className = 'assessment-fields';
    const nameLabel = document.createElement('label');
    nameLabel.className = 'assessment-field';
    nameLabel.textContent = 'Nombre de la actividad';
    const nameInput = document.createElement('input');
    nameInput.className = 'activity-name-input';
    nameInput.type = 'text';
    nameInput.maxLength = 120;
    nameInput.required = true;
    nameInput.value = activity.name;
    nameInput.setAttribute('aria-label', 'Nombre de la actividad');
    nameLabel.appendChild(nameInput);

    const weightLabel = document.createElement('label');
    weightLabel.className = 'assessment-field';
    weightLabel.textContent = 'Porcentaje de evaluación';
    const weightInput = document.createElement('input');
    weightInput.className = 'activity-weight-input';
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.max = '100';
    weightInput.step = '0';
    weightInput.required = true;
    weightInput.value = String(activity.weight);
    weightInput.setAttribute('aria-label', `Porcentaje para ${activity.name || 'actividad'}`);
    weightLabel.appendChild(weightInput);
    const points = document.createElement('span');
    points.className = 'assessment-points';
    points.textContent = `Aporta hasta ${getActivityMaximumPoints(activity)} de 20 puntos`;
    weightLabel.appendChild(points);
    fields.append(nameLabel, weightLabel);

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-activity-button';
    removeButton.type = 'button';
    removeButton.textContent = 'Quitar';
    removeButton.disabled = activities.length === 1;
    removeButton.setAttribute('aria-label', `Quitar ${activity.name || 'actividad'}`);
    item.append(fields, removeButton);
    activityList.appendChild(item);
  });
  updateAssessmentTotal();
  updateTableHeaders();
  updateCalculatedGrades();
};

const loadGradeContext = () => {
  const subject = currentSubject();
  const period = periodSelect.value;
  const subjectGrades = (student) => student.grades?.[subject?.id] || {};
  const configured = students
    .map((student) => subjectGrades(student).assessments?.[period])
    .find((entries) => Array.isArray(entries) && entries.length);

  if (configured) {
    activities = configured.map((entry) => ({
      id: String(entry.id || createActivityId()),
      name: String(entry.name || ''),
      weight: Number(entry.weight) || 0,
    }));
    const totalWeight = activities.reduce((total, activity) => total + activity.weight, 0);
    if (canManageActivities() && Math.abs(totalWeight - 100) > 0) distributeActivityWeights();
  } else {
    const legacyName = students
      .map((student) => subjectGrades(student).activityNames?.[period])
      .find((name) => typeof name === 'string' && name.trim());
    activities = [{ id: 'activity-1', name: legacyName || 'Actividad 1', weight: 100 }];
  }

  draftScores = {};
  draftEarnedPoints = {};
  manualEarnedPoints = {};
  students.forEach((student) => {
    const studentId = String(student.id);
    const grades = subjectGrades(student);
    const persistedActivities = grades.assessments?.[period];
    draftScores[studentId] = {};
    draftEarnedPoints[studentId] = {};
    manualEarnedPoints[studentId] = {};
    activities.forEach((activity, index) => {
      const persistedActivity = Array.isArray(persistedActivities)
        ? persistedActivities.find((entry) => String(entry.id) === activity.id)
        : null;
      if (persistedActivity && Object.prototype.hasOwnProperty.call(persistedActivity, 'score')) {
        draftScores[studentId][activity.id] = persistedActivity.score === null ? '' : String(persistedActivity.score);
      } else if (!persistedActivities?.length && index === 0) {
        const legacyValue = Object.prototype.hasOwnProperty.call(grades, period)
          ? grades[period]
          : getSheetGrade(student.sheetRecord, subject?.id, period);
        draftScores[studentId][activity.id] = legacyValue === null ? '' : String(legacyValue || '').replace(',', '.');
      } else {
        draftScores[studentId][activity.id] = '';
      }
      const savedEntry = Array.isArray(persistedActivities)
        ? persistedActivities.find((entry) => String(entry.id) === activity.id)
        : null;
      draftEarnedPoints[studentId][activity.id] = savedEntry?.earnedPoints !== null && savedEntry?.earnedPoints !== undefined
        ? String(savedEntry.earnedPoints)
        : calculateEarnedPoints(draftScores[studentId][activity.id], activity);
      manualEarnedPoints[studentId][activity.id] = savedEntry?.earnedPointsManual === true;
    });
  });

  originalActivities = copyJson(activities);
  originalScores = copyJson(draftScores);
  originalEarnedPoints = copyJson(draftEarnedPoints);
  originalManualEarnedPoints = copyJson(manualEarnedPoints);
  renderActivityEditor();
  renderStudents();
};

const hasUnsavedChanges = () => {
  captureDraftScores();
  captureDraftEarnedPoints();
  return JSON.stringify(activities) !== JSON.stringify(originalActivities)
    || JSON.stringify(draftScores) !== JSON.stringify(originalScores)
    || JSON.stringify(draftEarnedPoints) !== JSON.stringify(originalEarnedPoints)
    || JSON.stringify(manualEarnedPoints) !== JSON.stringify(originalManualEarnedPoints);
};

const confirmDiscardChanges = () => !hasUnsavedChanges()
  || window.confirm('Hay actividades o notas sin guardar. ¿Descartar esos cambios?');

const renderStudents = () => {
  const subject = currentSubject();
  const period = periodSelect.value;
  document.getElementById('listTitle').textContent = subject
    ? `Año ${yearSelect.value} · ${subject.label} · ${PERIOD_LABELS[period]}`
    : 'Lista de estudiantes';
  updateTableHeaders();
  studentsBody.replaceChildren();

  if (!students.length) {
    const row = studentsBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = period === 'Final' ? LAPSO_PERIODS.length + 3 : activities.length * 2 + 3;
    cell.className = 'empty';
    cell.textContent = 'No hay estudiantes registrados en este año.';
  } else {
    students.forEach((student, index) => {
      const row = studentsBody.insertRow();
      const studentId = String(student.id);
      row.dataset.studentId = studentId;
      const numberCell = row.insertCell();
      numberCell.dataset.label = 'N.º de lista';
      numberCell.textContent = String(index + 1);
      const nameCell = row.insertCell();
      nameCell.className = 'student-name';
      nameCell.dataset.label = 'Nombre del estudiante';
      nameCell.textContent = student.name || 'Estudiante sin nombre';
      if (period === 'Final') {
        LAPSO_PERIODS.forEach((lapso) => {
          const lapsoCell = row.insertCell();
          lapsoCell.className = 'lapso-grade';
          lapsoCell.dataset.label = `Nota redondeada (${PERIOD_LABELS[lapso]})`;
          const grade = getLapsoGrade(student, lapso);
          lapsoCell.textContent = grade === null ? '-' : formatFinalGrade(grade);
        });
      } else activities.forEach((activity) => {
        const gradeCell = row.insertCell();
        gradeCell.dataset.label = `${activity.name || 'Actividad'} (nota /20)`;
        const input = document.createElement('input');
        input.className = 'grade-input';
        input.type = 'number';
        input.min = '1';
        input.max = '20';
        input.step = '0.01';
        input.inputMode = 'decimal';
        input.dataset.studentId = studentId;
        input.dataset.activityId = activity.id;
        input.value = draftScores[studentId]?.[activity.id] || '';
        input.setAttribute('aria-label', `Nota de ${student.name || 'estudiante'} en ${activity.name || 'actividad'}`);
        gradeCell.appendChild(input);

        const weightCell = row.insertCell();
        weightCell.className = 'assessment-weight-value';
        weightCell.dataset.activityWeightId = activity.id;
        weightCell.dataset.label = `Puntos obtenidos (máx. ${formatPoints(getActivityMaximumPoints(activity))})`;
        const pointsInput = document.createElement('input');
        pointsInput.className = 'earned-points-input';
        pointsInput.type = 'number';
        pointsInput.min = '0';
        pointsInput.max = String(getActivityMaximumPoints(activity));
        pointsInput.step = '0.01';
        pointsInput.inputMode = 'decimal';
        pointsInput.dataset.studentId = studentId;
        pointsInput.dataset.activityId = activity.id;
        pointsInput.value = draftEarnedPoints[studentId]?.[activity.id] || '';
        pointsInput.setAttribute(
          'aria-label',
          `Puntos obtenidos de ${formatPoints(getActivityMaximumPoints(activity))} posibles para ${student.name || 'estudiante'} en ${activity.name || 'actividad'}`,
        );
        weightCell.appendChild(pointsInput);
      });
      const calculatedCell = row.insertCell();
      calculatedCell.className = 'calculated-grade';
      if (period === 'Final') {
        calculatedCell.dataset.label = 'Definitiva de la materia';
        const definitiveGrade = getDefinitiveGrade(student);
        renderGradePair(
          calculatedCell,
          definitiveGrade?.exactGrade ?? null,
          definitiveGrade?.roundedGrade ?? null,
        );
      } else {
        calculatedCell.dataset.label = `Nota ponderada (${PERIOD_LABELS[period]})`;
        renderFinalGrade(calculatedCell, studentId);
      }
    });
  }

  studentCount.textContent = `${students.length} estudiante${students.length === 1 ? '' : 's'}`;
  filterStudents();
  updateCalculatedGrades();
};

const updatePeriodView = () => {
  const isFinal = periodSelect.value === 'Final';
  document.querySelector('.assessment-editor').hidden = isFinal;
  saveButton.closest('.actions').hidden = isFinal;
  addActivityButton.hidden = isFinal || !canManageActivities();
  document.getElementById('periodInstructions').textContent = isFinal
    ? 'En el período Final se muestran las notas redondeadas de cada lapso. La definitiva de la materia es el promedio de las tres notas y se redondea al entero más cercano. Se calcula cuando están registradas las notas de los tres lapsos.'
    : 'Selecciona el curso, la materia y el período. En cada actividad registra la nota de 1 a 20 y, en el cuadro blanco contiguo, el aporte en puntos (hasta el máximo indicado por su porcentaje). La nota del lapso suma esos aportes sobre 20.';
};

const loadStudents = async () => {
  studentsBody.innerHTML = '<tr><td class="empty" colspan="4">Cargando estudiantes...</td></tr>';
  studentCount.textContent = 'Cargando estudiantes...';
  setStatus('');

  const year = yearSelect.value;
  const response = await fetch(`${API_STUDENTS}?year=${encodeURIComponent(year)}&t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const responseData = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(responseData.error || `No se pudieron cargar los estudiantes (${response.status}).`);
  }
  if (!Array.isArray(responseData)) throw new Error('El servidor devolvió una lista de estudiantes inválida.');

  let sheetRows = [];
  let sheetWarning = '';
  try {
    sheetRows = await loadSheetRows();
  } catch (error) {
    console.error('No se pudieron leer las notas existentes desde la hoja:', error);
    sheetWarning = 'No se pudieron leer las notas actuales de Excel; se muestran las notas guardadas en el sistema.';
  }

  students = responseData.map((student) => ({
    ...student,
    grades: student.grades && typeof student.grades === 'object' ? student.grades : {},
    sheetRecord: matchSheetRecord(student, sheetRows),
  }));
  loadGradeContext();
  if (sheetWarning) setStatus(sheetWarning, 'error');
};

const filterStudents = () => {
  const search = normalizeText(studentSearch.value);
  let visibleCount = 0;
  studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
    const visible = normalizeText(row.querySelector('.student-name')?.textContent).includes(search);
    row.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  if (students.length && !visibleCount) {
    studentCount.textContent = 'No hay estudiantes que coincidan con la búsqueda.';
  } else if (students.length) {
    studentCount.textContent = `${visibleCount} de ${students.length} estudiante${students.length === 1 ? '' : 's'}`;
  }
};

const saveGrades = async () => {
  const subject = currentSubject();
  if (!subject) {
    setStatus('Selecciona una materia válida.', 'error');
    return;
  }

  captureDraftScores();
  captureDraftEarnedPoints();
  if (canManageActivities() && (!activities.length || activities.some((activity) => !activity.name.trim()))) {
    setStatus('Escribe un nombre para cada actividad.', 'error');
    return;
  }

  const weights = activities.map((activity) => Number(activity.weight));
  const totalWeight = weights.reduce((total, weight) => total + (Number.isFinite(weight) ? weight : 0), 0);
  if (canManageActivities()
    && (weights.some((weight) => !Number.isFinite(weight) || weight <= 0 || weight > 100) || totalWeight > 100)) {
    setStatus('Cada porcentaje debe ser mayor que 0 y la suma de las actividades no puede superar 100%.', 'error');
    return;
  }

  const invalidScore = Object.entries(draftScores).some(([studentId, scores]) => activities.some((activity) => {
    const score = scores[activity.id];
    if (score === '') return false;
    const parsedScore = Number(score);
    if (Number.isFinite(parsedScore) && parsedScore >= 1 && parsedScore <= 20) return false;
    const input = Array.from(studentsBody.querySelectorAll('.grade-input')).find((item) => (
      item.dataset.studentId === studentId && item.dataset.activityId === activity.id
    ));
    input?.focus();
    setStatus('Cada nota debe estar entre 1 y 20. Deja el campo vacío si quieres quitar una nota.', 'error');
    return true;
  }));
  if (invalidScore) return;

  const invalidEarnedPoints = Object.entries(draftEarnedPoints).some(([studentId, points]) => activities.some((activity) => {
    const earnedPoints = points[activity.id];
    if (earnedPoints === '') return false;
    const parsedPoints = Number(earnedPoints);
    if (Number.isFinite(parsedPoints) && parsedPoints >= 0 && parsedPoints <= getActivityMaximumPoints(activity)) return false;
    const input = Array.from(studentsBody.querySelectorAll('.earned-points-input')).find((item) => (
      item.dataset.studentId === studentId && item.dataset.activityId === activity.id
    ));
    input?.focus();
    setStatus(`Los puntos obtenidos deben estar entre 0 y ${formatPoints(getActivityMaximumPoints(activity))} para cada actividad.`, 'error');
    return true;
  }));
  if (invalidEarnedPoints) return;

  if (!students.length) {
    setStatus('No hay estudiantes donde guardar estas actividades.', 'error');
    return;
  }

  saveButton.disabled = true;
  addActivityButton.disabled = true;
  activityList.querySelectorAll('input, button').forEach((control) => {
    control.disabled = true;
  });
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    input.disabled = true;
  });
  studentsBody.querySelectorAll('.earned-points-input').forEach((input) => {
    input.disabled = true;
  });
  setStatus('Guardando actividades y notas...');
  let savedCount = 0;
  const errors = [];
  for (const student of students) {
    const grades = copyJson(student.grades || {});
    const subjectGrades = { ...(grades[subject.id] || {}) };
    const savedAssessments = { ...(subjectGrades.assessments || {}) };
    const existingAssessments = Array.isArray(savedAssessments[periodSelect.value])
      ? savedAssessments[periodSelect.value]
      : [];
    const assessmentEntries = activities.map((activity) => ({
      ...(existingAssessments.find((entry) => String(entry.id) === activity.id) || {}),
      id: activity.id,
      name: canManageActivities()
        ? activity.name.trim()
        : existingAssessments.find((entry) => String(entry.id) === activity.id)?.name ?? activity.name,
      weight: canManageActivities()
        ? Number(activity.weight)
        : existingAssessments.find((entry) => String(entry.id) === activity.id)?.weight ?? activity.weight,
      score: draftScores[String(student.id)]?.[activity.id] === ''
        ? null
        : Number(draftScores[String(student.id)]?.[activity.id]),
      earnedPoints: draftEarnedPoints[String(student.id)]?.[activity.id] === ''
        ? null
        : Number(draftEarnedPoints[String(student.id)]?.[activity.id]),
      earnedPointsManual: manualEarnedPoints[String(student.id)]?.[activity.id] === true,
    }));
    savedAssessments[periodSelect.value] = assessmentEntries;
    subjectGrades.assessments = savedAssessments;
    subjectGrades[periodSelect.value] = getWeightedGrade(String(student.id));
    grades[subject.id] = subjectGrades;
    try {
      const response = await fetch(API_STUDENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, grades }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
      student.grades = result.grades || grades;
      savedCount += 1;
    } catch (error) {
      console.error(`No se pudieron guardar las notas de ${student.name}:`, error);
      errors.push({
        student: student.name || String(student.id),
        message: error.message || 'Error desconocido al guardar.',
      });
    }
  }

  saveButton.disabled = false;
  addActivityButton.disabled = false;
  activityList.querySelectorAll('input, button').forEach((control) => {
    control.disabled = false;
  });
  if (canManageActivities() && activities.length === 1) {
    activityList.querySelector('.remove-activity-button').disabled = true;
  }
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    input.disabled = false;
  });
  studentsBody.querySelectorAll('.earned-points-input').forEach((input) => {
    input.disabled = false;
  });
  if (errors.length) {
    const missingGradesColumn = errors.some(({ message }) => /columna\s+grades|grades.*(schema cache|column)|column.*grades/i.test(message));
    const failedStudents = errors.map(({ student }) => student).join(', ');
    const details = missingGradesColumn
      ? ' Supabase no tiene la columna grades. Ejecuta supabase-grades.sql en el editor SQL de Supabase y vuelve a intentarlo.'
      : ` Detalle: ${errors[0].message}`;
    setStatus(`Falló el guardado para: ${failedStudents}.${details}`, 'error');
  } else {
    originalActivities = copyJson(activities);
    originalScores = copyJson(draftScores);
    originalEarnedPoints = copyJson(draftEarnedPoints);
    originalManualEarnedPoints = copyJson(manualEarnedPoints);
    setStatus(`Actividades y notas guardadas. Nota ponderada actualizada para ${savedCount} estudiante(s).`, 'success');
  }
};

const initialize = async () => {
  try {
    currentUser = JSON.parse(sessionStorage.getItem('activeUser') || 'null');
  } catch (error) {
    console.error('No se pudo leer la sesión del profesor:', error);
    window.location.replace('index.html');
    return;
  }

  if (!currentUser?.name || currentUser.soloAdmin || currentUser.soloReportes) {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('teacherName').textContent = currentUser.name;
  addActivityButton.hidden = !canManageActivities();
  const years = getAllowedYears();
  if (!years.length) {
    setStatus('Tu perfil no tiene años escolares asignados.', 'error');
    return;
  }

  years.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  });

  const updateSubjects = () => {
    const subjects = getSubjectsForYear(yearSelect.value);
    subjectSelect.replaceChildren();
    subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = subject.label;
      subjectSelect.appendChild(option);
    });
    if (!subjects.length) {
      subjectSelect.disabled = true;
      return false;
    }
    subjectSelect.disabled = false;
    return true;
  };

  if (!updateSubjects()) {
    setStatus('Tu perfil no tiene materias asignadas para este año.', 'error');
    return;
  }
  previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
  document.getElementById('teacherName').textContent = currentUser.name;
  updatePeriodView();

  yearSelect.addEventListener('change', async () => {
    if (!confirmDiscardChanges()) {
      yearSelect.value = previousFilters.year;
      return;
    }
    if (!updateSubjects()) {
      setStatus('Tu perfil no tiene materias asignadas para este año.', 'error');
      return;
    }
    previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
    updatePeriodView();
    try {
      await loadStudents();
    } catch (error) {
      console.error('No se pudieron cargar estudiantes:', error);
      setStatus(error.message, 'error');
    }
  });

  const updateSelectedFilters = () => {
    if (!confirmDiscardChanges()) {
      subjectSelect.value = previousFilters.subject;
      periodSelect.value = previousFilters.period;
      return;
    }
    previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
    updatePeriodView();
    loadGradeContext();
  };
  subjectSelect.addEventListener('change', updateSelectedFilters);
  periodSelect.addEventListener('change', updateSelectedFilters);
  studentSearch.addEventListener('input', filterStudents);
  activityList.addEventListener('input', (event) => {
    if (!canManageActivities()) return;
    const item = event.target.closest('.assessment-item');
    if (!item) return;
    const activity = activities.find((entry) => entry.id === item.dataset.activityId);
    if (!activity) return;
    if (event.target.matches('.activity-name-input')) activity.name = event.target.value;
    if (event.target.matches('.activity-weight-input')) {
      activity.weight = event.target.value === '' ? '' : Number(event.target.value);
      updateActivityMaximumPoints(item, activity);
      students.forEach((student) => updateAutomaticEarnedPoints(String(student.id), activity));
    }
    updateAssessmentTotal();
    updateTableHeaders();
    updateCalculatedGrades();
    studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
      const scoreCell = row.querySelector(`.grade-input[data-activity-id="${activity.id}"]`)?.parentElement;
      if (scoreCell) scoreCell.dataset.label = `${activity.name || 'Actividad'} (nota /20)`;
      const pointsInput = row.querySelector(`.earned-points-input[data-activity-id="${activity.id}"]`);
      if (pointsInput) {
        pointsInput.max = String(getActivityMaximumPoints(activity));
        const label = `Puntos obtenidos (máx. ${formatPoints(getActivityMaximumPoints(activity))})`;
        pointsInput.parentElement.dataset.label = label;
        pointsInput.setAttribute('aria-label', `${label} para ${row.querySelector('.student-name').textContent} en ${activity.name || 'actividad'}`);
      }
    });
  });
  activityList.addEventListener('click', (event) => {
    if (!canManageActivities()) return;
    const button = event.target.closest('.remove-activity-button');
    if (!button) return;
    if (!window.confirm('¿Quitar esta actividad y las notas registradas para ella?')) return;
    captureDraftScores();
    captureDraftEarnedPoints();
    const item = button.closest('.assessment-item');
    const activityId = item?.dataset.activityId;
    activities = activities.filter((activity) => activity.id !== activityId);
    distributeActivityWeights();
    Object.values(draftScores).forEach((scores) => delete scores[activityId]);
    Object.values(draftEarnedPoints).forEach((points) => delete points[activityId]);
    Object.values(manualEarnedPoints).forEach((points) => delete points[activityId]);
    recalculateAutomaticEarnedPoints();
    renderActivityEditor();
    renderStudents();
  });
  addActivityButton.addEventListener('click', () => {
    if (!canManageActivities()) return;
    captureDraftScores();
    captureDraftEarnedPoints();
    const activity = { id: createActivityId(), name: `Actividad ${activities.length + 1}`, weight: 25 };
    activities.push(activity);
    distributeActivityWeights();
    recalculateAutomaticEarnedPoints();
    students.forEach((student) => {
      const studentId = String(student.id);
      if (!draftScores[studentId]) draftScores[studentId] = {};
      draftScores[studentId][activity.id] = '';
      if (!draftEarnedPoints[studentId]) draftEarnedPoints[studentId] = {};
      draftEarnedPoints[studentId][activity.id] = '';
      if (!manualEarnedPoints[studentId]) manualEarnedPoints[studentId] = {};
      manualEarnedPoints[studentId][activity.id] = false;
    });
    renderActivityEditor();
    renderStudents();
    activityList.querySelector(`[data-activity-id="${activity.id}"] .activity-name-input`).focus();
  });
  studentsBody.addEventListener('input', (event) => {
    if (event.target.matches('.earned-points-input')) {
      const { studentId, activityId } = event.target.dataset;
      if (!draftEarnedPoints[studentId]) draftEarnedPoints[studentId] = {};
      if (!manualEarnedPoints[studentId]) manualEarnedPoints[studentId] = {};
      draftEarnedPoints[studentId][activityId] = event.target.value;
      manualEarnedPoints[studentId][activityId] = true;
      updateCalculatedGrades();
      return;
    }
    if (!event.target.matches('.grade-input')) return;
    const { studentId, activityId } = event.target.dataset;
    if (!draftScores[studentId]) draftScores[studentId] = {};
    draftScores[studentId][activityId] = event.target.value;
    const activity = activities.find((entry) => entry.id === activityId);
    if (activity) updateAutomaticEarnedPoints(studentId, activity);
    updateCalculatedGrades();
  });
  saveButton.addEventListener('click', saveGrades);

  try {
    await loadStudents();
  } catch (error) {
    console.error('No se pudieron cargar estudiantes:', error);
    students = [];
    loadGradeContext();
    setStatus(error.message || 'No se pudieron  cargar los estudiantes.', 'error');
  }
};

initialize();
