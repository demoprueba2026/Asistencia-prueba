const hasGradeValue = (value) => value !== null && value !== undefined && value !== '';

const hasAssessmentGrade = (entry) => (
  hasGradeValue(entry?.score) || hasGradeValue(entry?.earnedPoints)
);

const isPeriodSubmitted = (subjectGrades, period) => (
  hasGradeValue(subjectGrades?.[period])
  || (Array.isArray(subjectGrades?.assessments?.[period])
    && subjectGrades.assessments[period].some((entry) => entry?.submitted === true || hasAssessmentGrade(entry)))
);

const normalizeGradeValue = (value) => {
  if (!hasGradeValue(value)) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

const sameAssessmentGrades = (existing, incoming) => {
  if (!Array.isArray(existing) || !Array.isArray(incoming) || existing.length !== incoming.length) return false;
  const incomingById = new Map(incoming.map((entry) => [String(entry.id), entry]));
  return existing.every((entry) => {
    const updated = incomingById.get(String(entry.id));
    return updated
      && ['score', 'earnedPoints', 'earnedPointsManual'].every((key) => (
        normalizeGradeValue(entry[key]) === normalizeGradeValue(updated[key])
      ));
  });
};

const prepareGradePatch = (existingGrades, incomingGrades, isAdmin) => {
  const grades = JSON.parse(JSON.stringify(incomingGrades || {}));
  const previous = existingGrades && typeof existingGrades === 'object' ? existingGrades : {};

  const subjectIds = new Set([...Object.keys(grades), ...Object.keys(previous)]);
  for (const subjectId of subjectIds) {
    const subjectGrades = grades[subjectId];
    const previousSubject = previous[subjectId] || {};
    if (!subjectGrades || typeof subjectGrades !== 'object') {
      const hadSubmittedGrades = Object.keys(previousSubject.assessments || {}).some(
        (period) => isPeriodSubmitted(previousSubject, period),
      ) || ['1er', '2do', '3er'].some((period) => isPeriodSubmitted(previousSubject, period));
      if (!isAdmin && hadSubmittedGrades) {
        return {
          error: 'Las notas de este estudiante ya fueron guardadas y solo un administrador puede modificarlas.',
        };
      }
      continue;
    }
    const assessments = subjectGrades.assessments && typeof subjectGrades.assessments === 'object'
      ? subjectGrades.assessments
      : {};
    const previousAssessments = previousSubject.assessments || {};
    const periods = new Set([
      ...Object.keys(assessments),
      ...Object.keys(previousAssessments),
      ...['1er', '2do', '3er'].filter((period) => (
        Object.prototype.hasOwnProperty.call(previousSubject, period)
        || Object.prototype.hasOwnProperty.call(subjectGrades, period)
      )),
    ]);

    for (const period of periods) {
      const entries = assessments[period];
      const oldEntries = previousAssessments[period];
      const wasSubmitted = isPeriodSubmitted(previousSubject, period);
      if (wasSubmitted && !isAdmin) {
        const changedAssessments = Array.isArray(oldEntries)
          ? !sameAssessmentGrades(oldEntries, entries)
          : normalizeGradeValue(previousSubject[period]) !== normalizeGradeValue(subjectGrades[period]);
        if (changedAssessments
          || normalizeGradeValue(previousSubject[period]) !== normalizeGradeValue(subjectGrades[period])) {
          return {
            error: 'Las notas de este estudiante ya fueron guardadas y solo un administrador puede modificarlas.',
          };
        }
      }

      if (!Array.isArray(entries)) continue;
      const isSubmitted = wasSubmitted || hasGradeValue(subjectGrades[period])
        || entries.some(hasAssessmentGrade);
      if (isSubmitted) {
        assessments[period] = entries.map((entry) => ({ ...entry, submitted: true }));
      }
    }

    if (subjectGrades.assessments && typeof subjectGrades.assessments === 'object') {
      subjectGrades.assessments = assessments;
    }
  }

  return { grades };
};

module.exports = {
  isPeriodSubmitted,
  prepareGradePatch,
};
