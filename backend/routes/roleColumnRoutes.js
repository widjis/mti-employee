import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List roles
router.get('/column-matrix/roles', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT role_id, role_name, role_display_name
       FROM dbo.roles
       WHERE is_active = 1
       ORDER BY role_display_name`
    );
    res.json({ success: true, roles: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list roles', error: error.message });
  }
});

// List columns
router.get('/column-matrix/columns', async (req, res) => {
  try {
    const { table } = req.query;
    const base = `SELECT id, table_name, column_name, display_label, data_type, is_exportable, is_sensitive, is_active
                  FROM dbo.column_catalog`;
    const where = table ? ` WHERE table_name = @table` : '';
    const order = ` ORDER BY table_name, column_name`;
    const query = base + where + order;
    const params = table ? { table } : {};
    const result = await executeQuery(query, params);
    res.json({ success: true, columns: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list columns', error: error.message });
  }
});

// Get access matrix for a role
router.get('/column-matrix/access/:roleId', async (req, res) => {
  const { roleId } = req.params;
  try {
    const result = await executeQuery(
      `SELECT 
          c.id AS column_id,
          c.table_name,
          c.column_name,
          c.display_label,
          c.data_type,
          ISNULL(rca.can_view, 0) AS can_view,
          ISNULL(rca.can_edit, 0) AS can_edit,
          ISNULL(rca.export_allowed, 0) AS export_allowed
       FROM dbo.column_catalog c
       LEFT JOIN dbo.role_column_access rca
         ON rca.column_id = c.id AND rca.role_id = @roleId
       WHERE c.is_active = 1
       ORDER BY c.table_name, c.column_name`,
      { roleId: Number(roleId) }
    );
    res.json({ success: true, roleId: Number(roleId), items: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get role access', error: error.message });
  }
});

// Update access matrix for a role
router.put('/column-matrix/access/:roleId', async (req, res) => {
  const { roleId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array required' });
  }

  try {
    // Upsert each item (safe and simple)
    for (const item of items) {
      const params = {
        roleId: Number(roleId),
        columnId: Number(item.columnId),
        canView: item.can_view ? 1 : 0,
        canEdit: item.can_edit ? 1 : 0,
        exportAllowed: item.export_allowed ? 1 : 0,
      };

      // Try update first
      const upd = await executeQuery(
        `UPDATE dbo.role_column_access
         SET can_view = @canView,
             can_edit = @canEdit,
             export_allowed = @exportAllowed,
             updated_at = SYSUTCDATETIME()
         WHERE role_id = @roleId AND column_id = @columnId;
         SELECT @@ROWCOUNT AS affected;`, params
      );

      const affected = upd.recordset?.[0]?.affected || 0;
      if (affected === 0) {
        await executeQuery(
          `INSERT INTO dbo.role_column_access (role_id, column_id, can_view, can_edit, export_allowed, created_at, updated_at)
           VALUES (@roleId, @columnId, @canView, @canEdit, @exportAllowed, SYSUTCDATETIME(), SYSUTCDATETIME())`, params
        );
      }
    }

    res.json({ success: true, message: 'Access matrix updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update role access', error: error.message });
  }
});

// Get viewable columns for current user role with display labels
router.get('/column-matrix/view-columns', authenticateToken, async (req, res) => {
  try {
    const roleName = req.user?.role;
    if (!roleName) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing role' });
    }

    // Resolve role_id from role_name
    const roleResult = await executeQuery(
      `SELECT role_id, role_name FROM dbo.roles WHERE role_name = @roleName`,
      { roleName }
    );
    const roleInfo = roleResult.recordset[0];
    if (!roleInfo) {
      return res.status(403).json({ success: false, message: 'Invalid role or inactive role' });
    }

    // Query catalog joined with role access (can_view) and active columns
    const result = await executeQuery(
      `SELECT c.column_name, c.display_label, c.table_name, c.is_exportable, c.is_active, c.is_sensitive, rca.can_view
       FROM dbo.column_catalog c
       INNER JOIN dbo.role_column_access rca ON rca.column_id = c.id
       WHERE rca.role_id = @roleId
         AND rca.can_view = 1
         AND c.is_active = 1
       ORDER BY c.table_name, c.column_name`,
      { roleId: roleInfo.role_id }
    );

    // Hide non-exportable fields per requirement (and keep only active)
    const rows = result.recordset.filter(r => r.is_exportable === true);

    // Build payload: columns with labels (fallback Title Case)
    const columns = rows.map(r => ({
      column_name: r.column_name,
      display_label: r.display_label || r.column_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      table_name: r.table_name
    }));

    res.json({ success: true, columns });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list viewable columns', error: error.message });
  }
});

export default router;

// Update column catalog properties
router.patch('/column-matrix/column/:columnId', async (req, res) => {
  const { columnId } = req.params;
  const { display_label, is_exportable, is_sensitive, is_active } = req.body || {};

  try {
    const sets = [];
    const params = { columnId: Number(columnId) };
    if (typeof display_label === 'string') {
      sets.push('display_label = @display_label');
      params.display_label = display_label;
    }
    if (typeof is_exportable === 'boolean') {
      sets.push('is_exportable = @is_exportable');
      params.is_exportable = is_exportable ? 1 : 0;
    }
    if (typeof is_sensitive === 'boolean') {
      sets.push('is_sensitive = @is_sensitive');
      params.is_sensitive = is_sensitive ? 1 : 0;
    }
    if (typeof is_active === 'boolean') {
      sets.push('is_active = @is_active');
      params.is_active = is_active ? 1 : 0;
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    sets.push('updated_at = SYSUTCDATETIME()');
    const query = `UPDATE dbo.column_catalog SET ${sets.join(', ')} WHERE id = @columnId`;
    await executeQuery(query, params);
    res.json({ success: true, message: 'Column updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update column', error: error.message });
  }
});