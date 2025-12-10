import express from 'express';
import XLSX from 'xlsx';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { query } from 'express-validator';
import { sql, poolPromise } from '../db.js';
import { getAllowedSheets } from '../config/roleColumnMapping.js';

const router = express.Router();

// Helper: derive IND/EXP and active/inactive flags from available fields
function deriveFlags(employee) {
  const nationalityRaw = (employee?.nationality || '').toString().trim().toLowerCase();
  const localSet = new Set(['indonesia', 'indonesian', 'id', 'wni']);
  const isIndonesian = nationalityRaw ? localSet.has(nationalityRaw) : false;

  const statusRaw = (employee?.status || employee?.employment_status || '').toString().trim();
  const terminatedDate = employee?.terminated_date;

  const isTerminated = Boolean(terminatedDate) || statusRaw === 'Terminated';
  const isActive = statusRaw === 'Active' && !isTerminated;
  const isInactive = !isActive && !isTerminated && !!statusRaw && statusRaw !== 'Active';

  const indActive = isIndonesian && isActive;
  const indInactive = isIndonesian && (isInactive || isTerminated);
  const expActive = !isIndonesian && isActive;
  const expInactive = !isIndonesian && (isInactive || isTerminated);

  return {
    isIndonesian,
    isActive,
    isInactive,
    isTerminated,
    indActive,
    indInactive,
    expActive,
    expInactive
  };
}

// Helper: format snake_case to Title Case with spaces
function formatHeader(labelOrName) {
  if (!labelOrName) return '';
  return labelOrName
    .toString()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

// Helper: fetch role info by role_name (from token)
async function getRoleInfoFromDb(roleName) {
  const pool = await poolPromise;
  const request = pool.request();
  request.input('roleName', roleName);
  const result = await request.query(
    `SELECT role_id, role_name, role_display_name FROM dbo.roles WHERE role_name = @roleName`
  );
  return result.recordset[0] || null;
}

// Helper: get allowed export columns for a role from DB
async function getDbAllowedExportColumns(roleId) {
  const pool = await poolPromise;
  const request = pool.request();
  request.input('roleId', roleId);
  const result = await request.query(`
    SELECT c.column_name, c.display_label, c.table_name
    FROM dbo.column_catalog c
    INNER JOIN dbo.role_column_access rca ON rca.column_id = c.id
    WHERE rca.role_id = @roleId
      AND c.is_active = 1
      AND c.is_exportable = 1
      AND rca.export_allowed = 1
    ORDER BY c.table_name, c.column_name
  `);
  return result.recordset;
}

// Helper: build Excel headers map from catalog entries
function buildExcelHeadersMap(catalogRows) {
  const headers = {};
  for (const row of catalogRows) {
    const header = row.display_label ? row.display_label : formatHeader(row.column_name);
    headers[row.column_name] = header;
  }
  return headers;
}

/**
 * Get employee data filtered by role permissions
 * GET /api/employees/export/data
 */
router.get('/data',
  authenticateToken,
  [
    query('sheet').optional().isString().withMessage('Sheet must be a string'),
    query('format').optional().isIn(['json', 'excel']).withMessage('Format must be json or excel'),
    query('department').optional().isString().withMessage('Department must be a string'),
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Status must be active, inactive, or all')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const { sheet, format = 'json', department, status = 'active' } = req.query;

      // Resolve role info from DB
      const roleInfo = await getRoleInfoFromDb(userRole);
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }

      // Allowed sheets (still static for now)
      const allowedSheets = getAllowedSheets(userRole);

      // Get allowed export columns for this role from DB
      const catalogRows = await getDbAllowedExportColumns(roleInfo.role_id);
      const allowedColumns = catalogRows.map(r => r.column_name);
      const excelHeaders = buildExcelHeadersMap(catalogRows);
      
      // Validate sheet access
      if (sheet && !allowedSheets.includes(sheet)) {
        return res.status(403).json({ error: 'Access denied to requested sheet' });
      }
      
      // Build SQL query with role-based column filtering
      const selectColumns = allowedColumns.map(col => `ec.${col}`).join(', ');
      
      let whereConditions = [];
      let queryParams = [];
      
      // Filter by employment status
      if (status !== 'all') {
        if (status === 'active') {
          whereConditions.push('ec.employment_status = ?');
          queryParams.push('Active');
        } else {
          whereConditions.push('ec.employment_status != ? OR ec.employment_status IS NULL');
          queryParams.push('Active');
        }
      }
      
      // Filter by department if specified
      if (department) {
        whereConditions.push('ec.department = ?');
        queryParams.push(department);
      }
      
      // Department admin can only see their own department
      if (userRole === 'dept_admin' && req.user.department) {
        whereConditions.push('ec.department = ?');
        queryParams.push(req.user.department);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const sqlQuery = `
        SELECT ${selectColumns}
        FROM employee_core ec
        ${whereClause}
        ORDER BY ec.employee_id
      `;
      
      const pool = await poolPromise;
        const request = pool.request();
        
        // Add parameters to request
        queryParams.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
      const result = await request.query(sqlQuery);
      const filteredEmployees = result.recordset;
      
      if (format === 'excel') {
        // Transform data for Excel export
        const derivedHeaders = ['IND Active', 'IND Inactive', 'EXP Active', 'EXP Inactive'];
        const excelData = filteredEmployees.map(employee => {
          const row = {};
          Object.keys(excelHeaders).forEach(dbField => {
            const excelHeader = excelHeaders[dbField];
            row[excelHeader] = employee[dbField] ?? '';
          });

          // Append derived flags using checkmark/dash for readability
          const flags = deriveFlags(employee);
          row['IND Active'] = flags.indActive ? '✔' : '—';
          row['IND Inactive'] = flags.indInactive ? '✔' : '—';
          row['EXP Active'] = flags.expActive ? '✔' : '—';
          row['EXP Inactive'] = flags.expInactive ? '✔' : '—';

          return row;
        });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const columnWidths = [
          ...Object.values(excelHeaders).map(header => ({
            wch: Math.max(header.length, 15)
          })),
          ...['IND Active', 'IND Inactive', 'EXP Active', 'EXP Inactive'].map(h => ({
            wch: Math.max(h.length, 15)
          }))
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        const sheetName = sheet || `${roleInfo.role_display_name || roleInfo.role_name} Data`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set response headers for file download
        const filename = `employee_data_${userRole}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        
        return res.send(excelBuffer);
      } else {
        // Return JSON data with derived flags appended
        const dataWithDerived = filteredEmployees.map(emp => {
          const flags = deriveFlags(emp);
          return {
            ...emp,
            is_indonesian: flags.isIndonesian,
            is_active: flags.isActive,
            is_inactive: flags.isInactive,
            is_terminated: flags.isTerminated,
            ind_active: flags.indActive,
            ind_inactive: flags.indInactive,
            exp_active: flags.expActive,
            exp_inactive: flags.expInactive
          };
        });
        res.json({
          success: true,
          data: dataWithDerived,
          meta: {
            role: userRole,
            roleInfo: roleInfo,
            totalRecords: filteredEmployees.length,
            allowedColumns: allowedColumns.length,
            sheet: sheet || 'All allowed sheets',
            filters: {
              department: department || 'All departments',
              status: status
            }
          }
        });
      }
      
    } catch (error) {
      console.error('Error exporting employee data:', error);
      res.status(500).json({ error: 'Failed to export employee data' });
    }
  }
);

/**
 * Get available export options for current user role
 * GET /api/employees/export/options
 */
router.get('/options',
  authenticateToken,
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const roleInfo = await getRoleInfoFromDb(userRole);
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }

      // Columns and headers from DB
      const catalogRows = await getDbAllowedExportColumns(roleInfo.role_id);
      const allowedColumns = catalogRows.map(r => r.column_name);
      const excelHeaders = buildExcelHeadersMap(catalogRows);
      // Allowed sheets still static for now
      const allowedSheets = getAllowedSheets(userRole);
      
      // Get available departments (if user has access to department field)
      let departments = [];
      if (allowedColumns.includes('department')) {
        try {
          let departmentQuery = 'SELECT DISTINCT department FROM employee_core WHERE department IS NOT NULL ORDER BY department';
          let queryParams = [];
          
          // Department admin can only see their own department
          if (userRole === 'dept_admin' && req.user.department) {
            departmentQuery = 'SELECT DISTINCT department FROM employee_core WHERE department = ? ORDER BY department';
            queryParams = [req.user.department];
          }
          
          const pool = await poolPromise;
        const request = pool.request();
        
        // Add parameters to request
        queryParams.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
        const result = await request.query(departmentQuery);
        const departmentResults = result.recordset;
          departments = departmentResults.map(row => row.department);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
      }
      
      res.json({
        success: true,
        options: {
          role: userRole,
          roleInfo: roleInfo,
          allowedColumns: allowedColumns,
          allowedSheets: allowedSheets,
          excelHeaders: excelHeaders,
          derivedHeaders: ['IND Active', 'IND Inactive', 'EXP Active', 'EXP Inactive'],
          availableDepartments: departments,
          exportFormats: ['json', 'excel'],
          statusOptions: ['active', 'inactive', 'all']
        }
      });
      
    } catch (error) {
      console.error('Error getting export options:', error);
      res.status(500).json({ error: 'Failed to get export options' });
    }
  }
);

/**
 * Get role-based template for Excel import
 * GET /api/employees/export/template
 */
router.get('/template',
  authenticateToken,
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const roleInfo = await getRoleInfoFromDb(userRole);
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }

      const catalogRows = await getDbAllowedExportColumns(roleInfo.role_id);
      const allowedColumns = catalogRows.map(r => r.column_name);
      const excelHeaders = buildExcelHeadersMap(catalogRows);
      
      // Create template with headers only
      const templateData = [{}];
      Object.keys(excelHeaders).forEach(dbField => {
        const excelHeader = excelHeaders[dbField];
        templateData[0][excelHeader] = '';
      });
      // Include derived headers in template for convenience
      ['IND Active', 'IND Inactive', 'EXP Active', 'EXP Inactive'].forEach(h => {
        templateData[0][h] = '';
      });
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths
      const columnWidths = [
        ...Object.values(excelHeaders).map(header => ({
          wch: Math.max(header.length, 15)
        })),
        ...['IND Active', 'IND Inactive', 'EXP Active', 'EXP Inactive'].map(h => ({
          wch: Math.max(h.length, 15)
        }))
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, `${roleInfo.name} Template`);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers for file download
      const filename = `employee_template_${userRole}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      res.send(excelBuffer);
      
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  }
);

/**
 * Get employee statistics for current user role
 * GET /api/employees/export/stats
 */
router.get('/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const roleInfo = await getRoleInfoFromDb(userRole);
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }
      
      let whereCondition = '';
      let queryParams = [];
      
      // Department admin can only see their own department
      if (userRole === 'dept_admin' && req.user.department) {
        whereCondition = 'WHERE department = ?';
        queryParams = [req.user.department];
      }
      
      // Get basic statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN employment_status = 'Active' THEN 1 END) as active_employees,
          COUNT(CASE WHEN employment_status != 'Active' OR employment_status IS NULL THEN 1 END) as inactive_employees,
          COUNT(DISTINCT department) as total_departments,
          COUNT(DISTINCT division) as total_divisions
        FROM employee_core
        ${whereCondition}
      `;
      
      const pool = await poolPromise;
        const request = pool.request();
        
        // Add parameters to request
        queryParams.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
        const result = await request.query(statsQuery);
        const stats = result.recordset;
      
      // Count accessible columns via DB
      const catalogRows = await getDbAllowedExportColumns(roleInfo.role_id);
      const accessibleColumns = catalogRows.length;
      const accessibleSheets = getAllowedSheets(userRole).length;

      res.json({
        success: true,
        stats: {
          role: userRole,
          roleInfo: roleInfo,
          totalEmployees: stats[0].total_employees,
          activeEmployees: stats[0].active_employees,
          inactiveEmployees: stats[0].inactive_employees,
          totalDepartments: stats[0].total_departments,
          totalDivisions: stats[0].total_divisions,
          accessibleColumns,
          accessibleSheets
        }
      });
      
    } catch (error) {
      console.error('Error getting employee statistics:', error);
      res.status(500).json({ error: 'Failed to get employee statistics' });
    }
  }
);

export default router;