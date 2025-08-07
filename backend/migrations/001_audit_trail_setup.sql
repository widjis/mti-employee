-- =====================================================
-- MTI Employee Management System - Audit Trail Setup
-- Migration: 001_audit_trail_setup.sql
-- Created: 2024-12-19
-- Purpose: Create comprehensive audit trail system
-- =====================================================

-- Enable SQL Server auditing features
USE [mti_employee_db];
GO

-- Create audit trail table for tracking all data changes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_trail')
BEGIN
    CREATE TABLE dbo.audit_trail (
        audit_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        table_name NVARCHAR(128) NOT NULL,
        record_id NVARCHAR(50) NOT NULL,
        operation_type NVARCHAR(10) NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values NVARCHAR(MAX) NULL,
        new_values NVARCHAR(MAX) NULL,
        changed_fields NVARCHAR(MAX) NULL,
        user_id NVARCHAR(50) NULL,
        user_role NVARCHAR(50) NULL,
        ip_address NVARCHAR(45) NULL,
        user_agent NVARCHAR(500) NULL,
        session_id NVARCHAR(128) NULL,
        timestamp DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        reason NVARCHAR(500) NULL,
        
        -- Indexes for performance
        INDEX IX_audit_trail_table_record (table_name, record_id),
        INDEX IX_audit_trail_timestamp (timestamp),
        INDEX IX_audit_trail_user (user_id),
        INDEX IX_audit_trail_operation (operation_type)
    );
    
    PRINT 'Created audit_trail table';
END
ELSE
    PRINT 'audit_trail table already exists';
GO

-- Create login attempts tracking table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'login_attempts')
BEGIN
    CREATE TABLE dbo.login_attempts (
        attempt_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL,
        ip_address NVARCHAR(45) NOT NULL,
        user_agent NVARCHAR(500) NULL,
        attempt_time DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        success BIT NOT NULL DEFAULT 0,
        failure_reason NVARCHAR(200) NULL,
        session_id NVARCHAR(128) NULL,
        
        -- Indexes for security monitoring
        INDEX IX_login_attempts_username_time (username, attempt_time),
        INDEX IX_login_attempts_ip_time (ip_address, attempt_time),
        INDEX IX_login_attempts_success (success, attempt_time)
    );
    
    PRINT 'Created login_attempts table';
END
ELSE
    PRINT 'login_attempts table already exists';
GO

-- Create user sessions table for session management
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_sessions')
BEGIN
    CREATE TABLE dbo.user_sessions (
        session_id NVARCHAR(128) PRIMARY KEY,
        user_id NVARCHAR(50) NOT NULL,
        username NVARCHAR(50) NOT NULL,
        ip_address NVARCHAR(45) NOT NULL,
        user_agent NVARCHAR(500) NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        last_activity DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        expires_at DATETIME2(3) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        logout_time DATETIME2(3) NULL,
        
        -- Indexes for session management
        INDEX IX_user_sessions_user_active (user_id, is_active),
        INDEX IX_user_sessions_expires (expires_at),
        INDEX IX_user_sessions_activity (last_activity)
    );
    
    PRINT 'Created user_sessions table';
END
ELSE
    PRINT 'user_sessions table already exists';
GO

-- Create system logs table for application-level logging
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_logs')
BEGIN
    CREATE TABLE dbo.system_logs (
        log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        level NVARCHAR(10) NOT NULL CHECK (level IN ('ERROR', 'WARN', 'INFO', 'DEBUG')),
        message NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(100) NULL,
        user_id NVARCHAR(50) NULL,
        ip_address NVARCHAR(45) NULL,
        request_id NVARCHAR(128) NULL,
        stack_trace NVARCHAR(MAX) NULL,
        additional_data NVARCHAR(MAX) NULL,
        timestamp DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        
        -- Indexes for log analysis
        INDEX IX_system_logs_level_time (level, timestamp),
        INDEX IX_system_logs_category_time (category, timestamp),
        INDEX IX_system_logs_user_time (user_id, timestamp)
    );
    
    PRINT 'Created system_logs table';
END
ELSE
    PRINT 'system_logs table already exists';
GO

-- Add audit columns to existing tables if they don't exist
-- Add to employee_core
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'created_at')
BEGIN
    ALTER TABLE dbo.employee_core ADD 
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_at DATETIME2(3) NULL,
        updated_by NVARCHAR(50) NULL,
        version_number INT NOT NULL DEFAULT 1;
    
    PRINT 'Added audit columns to employee_core';
END
ELSE
    PRINT 'Audit columns already exist in employee_core';
GO

-- Add to employee_contact
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_contact') AND name = 'created_at')
BEGIN
    ALTER TABLE dbo.employee_contact ADD 
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_at DATETIME2(3) NULL,
        updated_by NVARCHAR(50) NULL,
        version_number INT NOT NULL DEFAULT 1;
    
    PRINT 'Added audit columns to employee_contact';
END
ELSE
    PRINT 'Audit columns already exist in employee_contact';
GO

-- Add to employee_onboard
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_onboard') AND name = 'created_at')
BEGIN
    ALTER TABLE dbo.employee_onboard ADD 
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_at DATETIME2(3) NULL,
        updated_by NVARCHAR(50) NULL,
        version_number INT NOT NULL DEFAULT 1;
    
    PRINT 'Added audit columns to employee_onboard';
END
ELSE
    PRINT 'Audit columns already exist in employee_onboard';
GO

-- Add to login table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.login') AND name = 'created_at')
BEGIN
    ALTER TABLE dbo.login ADD 
        created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_at DATETIME2(3) NULL,
        updated_by NVARCHAR(50) NULL,
        last_login DATETIME2(3) NULL,
        login_count INT NOT NULL DEFAULT 0,
        account_locked BIT NOT NULL DEFAULT 0,
        locked_until DATETIME2(3) NULL,
        password_changed_at DATETIME2(3) NULL,
        must_change_password BIT NOT NULL DEFAULT 0;
    
    PRINT 'Added audit and security columns to login';
END
ELSE
    PRINT 'Audit columns already exist in login';
GO

-- Create stored procedure for logging audit trail
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_log_audit_trail')
    DROP PROCEDURE dbo.sp_log_audit_trail;
GO

CREATE PROCEDURE dbo.sp_log_audit_trail
    @table_name NVARCHAR(128),
    @record_id NVARCHAR(50),
    @operation_type NVARCHAR(10),
    @old_values NVARCHAR(MAX) = NULL,
    @new_values NVARCHAR(MAX) = NULL,
    @changed_fields NVARCHAR(MAX) = NULL,
    @user_id NVARCHAR(50) = NULL,
    @user_role NVARCHAR(50) = NULL,
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(500) = NULL,
    @session_id NVARCHAR(128) = NULL,
    @reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.audit_trail (
        table_name, record_id, operation_type, old_values, new_values, 
        changed_fields, user_id, user_role, ip_address, user_agent, 
        session_id, reason
    )
    VALUES (
        @table_name, @record_id, @operation_type, @old_values, @new_values,
        @changed_fields, @user_id, @user_role, @ip_address, @user_agent,
        @session_id, @reason
    );
END;
GO

PRINT 'Created sp_log_audit_trail stored procedure';
GO

-- Create stored procedure for logging login attempts
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_log_login_attempt')
    DROP PROCEDURE dbo.sp_log_login_attempt;
GO

CREATE PROCEDURE dbo.sp_log_login_attempt
    @username NVARCHAR(50),
    @ip_address NVARCHAR(45),
    @user_agent NVARCHAR(500) = NULL,
    @success BIT,
    @failure_reason NVARCHAR(200) = NULL,
    @session_id NVARCHAR(128) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.login_attempts (
        username, ip_address, user_agent, success, failure_reason, session_id
    )
    VALUES (
        @username, @ip_address, @user_agent, @success, @failure_reason, @session_id
    );
    
    -- Update login table statistics if successful
    IF @success = 1
    BEGIN
        UPDATE dbo.login 
        SET 
            last_login = GETDATE(),
            login_count = login_count + 1
        WHERE username = @username;
    END;
END;
GO

PRINT 'Created sp_log_login_attempt stored procedure';
GO

-- Create stored procedure for session management
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_manage_user_session')
    DROP PROCEDURE dbo.sp_manage_user_session;
GO

CREATE PROCEDURE dbo.sp_manage_user_session
    @action NVARCHAR(10), -- 'CREATE', 'UPDATE', 'LOGOUT', 'CLEANUP'
    @session_id NVARCHAR(128) = NULL,
    @user_id NVARCHAR(50) = NULL,
    @username NVARCHAR(50) = NULL,
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(500) = NULL,
    @expires_at DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @action = 'CREATE'
    BEGIN
        INSERT INTO dbo.user_sessions (
            session_id, user_id, username, ip_address, user_agent, expires_at
        )
        VALUES (
            @session_id, @user_id, @username, @ip_address, @user_agent, @expires_at
        );
    END
    ELSE IF @action = 'UPDATE'
    BEGIN
        UPDATE dbo.user_sessions 
        SET last_activity = GETDATE()
        WHERE session_id = @session_id AND is_active = 1;
    END
    ELSE IF @action = 'LOGOUT'
    BEGIN
        UPDATE dbo.user_sessions 
        SET 
            is_active = 0,
            logout_time = GETDATE()
        WHERE session_id = @session_id;
    END
    ELSE IF @action = 'CLEANUP'
    BEGIN
        -- Mark expired sessions as inactive
        UPDATE dbo.user_sessions 
        SET is_active = 0
        WHERE expires_at < GETDATE() AND is_active = 1;
        
        -- Delete old session records (older than 30 days)
        DELETE FROM dbo.user_sessions 
        WHERE created_at < DATEADD(DAY, -30, GETDATE());
    END;
END;
GO

PRINT 'Created sp_manage_user_session stored procedure';
GO

-- Create stored procedure for system logging
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_log_system_event')
    DROP PROCEDURE dbo.sp_log_system_event;
GO

CREATE PROCEDURE dbo.sp_log_system_event
    @level NVARCHAR(10),
    @message NVARCHAR(MAX),
    @category NVARCHAR(100) = NULL,
    @user_id NVARCHAR(50) = NULL,
    @ip_address NVARCHAR(45) = NULL,
    @request_id NVARCHAR(128) = NULL,
    @stack_trace NVARCHAR(MAX) = NULL,
    @additional_data NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO dbo.system_logs (
        level, message, category, user_id, ip_address, 
        request_id, stack_trace, additional_data
    )
    VALUES (
        @level, @message, @category, @user_id, @ip_address,
        @request_id, @stack_trace, @additional_data
    );
END;
GO

PRINT 'Created sp_log_system_event stored procedure';
GO

-- Create view for audit trail reporting
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_audit_trail_report')
    DROP VIEW dbo.vw_audit_trail_report;
GO

CREATE VIEW dbo.vw_audit_trail_report
AS
SELECT 
    at.audit_id,
    at.table_name,
    at.record_id,
    at.operation_type,
    at.user_id,
    l.username,
    at.user_role,
    at.ip_address,
    at.timestamp,
    at.reason,
    at.changed_fields,
    CASE 
        WHEN at.table_name = 'employee_core' THEN ec.name
        ELSE 'N/A'
    END as affected_employee_name
FROM dbo.audit_trail at
LEFT JOIN dbo.login l ON at.user_id = l.user_id
LEFT JOIN dbo.employee_core ec ON at.table_name = 'employee_core' AND at.record_id = ec.employee_id;
GO

PRINT 'Created vw_audit_trail_report view';
GO

-- Create cleanup job for old audit data
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_cleanup_audit_data')
    DROP PROCEDURE dbo.sp_cleanup_audit_data;
GO

CREATE PROCEDURE dbo.sp_cleanup_audit_data
    @retention_days INT = 365
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @cutoff_date DATETIME2(3) = DATEADD(DAY, -@retention_days, GETDATE());
    DECLARE @deleted_count INT;
    
    -- Clean up old audit trail records
    DELETE FROM dbo.audit_trail WHERE timestamp < @cutoff_date;
    SET @deleted_count = @@ROWCOUNT;
    
    -- Log the cleanup operation
    EXEC dbo.sp_log_system_event 
        @level = 'INFO',
        @message = 'Audit trail cleanup completed',
        @category = 'MAINTENANCE',
        @additional_data = CONCAT('Deleted ', @deleted_count, ' records older than ', @retention_days, ' days');
    
    -- Clean up old login attempts (keep 90 days)
    DELETE FROM dbo.login_attempts WHERE attempt_time < DATEADD(DAY, -90, GETDATE());
    
    -- Clean up old system logs (keep 180 days)
    DELETE FROM dbo.system_logs WHERE timestamp < DATEADD(DAY, -180, GETDATE());
    
    -- Clean up expired sessions
    EXEC dbo.sp_manage_user_session @action = 'CLEANUP';
END;
GO

PRINT 'Created sp_cleanup_audit_data stored procedure';
GO

-- Create triggers for automatic audit trail logging
-- Trigger for employee_core
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_employee_core_audit')
    DROP TRIGGER dbo.tr_employee_core_audit;
GO

CREATE TRIGGER dbo.tr_employee_core_audit
ON dbo.employee_core
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @operation NVARCHAR(10);
    DECLARE @user_id NVARCHAR(50) = CAST(SESSION_CONTEXT(N'user_id') AS NVARCHAR(50));
    DECLARE @user_role NVARCHAR(50) = CAST(SESSION_CONTEXT(N'user_role') AS NVARCHAR(50));
    
    -- Determine operation type
    IF EXISTS(SELECT * FROM inserted) AND EXISTS(SELECT * FROM deleted)
        SET @operation = 'UPDATE';
    ELSE IF EXISTS(SELECT * FROM inserted)
        SET @operation = 'INSERT';
    ELSE
        SET @operation = 'DELETE';
    
    -- Log for INSERT operations
    IF @operation = 'INSERT'
    BEGIN
        INSERT INTO dbo.audit_trail (table_name, record_id, operation_type, new_values, user_id, user_role)
        SELECT 
            'employee_core',
            employee_id,
            'INSERT',
            CONCAT('name:', name, ';gender:', gender, ';date_of_birth:', date_of_birth),
            @user_id,
            @user_role
        FROM inserted;
    END
    
    -- Log for UPDATE operations
    IF @operation = 'UPDATE'
    BEGIN
        INSERT INTO dbo.audit_trail (table_name, record_id, operation_type, old_values, new_values, user_id, user_role)
        SELECT 
            'employee_core',
            i.employee_id,
            'UPDATE',
            CONCAT('name:', d.name, ';gender:', d.gender, ';date_of_birth:', d.date_of_birth),
            CONCAT('name:', i.name, ';gender:', i.gender, ';date_of_birth:', i.date_of_birth),
            @user_id,
            @user_role
        FROM inserted i
        INNER JOIN deleted d ON i.employee_id = d.employee_id;
    END
    
    -- Log for DELETE operations
    IF @operation = 'DELETE'
    BEGIN
        INSERT INTO dbo.audit_trail (table_name, record_id, operation_type, old_values, user_id, user_role)
        SELECT 
            'employee_core',
            employee_id,
            'DELETE',
            CONCAT('name:', name, ';gender:', gender, ';date_of_birth:', date_of_birth),
            @user_id,
            @user_role
        FROM deleted;
    END
END;
GO

PRINT 'Created tr_employee_core_audit trigger';
GO

-- Grant necessary permissions
GRANT SELECT, INSERT ON dbo.audit_trail TO [public];
GRANT SELECT, INSERT ON dbo.login_attempts TO [public];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.user_sessions TO [public];
GRANT SELECT, INSERT ON dbo.system_logs TO [public];
GRANT EXECUTE ON dbo.sp_log_audit_trail TO [public];
GRANT EXECUTE ON dbo.sp_log_login_attempt TO [public];
GRANT EXECUTE ON dbo.sp_manage_user_session TO [public];
GRANT EXECUTE ON dbo.sp_log_system_event TO [public];
GRANT SELECT ON dbo.vw_audit_trail_report TO [public];
GO

PRINT 'Granted permissions for audit trail system';
GO

-- Insert initial system log entry
EXEC dbo.sp_log_system_event 
    @level = 'INFO',
    @message = 'Audit trail system initialized successfully',
    @category = 'SYSTEM_INIT';
GO

PRINT '=============================================';
PRINT 'MTI Employee Management System';
PRINT 'Audit Trail Setup - COMPLETED SUCCESSFULLY';
PRINT '=============================================';
PRINT 'Created tables: audit_trail, login_attempts, user_sessions, system_logs';
PRINT 'Created procedures: sp_log_audit_trail, sp_log_login_attempt, sp_manage_user_session, sp_log_system_event, sp_cleanup_audit_data';
PRINT 'Created views: vw_audit_trail_report';
PRINT 'Created triggers: tr_employee_core_audit';
PRINT 'Added audit columns to existing tables';
PRINT '=============================================';
GO