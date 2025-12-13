import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { preventSQLInjection } from '../middleware/validation.js';
import { executeQuery, getPool, sql } from '../config/database.js';

const router = express.Router();

// Helper: normalize module name to lower-case
const normalizeModule = (m) => String(m || '').trim().toLowerCase();

/**
 * GET /api/rbac/role-permissions?module=employees
 * Returns role-permission mappings for a given module
 */
router.get('/role-permissions', authenticateToken, authorizeRoles('superadmin', 'admin'), preventSQLInjection, async (req, res) => {
  try {
    const module = normalizeModule(req.query.module || 'employees');

    const q = `
      SELECT role_name, permission_key
      FROM dbo.vw_role_permissions
      WHERE module_name = @module
      ORDER BY role_name, permission_key;
    `;

    const result = await executeQuery(q, { module });
    const rows = result.recordset || [];

    // Group by role_name
    const rolesMap = new Map();
    for (const r of rows) {
      if (!rolesMap.has(r.role_name)) rolesMap.set(r.role_name, []);
      rolesMap.get(r.role_name).push(r.permission_key);
    }

    const roles = Array.from(rolesMap.entries()).map(([role_name, permissions]) => ({ role_name, permissions }));

    return res.json({ success: true, module, roles });
  } catch (error) {
    console.error('GET /rbac/role-permissions error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to load role permissions', error: error?.message || String(error) });
  }
});

/**
 * PUT /api/rbac/role-permissions?module=employees
 * Body: { roles: Array<{ role_name: string, permissions: string[] }> }
 * Replaces role-permissions for the module atomically (superadmin skipped)
 */
router.put('/role-permissions', authenticateToken, authorizeRoles('superadmin', 'admin'), preventSQLInjection, async (req, res) => {
  const module = normalizeModule(req.query.module || 'employees');
  const { roles } = req.body || {};

  if (!Array.isArray(roles)) {
    return res.status(400).json({ success: false, message: 'Invalid payload: roles[] required' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // Resolve permission ids for the module
    const reqPerm = new sql.Request(transaction);
    const permRes = await reqPerm.input('module', sql.NVarChar, module).query(`
      SELECT permission_id, permission_key
      FROM dbo.permissions
      WHERE module_name = @module AND is_active = 1;
    `);
    const permMap = new Map(); // key -> id
    for (const p of (permRes.recordset || [])) permMap.set(p.permission_key, p.permission_id);

    // Process each role
    for (const item of roles) {
      const roleName = String(item.role_name || '').trim().toLowerCase();
      if (!roleName) continue;
      if (roleName === 'superadmin') continue; // skip superadmin

      const desiredKeys = Array.isArray(item.permissions) ? item.permissions.filter(k => permMap.has(k)) : [];

      // Lookup role_id
      const reqRole = new sql.Request(transaction);
      const roleRes = await reqRole.input('role_name', sql.NVarChar, roleName).query(`
        SELECT role_id FROM dbo.roles WHERE LOWER(role_name) = @role_name AND is_active = 1;
      `);
      if (!roleRes.recordset?.length) {
        throw new Error(`Role not found or inactive: ${roleName}`);
      }
      const roleId = roleRes.recordset[0].role_id;

      // Delete existing permissions for this module
      const reqDel = new sql.Request(transaction);
      await reqDel.input('role_id', sql.Int, roleId).input('module', sql.NVarChar, module).query(`
        DELETE rp
        FROM dbo.role_permissions rp
        INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = @role_id AND p.module_name = @module;
      `);

      // Insert desired permissions
      for (const key of desiredKeys) {
        const pid = permMap.get(key);
        const reqIns = new sql.Request(transaction);
        await reqIns.input('role_id', sql.Int, roleId).input('permission_id', sql.Int, pid).query(`
          INSERT INTO dbo.role_permissions(role_id, permission_id)
          VALUES (@role_id, @permission_id);
        `);
      }
    }

    await transaction.commit();
    return res.json({ success: true, module });
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    console.error('PUT /rbac/role-permissions error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to save role permissions', error: error?.message || String(error) });
  }
});

/**
 * GET /api/rbac/roles
 * Returns list of active roles
 */
router.get('/roles', authenticateToken, authorizeRoles('superadmin', 'admin'), async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT role_id, role_name, role_display_name, description
      FROM dbo.roles
      WHERE is_active = 1
      ORDER BY role_name;
    `);
    return res.json({ success: true, roles: result.recordset || [] });
  } catch (error) {
    console.error('GET /rbac/roles error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to load roles', error: error?.message || String(error) });
  }
});

/**
 * POST /api/rbac/roles
 * Body: { role_name, role_display_name?, description? }
 */
router.post('/roles', authenticateToken, authorizeRoles('superadmin', 'admin'), preventSQLInjection, async (req, res) => {
  try {
    const role_name = String(req.body.role_name || '').trim();
    const role_display_name = String(req.body.role_display_name || role_name).trim();
    const description = String(req.body.description || '').trim();

    if (!role_name) {
      return res.status(400).json({ success: false, message: 'role_name is required' });
    }

    // Ensure unique role_name
    const exists = await executeQuery(`
      SELECT 1 AS exists FROM dbo.roles WHERE LOWER(role_name) = LOWER(@role_name);
    `, { role_name });
    if (exists.recordset?.length) {
      return res.status(409).json({ success: false, message: 'Role already exists' });
    }

    await executeQuery(`
      INSERT INTO dbo.roles(role_name, role_display_name, description, is_active)
      VALUES (@role_name, @role_display_name, @description, 1);
    `, { role_name, role_display_name, description });

    const created = await executeQuery(`
      SELECT TOP 1 role_id, role_name, role_display_name, description
      FROM dbo.roles
      WHERE LOWER(role_name) = LOWER(@role_name);
    `, { role_name });

    return res.status(201).json({ success: true, role: created.recordset?.[0] });
  } catch (error) {
    console.error('POST /rbac/roles error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to create role', error: error?.message || String(error) });
  }
});

export default router;