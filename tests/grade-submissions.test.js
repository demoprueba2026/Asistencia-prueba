const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareGradePatch } = require('../lib/grade-submissions');

const gradesWithAssessment = (score, periodGrade = score) => ({
  matematica: {
    '1er': periodGrade,
    assessments: {
      '1er': [
        { id: 'actividad-1', score, earnedPoints: score / 4, earnedPointsManual: false },
      ],
    },
  },
});

test('marks assessment entries submitted when a grade is saved', () => {
  const result = prepareGradePatch({}, gradesWithAssessment(16), false);
  assert.equal(result.error, undefined);
  assert.equal(result.grades.matematica.assessments['1er'][0].submitted, true);
});

test('rejects a teacher changing a saved grade', () => {
  const previous = prepareGradePatch({}, gradesWithAssessment(16), false).grades;
  const result = prepareGradePatch(previous, gradesWithAssessment(18), false);
  assert.match(result.error, /solo un administrador/);
});

test('allows an administrator to change a saved grade', () => {
  const previous = prepareGradePatch({}, gradesWithAssessment(16), false).grades;
  const result = prepareGradePatch(previous, gradesWithAssessment(18), true);
  assert.equal(result.error, undefined);
  assert.equal(result.grades.matematica['1er'], 18);
});

test('allows teachers to save a different lapso and leaves empty grades unlocked', () => {
  const previous = prepareGradePatch({}, gradesWithAssessment(16), false).grades;
  const updated = {
    ...previous,
    matematica: {
      ...previous.matematica,
      '2do': 12,
      assessments: {
        ...previous.matematica.assessments,
        '2do': [{ id: 'actividad-1', score: 12, earnedPoints: 3 }],
      },
    },
  };
  const result = prepareGradePatch(previous, updated, false);
  const emptyGrades = gradesWithAssessment(null, null);
  emptyGrades.matematica.assessments['1er'][0].earnedPoints = null;
  const empty = prepareGradePatch({}, emptyGrades, false);
  assert.equal(result.error, undefined);
  assert.equal(result.grades.matematica.assessments['2do'][0].submitted, true);
  assert.equal(empty.grades.matematica.assessments['1er'][0].submitted, undefined);
});

test('prevents teachers from clearing saved grades', () => {
  const previous = prepareGradePatch({}, gradesWithAssessment(16), false).grades;
  const result = prepareGradePatch(previous, {}, false);
  assert.match(result.error, /solo un administrador/);
});

test('protects grades saved before submission markers existed', () => {
  const previous = { matematica: { '1er': 16 } };
  const updated = { matematica: { '1er': 18 } };
  const result = prepareGradePatch(previous, updated, false);
  assert.match(result.error, /solo un administrador/);
});
