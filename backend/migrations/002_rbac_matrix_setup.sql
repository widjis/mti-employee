-- =====================================================
-- MTI Employee Management System - RBAC Matrix Setup
-- Migration: 002_rbac_matrix_setup.sql
-- Created: 2025-01-27
-- Purpose: Create role-based access control matrix
-- =====================================================

USE [mti_employee_db];
GO

-- Create roles table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles')
BEGIN
    CREATE TABLE dbo.roles (
        role_id INT IDENTITY(1,1) PRIMARY KEY,
        role_name NVARCHAR(50) NOT NULL UNIQUE,
        role_display_name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        
        INDEX IX_roles_name (role_name),
        INDEX IX_roles_active (is_active)
    );
    
    PRINT 'Created roles table';
END
ELSE
    PRINT 'roles table already exists';
GO

-- Create permissions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'permissions')
BEGIN
    CREATE TABLE dbo.permissions (
        permission_id INT IDENTITY(1,1) PRIMARY KEY,
        module_name NVARCHAR(50) NOT NULL,
        action_name NVARCHAR(50) NOT NULL,
        permission_key NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        
        INDEX IX_permissions_module (module_name),
        INDEX IX_permissions_key (permission_key),
        INDEX IX_permissions_active (is_active)
    );
    
    PRINT 'Created permissions table';
END
ELSE
    PRINT 'permissions table already exists';
GO

-- Create role_permissions junction table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'role_permissions')
BEGIN
    CREATE TABLE dbo.role_permissions (
        role_permission_id INT IDENTITY(1,1) PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        granted_by NVARCHAR(50) NULL,
        granted_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        
        FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES dbo.permissions(permission_id) ON DELETE CASCADE,
        
        UNIQUE (role_id, permission_id),
        INDEX IX_role_permissions_role (role_id),
        INDEX IX_role_permissions_permission (permission_id)
    );
    
    PRINT 'Created role_permissions table';
END
ELSE
    PRINT 'role_permissions table already exists';
GO

-- Insert default roles
IF NOT EXISTS (SELECT * FROM dbo.roles WHERE role_name = 'superadmin')
BEGIN
    INSERT INTO dbo.roles (role_name, role_display_name, description) VALUES
    ('superadmin', 'Super Administrator', 'Full system access with all permissions'),
    ('admin', 'Administrator', 'Administrative access with most permissions'),
    ('hr_general', 'HR General', 'Human Resources general access'),
    ('finance', 'Finance', 'Finance department access'),
    ('dep_rep', 'Department Representative', 'Department representative access');
    
    PRINT 'Inserted default roles';
END
ELSE
    PRINT 'Default roles already exist';
GO

-- Insert default permissions
IF NOT EXISTS (SELECT * FROM dbo.permissions WHERE permission_key = 'employees.view')
BEGIN
    INSERT INTO dbo.permissions (module_name, action_name, permission_key, description) VALUES
    -- Employee module permissions
    ('employees', 'view', 'employees.view', 'View employee records'),
    ('employees', 'create', 'employees.create', 'Create new employee records'),
    ('employees', 'edit', 'employees.edit', 'Edit existing employee records'),
    ('employees', 'delete', 'employees.delete', 'Delete employee records'),
    ('employees', 'export', 'employees.export', 'Export employee data'),
    ('employees', 'import', 'employees.import', 'Import employee data'),
    
    -- User management permissions
    ('users', 'view', 'users.view', 'View user accounts'),
    ('users', 'create', 'users.create', 'Create new user accounts'),
    ('users', 'edit', 'users.edit', 'Edit existing user accounts'),
    ('users', 'delete', 'users.delete', 'Delete user accounts'),
    ('users', 'manage_roles', 'users.manage_roles', 'Manage user roles and permissions'),
    
    -- Reports module permissions
    ('reports', 'view', 'reports.view', 'View reports'),
    ('reports', 'create', 'reports.create', 'Create custom reports'),
    ('reports', 'export', 'reports.export', 'Export reports'),
    ('reports', 'schedule', 'reports.schedule', 'Schedule automated reports'),
    
    -- System module permissions
    ('system', 'view_logs', 'system.view_logs', 'View system logs'),
    ('system', 'manage_settings', 'system.manage_settings', 'Manage system settings'),
    ('system', 'backup', 'system.backup', 'Perform system backups'),
    ('system', 'maintenance', 'system.maintenance', 'Perform system maintenance'),
    ('system', 'audit_trail', 'system.audit_trail', 'View audit trail'),
    
    -- OpenProject integration permissions
    ('openproject', 'sync', 'openproject.sync', 'Sync with OpenProject'),
    ('openproject', 'manage', 'openproject.manage', 'Manage OpenProject integration');
    
    PRINT 'Inserted default permissions';
END
ELSE
    PRINT 'Default permissions already exist';
GO

-- Assign permissions to roles
IF NOT EXISTS (SELECT * FROM dbo.role_permissions rp 
               INNER JOIN dbo.roles r ON rp.role_id = r.role_id 
               WHERE r.role_name = 'superadmin')
BEGIN
    -- Superadmin gets all permissions
    INSERT INTO dbo.role_permissions (role_id, permission_id, granted_by)
    SELECT r.role_id, p.permission_id, 'SYSTEM'
    FROM dbo.roles r
    CROSS JOIN dbo.permissions p
    WHERE r.role_name = 'superadmin';
    
    -- Admin gets most permissions (excluding some system-level ones)
    INSERT INTO dbo.role_permissions (role_id, permission_id, granted_by)
    SELECT r.role_id, p.permission_id, 'SYSTEM'
    FROM dbo.roles r
    INNER JOIN dbo.permissions p ON p.permission_key NOT IN (
        'system.backup', 'system.maintenance', 'users.manage_roles'
    )
    WHERE r.role_name = 'admin';
    
    -- HR General permissions
    INSERT INTO dbo.role_permissions (role_id, permission_id, granted_by)
    SELECT r.role_id, p.permission_id, 'SYSTEM'
    FROM dbo.roles r
    INNER JOIN dbo.permissions p ON p.permission_key IN (
        'employees.view', 'employees.create', 'employees.edit', 'employees.export',
        'reports.view', 'reports.export', 'openproject.sync'
    )
    WHERE r.role_name = 'hr_general';
    
    -- Finance permissions
    INSERT INTO dbo.role_permissions (role_id, permission_id, granted_by)
    SELECT r.role_id, p.permission_id, 'SYSTEM'
    FROM dbo.roles r
    INNER JOIN dbo.permissions p ON p.permission_key IN (
        'employees.view', 'employees.export', 'reports.view', 'reports.export'
    )
    WHERE r.role_name = 'finance';
    
    -- Department Representative permissions
    INSERT INTO dbo.role_permissions (role_id, permission_id, granted_by)
    SELECT r.role_id, p.permission_id, 'SYSTEM'
    FROM dbo.roles r
    INNER JOIN dbo.permissions p ON p.permission_key IN (
        'employees.view', 'reports.view'
    )
    WHERE r.role_name = 'dep_rep';
    
    PRINT 'Assigned permissions to roles';
END
ELSE
    PRINT 'Role permissions already assigned';
GO

-- Create view for easy role-permission lookup
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_role_permissions')
    DROP VIEW dbo.vw_role_permissions;
GO

CREATE VIEW dbo.vw_role_permissions AS
SELECT 
    r.role_name,
    r.role_display_name,
    p.module_name,
    p.action_name,
    p.permission_key,
    p.description as permission_description,
    rp.granted_at,
    rp.granted_by
FROM dbo.role_permissions rp
INNER JOIN dbo.roles r ON rp.role_id = r.role_id
INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
WHERE r.is_active = 1 AND p.is_active = 1;
GO

PRINT 'Created vw_role_permissions view';
GO

-- Create stored procedure to check user permissions
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_check_user_permission')
    DROP PROCEDURE dbo.sp_check_user_permission;
GO

CREATE PROCEDURE dbo.sp_check_user_permission
    @username NVARCHAR(50),
    @permission_key NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @has_permission BIT = 0;
    
    SELECT @has_permission = 1
    FROM dbo.login l
    INNER JOIN dbo.roles r ON l.Role = r.role_name
    INNER JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
    INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
    WHERE l.username = @username 
      AND p.permission_key = @permission_key
      AND r.is_active = 1 
      AND p.is_active = 1;
    
    SELECT @has_permission as has_permission;
END;
GO

PRINT 'Created sp_check_user_permission stored procedure';
GO

-- Grant necessary permissions
GRANT SELECT ON dbo.roles TO [public];
GRANT SELECT ON dbo.permissions TO [public];
GRANT SELECT ON dbo.role_permissions TO [public];
GRANT SELECT ON dbo.vw_role_permissions TO [public];
GRANT EXECUTE ON dbo.sp_check_user_permission TO [public];
GO

PRINT 'RBAC Matrix Setup - COMPLETED SUCCESSFULLY';
GO