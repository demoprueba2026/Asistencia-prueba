(() => {
  const rawFetch = window.fetch.bind(window);
  const tokenStorageKey = 'authTokens';
  const apiBaseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
  const sessionUrl = `${apiBaseUrl}/api/session`;
  let refreshInProgress = null;

  const getTokens = () => {
    try {
      return JSON.parse(sessionStorage.getItem(tokenStorageKey) || '{}');
    } catch (error) {
      return {};
    }
  };

  const storeTokens = (payload) => {
    sessionStorage.setItem(tokenStorageKey, JSON.stringify({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }));
    sessionStorage.setItem('activeUser', JSON.stringify(payload.user));
  };

  window.closeAppSession = () => {
    const accessToken = getTokens().accessToken;
    if (accessToken) {
      rawFetch(sessionUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((error) => console.warn('No se pudo cerrar la sesión remota:', error));
    }
    sessionStorage.removeItem(tokenStorageKey);
    sessionStorage.removeItem('activeUser');
  };

  const refreshTokens = async () => {
    if (refreshInProgress) return refreshInProgress;
    const refreshToken = getTokens().refreshToken;
    if (!refreshToken) return false;
    refreshInProgress = rawFetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo renovar la sesión.');
        storeTokens(await response.json());
        return true;
      })
      .catch(() => {
        sessionStorage.removeItem(tokenStorageKey);
        sessionStorage.removeItem('activeUser');
        return false;
      })
      .finally(() => {
        refreshInProgress = null;
      });
    return refreshInProgress;
  };

  const withAccessToken = (input, init, accessToken) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers || {}).forEach((value, key) => headers.set(key, value));
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return { ...init, headers };
  };

  window.fetch = async (input, init = {}) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (!requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/api/session') {
      return rawFetch(input, init);
    }

    const tokens = getTokens();
    const response = await rawFetch(input, withAccessToken(input, init, tokens.accessToken));
    if (response.status !== 401 || !tokens.refreshToken) return response;
    if (!await refreshTokens()) return response;
    return rawFetch(input, withAccessToken(input, init, getTokens().accessToken));
  };
})();
