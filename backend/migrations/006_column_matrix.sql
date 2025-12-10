-- =====================================================
-- MTI Employee Management System - Column Visibility Matrix
-- Migration: 006_column_matrix.sql
-- Generated: ${GENERATED_AT}
-- Purpose: Create catalog of columns and role-based access matrix
-- Notes: Idempotent. No USE statement; relies on connection DB.
-- =====================================================

/* Create column catalog table */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'column_catalog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.column_catalog (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        table_name NVARCHAR(128) NOT NULL,
        column_name NVARCHAR(128) NOT NULL,
        display_label NVARCHAR(128) NULL,
        data_type NVARCHAR(64) NULL,
        is_exportable BIT NOT NULL DEFAULT 1,
        is_sensitive BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

/* Unique index to avoid duplicates per table/column */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'UX_column_catalog_table_column' AND object_id = OBJECT_ID('dbo.column_catalog')
)
BEGIN
    CREATE UNIQUE INDEX UX_column_catalog_table_column
        ON dbo.column_catalog (table_name, column_name);
END
GO

/* Create role-column access matrix table */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'role_column_access' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.role_column_access (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        role_id INT NOT NULL,
        column_id INT NOT NULL,
        can_view BIT NOT NULL DEFAULT 0,
        can_edit BIT NOT NULL DEFAULT 0,
        export_allowed BIT NOT NULL DEFAULT 0,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

/* Unique index to avoid duplicate matrix entries */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'UX_role_column_access_role_column' AND object_id = OBJECT_ID('dbo.role_column_access')
)
BEGIN
    CREATE UNIQUE INDEX UX_role_column_access_role_column
        ON dbo.role_column_access (role_id, column_id);
END
GO

/* Foreign key constraints to roles table (uses role_id) */
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'roles' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_role_column_access_roles' AND parent_object_id = OBJECT_ID('dbo.role_column_access')
    )
    BEGIN
        ALTER TABLE dbo.role_column_access
        ADD CONSTRAINT FK_role_column_access_roles
        FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE CASCADE;
    END
END
GO

/* Foreign key to column_catalog */
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_role_column_access_column' AND parent_object_id = OBJECT_ID('dbo.role_column_access')
)
BEGIN
    ALTER TABLE dbo.role_column_access
    ADD CONSTRAINT FK_role_column_access_column
    FOREIGN KEY (column_id) REFERENCES dbo.column_catalog(id) ON DELETE CASCADE;
END
GO

/* Helpful view to query role-column permissions */
IF NOT EXISTS (
    SELECT 1 FROM sys.views WHERE name = 'vw_role_column_access' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    EXEC('CREATE VIEW dbo.vw_role_column_access AS SELECT 1 AS placeholder');
END
GO

/* Replace view definition */
IF EXISTS (
    SELECT 1 FROM sys.views WHERE name = 'vw_role_column_access' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    EXEC('ALTER VIEW dbo.vw_role_column_access AS
        SELECT
            r.role_id AS role_id,
            r.role_name AS role_name,
            c.id AS column_id,
            c.table_name,
            c.column_name,
            c.display_label,
            c.data_type,
            c.is_exportable,
            c.is_sensitive,
            rca.can_view,
            rca.can_edit,
            rca.export_allowed
        FROM dbo.column_catalog c
        LEFT JOIN dbo.role_column_access rca ON rca.column_id = c.id
        LEFT JOIN dbo.roles r ON r.role_id = rca.role_id');
END
GO