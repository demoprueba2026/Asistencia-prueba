const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isConfigured,
  serviceFetch,
  getStaffProfile,
  getAppUser,
} = require('../lib/security');

const setHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const findStaffByUsername = async (username) => {
  const query = new URLSearchParams({
    select: 'auth_user_id,auth_email,active',
    login_username: `eq.${username}`,
    active: 'eq.true',
    limit: '1',
  });
  const response = await serviceFetch(`/staff_access?${query}`);
  const rows = await response.json().catch(() => []);
  if (!response.ok) throw new Error(rows.message || rows.error || 'No se pudo consultar el usuario.');
  return Array.isArray(rows) ? rows[0] || null : null;
};

const exchangeAuthToken = async (grantType, body) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'DELETE') {
    const accessToken = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (accessToken && isConfigured()) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch((error) => console.warn('No se pudo revocar la sesión en Supabase Auth:', error));
    }
    return res.status(204).end();
  }
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Configura SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    let tokens;
    if (req.method === 'POST') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || !password) return res.status(400).json({ error: 'Escribe usuario y contraseña.' });

      const staff = await findStaffByUsername(username);
      if (!staff) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      const result = await exchangeAuthToken('password', { email: staff.auth_email, password });
      if (!result.response.ok || !result.data.user?.id || result.data.user.id !== staff.auth_user_id) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      }
      tokens = result.data;
    } else {
      const refreshToken = String(body.refreshToken || '');
      if (!refreshToken) return res.status(400).json({ error: 'Falta el token de renovación.' });
      const result = await exchangeAuthToken('refresh_token', { refresh_token: refreshToken });
      if (!result.response.ok || !result.data.user?.id) {
        return res.status(401).json({ error: 'La sesión expiró. Inicia sesión nuevamente.' });
      }
      tokens = result.data;
    }

    const profile = await getStaffProfile(tokens.user.id);
    if (!profile) return res.status(403).json({ error: 'Esta cuenta no tiene acceso al sistema.' });
    return res.status(200).json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: getAppUser(profile),
    });
  } catch (error) {
    console.error('Error creando la sesión del personal:', error);
    return res.status(503).json({ error: 'No se pudo iniciar sesión. Verifica la configuración de Supabase.' });
  }
};
