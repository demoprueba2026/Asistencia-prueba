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
        || user?.puedeGestionarBoletas === true
        || user?.puedeMarcarAsistencia === true;
    case 'students.write':
      return user?.puedeAgregarEstudiantes === true;
    case 'students.grades':
      return user?.puedeCargarNotas === true || user?.puedeGestionarActividades === true;
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
