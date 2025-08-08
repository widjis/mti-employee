-- =====================================================
-- MTI Employee Management System - Add Authentication Type
-- Migration: 003_add_auth_type_column.sql
-- Created: 2025-01-27
-- Purpose: Add authentication type column for LDAP/AD integration
-- =====================================================

USE [MTIMasterEmployeeDB];
GO

-- Add auth_type column to login table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.login') AND name = 'auth_type')
BEGIN
    ALTER TABLE dbo.login ADD 
        auth_type NVARCHAR(20) NOT NULL DEFAULT 'local' CHECK (auth_type IN ('local', 'domain')),
        domain_username NVARCHAR(100) NULL,
        last_domain_sync DATETIME2(3) NULL;
    
    PRINT 'Added authentication type columns to login table';
END
ELSE
    PRINT 'Authentication type columns already exist in login table';
GO

-- Create index for domain authentication lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_login_domain_username')
BEGIN
    CREATE INDEX IX_login_domain_username ON dbo.login (domain_username, auth_type);
    PRINT 'Created index for domain username lookups';
END
ELSE
    PRINT 'Domain username index already exists';
GO

-- Update existing users to have 'local' auth_type (if not already set)
UPDATE dbo.login 
SET auth_type = 'local' 
WHERE auth_type IS NULL OR auth_type = '';

PRINT 'Updated existing users to local authentication type';
GO

PRINT 'Migration 003_add_auth_type_column.sql completed successfully';
GO