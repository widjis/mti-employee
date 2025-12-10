-- =====================================================
-- MTI Employee Management System - Locality Status update
-- Migration: 007_locality_employee_status.sql
-- Revised: 2025-12-09T10:55:00+08:00
-- Purpose:
--  1) Add locality_status column to core employee table
--  2) Register column in column_catalog for role-based visibility/export
-- Notes: Idempotent, uses SQL Server system catalogs.
-- =====================================================

/* Add locality_status to dbo.employee_core */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'locality_status'
)
BEGIN
    ALTER TABLE dbo.employee_core ADD locality_status NVARCHAR(64) NULL;
END
GO

/* Register locality_status in column_catalog for visibility/export */
IF NOT EXISTS (
    SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_core' AND column_name = 'locality_status'
)
BEGIN
    INSERT INTO dbo.column_catalog (table_name, column_name, display_label, data_type)
    VALUES ('employee_core', 'locality_status', 'Locality Status', 'NVARCHAR(64)');
END
GO