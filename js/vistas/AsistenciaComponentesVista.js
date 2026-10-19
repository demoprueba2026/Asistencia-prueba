const showToast = (message) => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
  }, 2800);
};

const showAttendanceModal = (message) => {
  const modal = document.getElementById('attendanceModal');
  const msg = document.getElementById('attendanceModalMessage');
  const closeBtn = document.getElementById('attendanceModalClose');
  if (!modal || !msg) return;
  msg.textContent = message;
  modal.classList.remove('hidden');
  if (closeBtn) {
    const handler = () => {
      modal.classList.add('hidden');
      closeBtn.removeEventListener('click', handler);
    };
    closeBtn.addEventListener('click', handler);
  }
  clearTimeout(showAttendanceModal.timeoutId);
  showAttendanceModal.timeoutId = setTimeout(() => {
    modal.classList.add('hidden');
  }, 2500);
};

const buildSelectors = () => {
  if (!yearSelect || !subjectSelect) return;
  yearSelect.innerHTML = '';
  subjectSelect.innerHTML = '';

  const yearsToShow = getAllowedYears();
  yearsToShow.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  });

  const stringYears = yearsToShow.map(String);
  if (!stringYears.includes(String(selectedYear))) {
    selectedYear = stringYears[0];
  }
 
  yearSelect.value = String(selectedYear);
  updateSubjectOptions(selectedYear);
};

