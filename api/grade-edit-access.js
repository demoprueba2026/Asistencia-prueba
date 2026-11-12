try {
  require('dotenv').config();
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  requireStaff,
  serviceFetch,
} = require('../lib/security');

const isStaffRole = (role) => role && typeof role === 'object'
  && (role.puedeCargarNotas === true
    || role.puedeGestionarActividades === true
    || role.puedeGestionarPendientes === true);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const staffUser = await requireStaff(req, res);
  if (!staffUser) return;

  if (req.method === 'GET' && !staffUser.esAdmin) {
    return res.status(200).json({
      canEditSubmitted: staffUser.puedeEditarNotasGuardadas === true,
    });
  }

  if (!staffUser.esAdmin) {
    return res.status(403).json({ error: 'Solo un administrador puede gestionar esta autorización.' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'La conexión privada del servidor no está configurada.' });
  }

  try {
    if (req.method === 'GET') {
      const query = new URLSearchParams({
        select: 'auth_user_id,login_username,display_name,role',
        active: 'eq.true',
        order: 'display_name.asc',
      });
      const response = await serviceFetch(`/staff_access?${query}`);
      const rows = await response.json().catch(() => []);
      if (!response.ok) {
        return res.status(response.status).json({
          error: rows.message || rows.error || 'No se pudieron consultar los profesores.',
        });
      }

      const teachers = (Array.isArray(rows) ? rows : [])
        .filter((profile) => isStaffRole(profile.role)
          && profile.role.esAdmin !== true
          && profile.role.soloAdmin !== true)
        .map((profile) => ({
          id: profile.auth_user_id,
          username: profile.login_username,
          name: profile.display_name,
          canEditSubmitted: profile.role.puedeEditarNotasGuardadas === true,
        }));
      return res.status(200).json({ teachers });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const userId = String(body.userId || '').trim();
    if (!userId || typeof body.authorized !== 'boolean') {
      return res.status(400).json({ error: 'Selecciona un profesor e indica si queda autorizado.' });
    }

    const query = new URLSearchParams({
      select: 'auth_user_id,role',
      auth_user_id: `eq.${userId}`,
      active: 'eq.true',
      limit: '1',
    });
    const currentResponse = await serviceFetch(`/staff_access?${query}`);
    const currentRows = await currentResponse.json().catch(() => []);
    if (!currentResponse.ok) {
      return res.status(currentResponse.status).json({
        error: currentRows.message || currentRows.error || 'No se pudo consultar el perfil del profesor.',
      });
    }
    const profile = Array.isArray(currentRows) ? currentRows[0] : null;
    if (!profile || !isStaffRole(profile.role)
      || profile.role.esAdmin === true
      || profile.role.soloAdmin === true) {
      return res.status(404).json({ error: 'No se encontró un profesor activo para esta autorización.' });
    }

    const role = {
      ...(profile.role || {}),
      puedeEditarNotasGuardadas: body.authorized,
    };
    const updateQuery = new URLSearchParams({
      auth_user_id: `eq.${userId}`,
      active: 'eq.true',
    });
    const updateResponse = await serviceFetch(`/staff_access?${updateQuery}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ role }),
    });
    const updatedRows = await updateResponse.json().catch(() => []);
    if (!updateResponse.ok) {
      return res.status(updateResponse.status).json({
        error: updatedRows.message || updatedRows.error || 'No se pudo actualizar la autorización.',
      });
    }
    if (!Array.isArray(updatedRows) || !updatedRows.length) {
      return res.status(404).json({ error: 'No se encontró un profesor activo para esta autorización.' });
    }

    return res.status(200).json({
      userId,
      authorized: updatedRows[0].role?.puedeEditarNotasGuardadas === true,
    });
  } catch (error) {
    console.error('Error gestionando la autorización de edición de notas:', error);
    return res.status(500).json({ error: error.message || 'No se pudo gestionar la autorización.' });
  }
};
