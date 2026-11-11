const crypto = require('crypto');

try {
  require('dotenv').config();
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const normalizeSupabaseUrl = (value) => {
  const url = String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = String(
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
).trim().replace(/^["']|["']$/g, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  .trim().replace(/^["']|["']$/g, '');

const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
const TEST_ACCESS_TOKEN_TTL = 15 * 60;
const TEST_REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
const normalizeLoginUsername = (username) => String(username || '').trim().toLowerCase();

const getTestStaffConfig = () => {
  const rawUsers = process.env.TEST_STAFF_USERS;
  if (!rawUsers) return { users: null, secret: '', error: null };

  const secret = String(process.env.TEST_STAFF_TOKEN_SECRET || '');
  if (secret.length < 32) {
    return { users: null, secret, error: 'TEST_STAFF_TOKEN_SECRET debe tener al menos 32 caracteres.' };
  }

  let configuredUsers;
  try {
    configuredUsers = JSON.parse(rawUsers);
  } catch (error) {
    return { users: null, secret, error: 'TEST_STAFF_USERS debe contener un objeto JSON válido.' };
  }
  if (!configuredUsers || typeof configuredUsers !== 'object' || Array.isArray(configuredUsers)) {
    return { users: null, secret, error: 'TEST_STAFF_USERS debe ser un objeto JSON de usuarios.' };
  }

  const users = {};
  for (const [username, account] of Object.entries(configuredUsers)) {
    const key = normalizeLoginUsername(username);
    if (!key || users[key] || !account || typeof account !== 'object'
      || typeof account.password !== 'string' || !account.password
      || typeof account.name !== 'string' || !account.name
      || !account.role || typeof account.role !== 'object' || Array.isArray(account.role)
      || !Array.isArray(account.allowedYears) || !Array.isArray(account.allowedSubjects)) {
      return { users: null, secret, error: `La configuración de la cuenta de prueba "${username}" no es válida.` };
    }
    users[key] = {
      username: String(username).trim(),
      password: account.password,
      name: account.name,
      role: account.role,
      allowedYears: account.allowedYears,
      allowedSubjects: account.allowedSubjects,
      allowedSubjectsByYear: account.allowedSubjectsByYear || {},
    };
  }
  return { users, secret, error: null };
};

const signTestToken = (username, tokenType, secret, expiresIn) => {
  const payload = Buffer.from(JSON.stringify({
    username,
    tokenType,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  })).toString('base64url');
  const message = `test.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('base64url');
  return `${message}.${signature}`;
};

const verifyTestToken = (token, expectedType, secret) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'test') return null;

  const message = `${parts[0]}.${parts[1]}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest();
  let receivedSignature;
  try {
    receivedSignature = Buffer.from(parts[2], 'base64url');
  } catch (error) {
    return { error: 'La sesión de prueba no es válida.', status: 401 };
  }
  if (receivedSignature.length !== expectedSignature.length
    || !crypto.timingSafeEqual(receivedSignature, expectedSignature)) {
    return { error: 'La sesión de prueba no es válida.', status: 401 };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch (error) {
    return { error: 'La sesión de prueba no es válida.', status: 401 };
  }
  if (payload.tokenType !== expectedType || !Number.isInteger(payload.expiresAt)
    || payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    return { error: 'La sesión expiró. Inicia sesión nuevamente.', status: 401 };
  }
  return payload;
};

const safePasswordMatches = (submitted, expected) => {
  const submittedBytes = Buffer.from(String(submitted));
  const expectedBytes = Buffer.from(String(expected));
  return submittedBytes.length === expectedBytes.length
    && crypto.timingSafeEqual(submittedBytes, expectedBytes);
};

const getTestAppUser = (username, account) => ({
  ...account.role,
  id: `test-${username}`,
  username: account.username,
  name: account.name,
  allowedYears: account.allowedYears,
  allowedSubjects: account.allowedSubjects,
  allowedSubjectsByYear: account.allowedSubjectsByYear,
});

const createTestStaffSession = (username, account, secret) => ({
  accessToken: signTestToken(username, 'access', secret, TEST_ACCESS_TOKEN_TTL),
  refreshToken: signTestToken(username, 'refresh', secret, TEST_REFRESH_TOKEN_TTL),
  expiresIn: TEST_ACCESS_TOKEN_TTL,
  user: getTestAppUser(username, account),
});

const authenticateTestStaffRequest = (req) => {
  const accessToken = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken?.startsWith('test.')) return null;

  const config = getTestStaffConfig();
  if (config.error) return { error: config.error, status: 503 };
  if (!config.users) return { error: 'La autenticación de prueba no está configurada.', status: 401 };
  const payload = verifyTestToken(accessToken, 'access', config.secret);
  if (payload?.error) return payload;
  if (!payload) return { error: 'La sesión de prueba no es válida.', status: 401 };
  const account = config.users[payload.username];
  if (!account) return { error: 'La cuenta de prueba está deshabilitada.', status: 403 };
  return {
    profile: { login_username: account.username, display_name: account.name },
    user: getTestAppUser(payload.username, account),
    authUser: { id: `test-${payload.username}` },
  };
};

const signInTestStaff = (username, password) => {
  const config = getTestStaffConfig();
  if (config.error) return { error: config.error, status: 503 };
  if (!config.users) return null;
  const normalizedUsername = normalizeLoginUsername(username);
  const account = config.users[normalizedUsername];
  if (!account) return null;
  if (!safePasswordMatches(password, account.password)) {
    return { error: 'Usuario o contraseña incorrectos.', status: 401 };
  }
  return { session: createTestStaffSession(normalizedUsername, account, config.secret) };
};

const refreshTestStaffSession = (refreshToken) => {
  const config = getTestStaffConfig();
  if (config.error) return { error: config.error, status: 503 };
  if (!config.users) return null;
  if (!String(refreshToken || '').startsWith('test.')) return null;
  const payload = verifyTestToken(refreshToken, 'refresh', config.secret);
  if (payload?.error) return payload;
  if (!payload) return { error: 'El token de renovación no es válido.', status: 401 };
  const account = config.users[payload.username];
  if (!account) return { error: 'La cuenta de prueba está deshabilitada.', status: 403 };
  return { session: createTestStaffSession(payload.username, account, config.secret) };
};

const isTestToken = (token) => String(token || '').startsWith('test.');

const serviceFetch = (path, options = {}) => fetch(`${SUPABASE_URL}/rest/v1${path}`, {
  ...options,
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
});

const getStaffProfile = async (authUserId) => {
  const query = new URLSearchParams({
    select: '*',
    auth_user_id: `eq.${authUserId}`,
    active: 'eq.true',
    limit: '1',
  });
  const response = await serviceFetch(`/staff_access?${query}`);
  const rows = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(rows.message || rows.error || 'No se pudo consultar el perfil del personal.');
  }
  return Array.isArray(rows) ? rows[0] || null : null;
};

const getAppUser = (profile) => {
  const role = profile.role && typeof profile.role === 'object' && !Array.isArray(profile.role)
    ? profile.role
    : {};
  return {
    ...role,
    id: profile.auth_user_id,
    username: profile.login_username,
    name: profile.display_name,
    allowedYears: Array.isArray(profile.allowed_years) ? profile.allowed_years : [],
    allowedSubjects: Array.isArray(profile.allowed_subjects) ? profile.allowed_subjects : [],
    allowedSubjectsByYear: profile.allowed_subjects_by_year || {},
  };
};

const authenticateStaffRequest = async (req) => {
  const testResult = authenticateTestStaffRequest(req);
  if (testResult) return testResult;
  if (!isConfigured()) {
    return { error: 'Supabase Auth no está configurado en el servidor.', status: 503 };
  }
  const authorization = req.headers?.authorization || '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return { error: 'Se requiere una sesión autenticada.', status: 401 };

  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const authUser = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok || !authUser.id) {
    return { error: 'La sesión no es válida o expiró. Inicia sesión nuevamente.', status: 401 };
  }

  const profile = await getStaffProfile(authUser.id);
  if (!profile) return { error: 'Esta cuenta no tiene acceso al sistema.', status: 403 };
  return { profile, user: getAppUser(profile), authUser };
};

const hasPermission = (user, permission) => {
  if (Array.isArray(permission)) {
    return permission.every((item) => hasPermission(user, item));
  }
  if (user?.esAdmin === true) return true;
  switch (permission) {
    case 'students.read':
      return user?.puedeVerEstudiantes === true
        || user?.puedeVerDatosPersonales === true
        || user?.puedeVerReportes === true
        || user?.soloReportes === true
        || user?.puedeAgregarEstudiantes === true
        || user?.puedeCargarNotas === true
        || user?.puedeGestionarActividades === true
        || user?.puedeGestionarPendientes === true
        || user?.puedeGestionarBoletas === true
        || user?.puedeMarcarAsistencia === true;
    case 'students.write':
      return user?.puedeAgregarEstudiantes === true;
    case 'students.grades':
      return user?.puedeCargarNotas === true
        || user?.puedeGestionarActividades === true
        || user?.puedeGestionarPendientes === true;
    case 'attendance.mark':
      return user?.puedeMarcarAsistencia === true;
    case 'attendance.read':
      return user?.puedeVerReportes === true || user?.soloReportes === true;
    case 'reports.read':
      return user?.puedeVerReportes === true || user?.soloReportes === true;
    case 'payments.write':
      return user?.puedeGestionarBoletas === true;
    default:
      return false;
  }
};

const getStudentPatchPermissions = (body = {}) => {
  const keys = Object.keys(body).filter((key) => key !== 'id');
  const permissions = [];
  if (keys.includes('grades')) permissions.push('students.grades');
  if (keys.some((key) => ['pendingSubjects', 'pending_subjects', 'matterPendingSubjects', 'matter_pending_subjects'].includes(key))) {
    permissions.push('students.grades');
  }
  if (keys.some((key) => ['BoletaVisible', 'paymentStatus', 'paidAmount', 'payments'].includes(key))) {
    permissions.push('payments.write');
  }
  if (keys.some((key) => ['attendance', 'attendanceByDate'].includes(key))) {
    permissions.push('attendance.mark');
  }
  if (keys.some((key) => ['name', 'cedula', 'email', 'phone', 'year', 'status'].includes(key))) {
    permissions.push('students.write');
  }
  return permissions.length ? [...new Set(permissions)] : ['students.write'];
};

const isYearAllowed = (user, year) => {
  if (user?.esAdmin === true) return true;
  const allowedYears = user?.allowedYears || [];
  return Number.isInteger(Number(year)) && allowedYears.map(Number).includes(Number(year));
};

const isSubjectAllowed = (user, year, subject) => {
  if (user?.esAdmin === true) return true;
  const perYear = user?.allowedSubjectsByYear?.[Number(year)];
  const allowedSubjects = Array.isArray(perYear) ? perYear : user?.allowedSubjects;
  return Array.isArray(allowedSubjects)
    && (allowedSubjects.includes('todas') || allowedSubjects.includes(String(subject)));
};

const filterStudentFieldsForUser = (student, user) => {
  const filtered = { ...student };
  const canViewPersonalData = user?.esAdmin === true || user?.puedeVerDatosPersonales === true;
  const canViewPayments = canViewPersonalData || hasPermission(user, 'payments.write');
  const canViewAttendance = hasPermission(user, 'attendance.read') || hasPermission(user, 'attendance.mark');

  if (!canViewPersonalData) {
    delete filtered.cedula;
    delete filtered.email;
    delete filtered.phone;
  }
  if (!canViewPayments) {
    delete filtered.payments;
    delete filtered.payment_status;
    delete filtered.paymentStatus;
    delete filtered.paid_amount;
    delete filtered.paidAmount;
    delete filtered.BoletaVisible;
    delete filtered.boleta_visible;
  }
  if (!hasPermission(user, 'students.grades')) delete filtered.grades;
  if (!hasPermission(user, 'students.grades')) {
    delete filtered.pendingSubjects;
    delete filtered.pending_subjects;
    delete filtered.matterPendingSubjects;
    delete filtered.matter_pending_subjects;
  }
  if (!canViewAttendance) {
    delete filtered.attendance;
    delete filtered.attendance_by_date;
    delete filtered.attendanceByDate;
  }
  return filtered;
};

const requireStaff = async (req, res, permission) => {
  let result;
  try {
    result = await authenticateStaffRequest(req);
  } catch (error) {
    console.error('Error verificando la sesión del personal:', error);
    res.status(503).json({ error: 'No se pudo verificar la sesión con Supabase Auth.' });
    return null;
  }
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return null;
  }
  if (permission && !hasPermission(result.user, permission)) {
    res.status(403).json({ error: 'No tienes permiso para realizar esta operación.' });
    return null;
  }
  req.staffProfile = result.profile;
  req.staffUser = result.user;
  req.authUser = result.authUser;
  return result.user;
};

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  isConfigured,
  getTestStaffConfig,
  signInTestStaff,
  refreshTestStaffSession,
  isTestToken,
  serviceFetch,
  getStaffProfile,
  getAppUser,
  authenticateStaffRequest,
  hasPermission,
  getStudentPatchPermissions,
  isYearAllowed,
  isSubjectAllowed,
  filterStudentFieldsForUser,
  requireStaff,
};
