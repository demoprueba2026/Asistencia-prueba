(() => {
  const subjectsByYear = {
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

  const reportSubjectIdsByYear = {
    1: ['castellano', 'ingles', 'matematicas', 'educacion-fisica', 'arte-patrimonio', 'ciencias-naturales', 'ghc', 'orientacion-convivencia'],
    2: ['castellano', 'ingles', 'matematicas', 'educacion-fisica', 'arte-patrimonio', 'ciencias-naturales', 'ghc', 'orientacion-convivencia'],
    3: ['castellano', 'ingles', 'matematica', 'educacion-fisica', 'fisica', 'quimica', 'biologia', 'ghc', 'orientacion-convivencia', 'frances'],
    4: ['castellano', 'ingles', 'matematica', 'educacion-fisica', 'fisica', 'quimica', 'biologia', 'ghc', 'formacion-soberania', 'orientacion-convivencia', 'frances'],
    5: ['castellano', 'ingles', 'matematica', 'educacion-fisica', 'fisica', 'quimica', 'biologia', 'ciencias-tierra', 'ghc', 'frances', 'formacion-soberania', 'orientacion-convivencia'],
  };
  const participationSubjectIdsByYear = {
    1: ['crp', 'frances'],
    2: ['crp', 'frances'],
    3: ['crp'],
    4: [],
    5: ['crp'],
  };
  const reportSubjectDisplay = {
    castellano: { label: 'CASTELLANO', code: 'CA' },
    ingles: { label: 'INGLÉS Y OTRAS LENGUAS EXTRANJERAS', code: 'LE' },
    matematicas: { label: 'MATEMÁTICAS', code: 'MA' },
    matematica: { label: 'MATEMÁTICAS', code: 'MA' },
    'educacion-fisica': { label: 'EDUCACIÓN FÍSICA', code: 'EF' },
    'arte-patrimonio': { label: 'ARTE Y PATRIMONIO', code: 'AyP' },
    'ciencias-naturales': { label: 'CIENCIAS NATURALES', code: 'CN' },
    fisica: { label: 'FÍSICA', code: 'FI' },
    quimica: { label: 'QUÍMICA', code: 'QU' },
    biologia: { label: 'BIOLOGÍA', code: 'BI' },
    'ciencias-tierra': { label: 'CIENCIAS DE LA TIERRA', code: 'CT' },
    ghc: { label: 'GEOGRAFÍA, HISTORIA Y CIUDADANÍA', code: 'GHC' },
    'formacion-soberania': { label: 'FORMACIÓN PARA LA SOBERANÍA', code: 'FS' },
    'orientacion-convivencia': { label: 'ORIENTACIÓN Y CONVIVENCIA', code: 'OyC' },
    frances: { label: 'FRANCÉS', code: 'FRA' },
    crp: { label: 'CRP', code: 'CRP' },
  };

  window.GRADE_SUBJECTS_BY_YEAR = subjectsByYear;
  window.REPORT_SUBJECT_IDS_BY_YEAR = reportSubjectIdsByYear;
  window.REPORT_PARTICIPATION_IDS_BY_YEAR = participationSubjectIdsByYear;
  window.REPORT_SUBJECT_DISPLAY = reportSubjectDisplay;
  window.convertCRPGrade = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const grade = Number(value);
    if (!Number.isFinite(grade)) return '-';
    const roundedGrade = Math.round(grade);
    if (roundedGrade >= 19 && roundedGrade <= 20) return 'A';
    if (roundedGrade >= 16 && roundedGrade <= 18) return 'B';
    if (roundedGrade >= 12 && roundedGrade <= 15) return 'C';
    if (roundedGrade >= 10 && roundedGrade <= 11) return 'D';
    if (roundedGrade >= 1 && roundedGrade <= 9) return 'E';
    return '-';
  };
  window.calculateDefinitiveGrade = (subjectGrades) => {
    const lapsoGrades = ['1er', '2do', '3er'].map((period) => {
      const value = subjectGrades?.[period];
      if (value === null || value === undefined || value === '') return null;
      const grade = Number(value);
      return Number.isFinite(grade) ? Math.round(grade) : null;
    });
    if (lapsoGrades.some((grade) => grade === null)) return null;
    const exactGrade = Number((lapsoGrades.reduce((sum, grade) => sum + grade, 0) / lapsoGrades.length).toFixed(2));
    return { exactGrade, roundedGrade: Math.round(exactGrade) };
  };
})();