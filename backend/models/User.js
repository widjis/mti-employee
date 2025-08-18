import { executeQuery, sql } from '../config/database.js';
import bcrypt from 'bcrypt';
import config from '../config/app.js';

/**
 * User model using mssql for consistency with the rest of the backend
 */
class User {
  /**
   * Create a new user
   */
  static async create(userData) {
    const { 
      username, 
      name, 
      password, 
      role = 'employee', 
      department,
      auth_type = 'local',
      domain_username = null,
      last_domain_sync = null
    } = userData;
    
    // Hash password before storing (only for local users)
    let hashedPassword = null;
    if (password && auth_type === 'local') {
      hashedPassword = await bcrypt.hash(password, config.security.bcryptSaltRounds);
    }
    
    const query = `
      INSERT INTO dbo.login (
        username, name, password, Role, department, 
        auth_type, domain_username, last_domain_sync,
        created_at, updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        @username, @name, @password, @role, @department,
        @auth_type, @domain_username, @last_domain_sync,
        GETDATE(), GETDATE()
      )
    `;
    
    const result = await executeQuery(query, {
      username,
      name,
      password: hashedPassword,
      role,
      department,
      auth_type,
      domain_username,
      last_domain_sync
    });
    
    return result.recordset[0];
  }
  
  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const query = 'SELECT * FROM dbo.login WHERE username = @username';
    const result = await executeQuery(query, { username });
    return result.recordset[0] || null;
  }
  
  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM dbo.login WHERE Id = @id';
    const result = await executeQuery(query, { id });
    return result.recordset[0] || null;
  }

  /**
   * Find user by domain username
   */
  static async findByDomainUsername(domainUsername) {
    const query = 'SELECT * FROM dbo.login WHERE domain_username = @domainUsername AND auth_type = @auth_type';
    const result = await executeQuery(query, { 
      domainUsername, 
      auth_type: 'domain' 
    });
    return result.recordset[0] || null;
  }
  
  /**
   * Get all users with optional filters
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM dbo.login WHERE 1=1';
    const params = {};
    
    if (filters.role) {
      query += ' AND role = @role';
      params.role = filters.role;
    }
    
    if (filters.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }
    
    if (filters.department) {
      query += ' AND department = @department';
      params.department = filters.department;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await executeQuery(query, params);
    return result.recordset;
  }
  
  /**
   * Update user
   */
  static async update(id, updateData) {
    const allowedFields = ['name', 'Role', 'department', 'account_locked', 'customColumns', 'lastLogin', 'loginAttempts', 'lockedUntil'];
    const updates = [];
    const params = { id };
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = @${key}`);
        params[key] = key === 'customColumns' && typeof updateData[key] === 'object' 
          ? JSON.stringify(updateData[key]) 
          : updateData[key];
      }
    });
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updates.push('updated_at = GETDATE()');
    
    const query = `
      UPDATE dbo.login 
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await executeQuery(query, params);
    return result.recordset[0];
  }
  
  /**
   * Update password
   */
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptSaltRounds);
    
    const query = `
      UPDATE dbo.login 
      SET password = @password, updated_at = GETDATE()
      WHERE id = @id
    `;
    
    await executeQuery(query, { id, password: hashedPassword });
    return true;
  }
  
  /**
   * Delete user
   */
  static async delete(id) {
    const query = 'DELETE FROM dbo.login WHERE id = @id';
    const result = await executeQuery(query, { id });
    return result.rowsAffected[0] > 0;
  }
  
  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  /**
   * Update login attempts
   */
  static async updateLoginAttempts(username, attempts, lockedUntil = null) {
    const query = `
      UPDATE dbo.login 
      SET login_count = @attempts, locked_until = @lockedUntil, updated_at = GETDATE()
      WHERE username = @username
    `;
    
    await executeQuery(query, { username, attempts, lockedUntil });
  }
  
  /**
   * Update last login
   */
  static async updateLastLogin(username) {
    const query = `
      UPDATE dbo.login 
      SET last_login = GETDATE(), login_count = login_count + 1, account_locked = 0, locked_until = NULL, updated_at = GETDATE()
      WHERE username = @username
    `;
    
    await executeQuery(query, { username });
  }
  
  /**
   * Check if user account is locked
   */
  static isAccountLocked(user) {
    return !!(user.locked_until && new Date(user.locked_until) > new Date());
  }
  
  /**
   * Get user's allowed columns based on role and custom settings
   */
  static getAllowedColumns(user) {
    try {
      // Parse custom columns if they exist
      const customColumns = user.customColumns ? JSON.parse(user.customColumns) : null;
      
      if (customColumns && Array.isArray(customColumns)) {
        return customColumns;
      }
      
      // Fallback to role-based columns
      const roleColumnMapping = {
        'superadmin': ['*'], // Superadmin can see all columns
        'admin': ['*'], // Admin can see all columns
        'hr_general': [
          'employee_id', 'imip_id', 'name', 'gender', 'place_of_birth', 'date_of_birth', 
          'age', 'religion', 'nationality', 'blood_type', 'phone_number', 
          'emergency_contact_name', 'emergency_contact_phone', 'email', 'ktp_no', 
          'address', 'city', 'point_of_hire', 'point_of_origin', 'education', 
          'schedule_type', 'first_join_date_merdeka', 'transfer_merdeka', 
          'first_join_date', 'join_date', 'employment_status', 'end_contract', 
          'years_in_service', 'company_office', 'work_location', 'division', 
          'department', 'section', 'direct_report', 'job_title', 'position_grade', 
          'group_job_title', 'terminated_date', 'terminated_type', 'terminated_reason', 
          'blacklist_mti', 'blacklist_imip'
        ],
        'finance': [
          'employee_id', 'imip_id', 'name', 'gender', 'phone_number', 'email', 
          'address', 'point_of_hire', 'first_join_date', 'employment_status', 
          'company_office', 'work_location', 'division', 'department', 'section', 
          'direct_report', 'job_title', 'position_grade', 'group_job_title', 
          'bank_name', 'account_name', 'account_no', 'npwp'
        ],
        'dep_rep': [
          'employee_id', 'name', 'gender', 'tax_status', 'religion', 'nationality', 
          'blood_type', 'phone_number', 'email', 'point_of_hire', 'schedule_type', 
          'first_join_date', 'join_date', 'employment_status', 'end_contract', 
          'years_in_service', 'department', 'section', 'job_title', 'position_grade', 
          'bpjs_tk', 'bpjs_kes', 'terminated_date'
        ],
        'employee': [
          'employee_id', 'name', 'gender', 'phone_number', 'email', 'department', 
          'job_title', 'employment_status'
        ]
      };
      
      return roleColumnMapping[user.role] || roleColumnMapping['employee'];
    } catch (error) {
      console.error('Error parsing allowed columns:', error);
      // Return basic columns as fallback
      return ['employee_id', 'name', 'department', 'position'];
    }
  }
  
  /**
   * Check if user can view a specific row based on role and department
   */
  static canViewRow(user, employeeRow) {
    switch (user.role) {
      case 'superadmin':
      case 'admin':
      case 'hr_general':
        return true;
      case 'finance':
        return employeeRow.status === 'active';
      case 'dep_rep':
        return employeeRow.department === user.department;
      case 'employee':
        return employeeRow.employee_id === user.username;
      default:
        return false;
    }
  }
  
  /**
   * Sanitize user data for JSON response (remove sensitive fields)
   */
  static sanitizeUser(user) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.loginAttempts;
    delete sanitized.lockedUntil;
    
    // Parse customColumns if it exists
    if (sanitized.customColumns) {
      try {
        sanitized.customColumns = JSON.parse(sanitized.customColumns);
      } catch (e) {
        sanitized.customColumns = [];
      }
    }
    
    return sanitized;
  }
}

export default User;