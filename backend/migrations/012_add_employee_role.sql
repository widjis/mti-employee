-- =====================================================
-- MTI Employee Management System - Add Employee Role
-- Migration: 012_add_employee_role.sql
-- Created: 2025-12-12
-- Purpose: Ensure 'employee' role exists and is active for RBAC
-- Notes: Idempotent. Does not assign any permissions by default.
-- =====================================================

-- Insert 'employee' role if missing; otherwise ensure it's active
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE LOWER(role_name) = 'employee')
BEGIN
    INSERT INTO dbo.roles (role_name, role_display_name, description, is_active)
    VALUES ('employee', 'Employee', 'Basic employee role', 1);
    PRINT 'Inserted employee role';
END
ELSE
BEGIN
    UPDATE dbo.roles
    SET is_active = 1, updated_at = GETDATE()
    WHERE LOWER(role_name) = 'employee' AND is_active = 0;
    PRINT 'Ensured employee role is active';
END
GO

-- No default permissions assigned. Role Matrix will manage grants.
PRINT '012_add_employee_role.sql completed successfully';
GO