(() => {
  const storageKey = 'site-theme';
  const savedTheme = localStorage.getItem(storageKey);
  let theme = savedTheme === 'light' ? 'light' : 'dark';

  const applyTheme = () => {
    document.body.dataset.theme = theme;
    const button = document.getElementById('themeToggle');
    if (!button) return;
    button.textContent = theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
    button.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  };

  const button = document.createElement('button');
  button.id = 'themeToggle';
  button.type = 'button';
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, theme);
    applyTheme();
  });

  const toolbar = document.createElement('div');
  toolbar.className = 'theme-toolbar';
  toolbar.appendChild(button);
  document.body.insertBefore(toolbar, document.body.firstChild);
  applyTheme();
})();
