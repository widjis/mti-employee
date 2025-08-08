import express from 'express';
import XLSX from 'xlsx';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { query } from 'express-validator';
import { sql, poolPromise } from '../db.js';
import {
  getAllowedColumns,
  getAllowedSheets,
  getExcelHeaders,
  filterEmployeeDataByRole,
  getRoleInfo
} from '../config/roleColumnMapping.js';

const router = express.Router();

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
      
      // Get role permissions
      const roleInfo = getRoleInfo(userRole);
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }
      
      const allowedColumns = getAllowedColumns(userRole);
      const allowedSheets = getAllowedSheets(userRole);
      
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
        const employees = result.recordset;
      
      // Filter data based on role permissions
      const filteredEmployees = filterEmployeeDataByRole(employees, userRole);
      
      if (format === 'excel') {
        // Generate Excel file
        const excelHeaders = getExcelHeaders(userRole);
        
        // Transform data for Excel export
        const excelData = filteredEmployees.map(employee => {
          const row = {};
          Object.keys(excelHeaders).forEach(dbField => {
            const excelHeader = excelHeaders[dbField];
            row[excelHeader] = employee[dbField] || '';
          });
          return row;
        });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const columnWidths = Object.values(excelHeaders).map(header => ({
          wch: Math.max(header.length, 15)
        }));
        worksheet['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        const sheetName = sheet || `${roleInfo.name} Data`;
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
        // Return JSON data
        res.json({
          success: true,
          data: filteredEmployees,
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
      const roleInfo = getRoleInfo(userRole);
      
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }
      
      const allowedColumns = getAllowedColumns(userRole);
      const allowedSheets = getAllowedSheets(userRole);
      const excelHeaders = getExcelHeaders(userRole);
      
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
      const roleInfo = getRoleInfo(userRole);
      
      if (!roleInfo) {
        return res.status(403).json({ error: 'Invalid role or insufficient permissions' });
      }
      
      const allowedColumns = getAllowedColumns(userRole);
      const excelHeaders = getExcelHeaders(userRole);
      
      // Create template with headers only
      const templateData = [{}];
      Object.keys(excelHeaders).forEach(dbField => {
        const excelHeader = excelHeaders[dbField];
        templateData[0][excelHeader] = '';
      });
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths
      const columnWidths = Object.values(excelHeaders).map(header => ({
        wch: Math.max(header.length, 15)
      }));
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
      const roleInfo = getRoleInfo(userRole);
      
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
          accessibleColumns: getAllowedColumns(userRole).length,
          accessibleSheets: getAllowedSheets(userRole).length
        }
      });
      
    } catch (error) {
      console.error('Error getting employee statistics:', error);
      res.status(500).json({ error: 'Failed to get employee statistics' });
    }
  }
);

export default router;