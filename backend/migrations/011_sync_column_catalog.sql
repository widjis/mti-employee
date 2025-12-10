-- =====================================================
-- MTI Employee Management System - Sync Column Catalog with DB Schema
-- Migration: 011_sync_column_catalog.sql
-- Created: 2025-12-09
-- Purpose:
--  - Add missing dbo.column_catalog entries for columns present in DB
--  - Upsert Emp. ID display label for employee_id across child tables
--  - Remove stale catalog entries for non-existent columns
-- Notes: Idempotent; uses set-based inserts and guarded deletes
-- =====================================================

/* =====================================================
   Section A: Upsert Emp. ID for employee_id across employee_* tables
   ===================================================== */

DECLARE @EmpTables TABLE(name sysname);
INSERT INTO @EmpTables(name)
VALUES ('employee_bank'), ('employee_contact'), ('employee_core'),
       ('employee_employment'), ('employee_insurance'), ('employee_onboard'),
       ('employee_travel');

-- Update existing entries to desired label
UPDATE cat
   SET cat.display_label = 'Emp. ID'
  FROM dbo.column_catalog AS cat
  JOIN @EmpTables et ON et.name = cat.table_name
 WHERE cat.column_name = 'employee_id'
   AND (cat.display_label IS NULL OR cat.display_label <> 'Emp. ID');

-- Insert missing entries for employee_id
INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
SELECT et.name, 'employee_id', 'Emp. ID'
  FROM @EmpTables et
 WHERE NOT EXISTS (
   SELECT 1 FROM dbo.column_catalog c
    WHERE c.table_name = et.name AND c.column_name = 'employee_id'
 );
GO

/* =====================================================
   Section B: Insert catalog entries for missing columns in target tables
   - display_label defaults to snake_case with spaces (REPLACE)
   ===================================================== */

INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
SELECT t.name AS table_name,
       c.name AS column_name,
       REPLACE(c.name, '_', ' ') AS display_label
  FROM sys.tables t
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  JOIN sys.columns c ON c.object_id = t.object_id
  LEFT JOIN dbo.column_catalog cat
    ON cat.table_name = t.name AND cat.column_name = c.name
 WHERE s.name = 'dbo'
   AND t.name IN ('employee_bank','employee_contact','employee_core',
                  'employee_employment','employee_insurance','employee_onboard',
                  'employee_travel')
   AND cat.column_name IS NULL;
GO

/* =====================================================
   Section C: Remove stale catalog entries (columns not in DB anymore)
   ===================================================== */

DELETE cat
  FROM dbo.column_catalog cat
  LEFT JOIN sys.tables t ON t.name = cat.table_name
  LEFT JOIN sys.schemas s ON s.schema_id = t.schema_id
  LEFT JOIN sys.columns c ON c.object_id = t.object_id AND c.name = cat.column_name
 WHERE s.name = 'dbo'
   AND cat.table_name IN ('employee_bank','employee_contact','employee_core',
                          'employee_employment','employee_insurance','employee_onboard',
                          'employee_travel')
   AND c.name IS NULL;
GO