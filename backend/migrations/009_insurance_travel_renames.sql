-- =====================================================
-- MTI Employee Management System - Column Renames (Insurance & Travel)
-- Migration: 009_insurance_travel_renames.sql
-- Created: 2025-12-09
-- Purpose:
--  - Align DB column names with Excel mappings and column_catalog labels
--  - Rename legacy mixed-case columns to snake_case
--  - Update column_catalog display labels accordingly
-- Notes: Idempotent. Uses guards to avoid duplicate operations.
-- =====================================================

/* =====================================================
   Section A: Rename columns to snake_case
   ===================================================== */

-- employee_insurance: SocialInsuranceNoaltBPJSTK -> social_insurance_no_alt
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'SocialInsuranceNoaltBPJSTK')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'social_insurance_no_alt')
BEGIN
    EXEC sp_rename 'dbo.employee_insurance.SocialInsuranceNoaltBPJSTK', 'social_insurance_no_alt', 'COLUMN';
END
GO

-- employee_insurance: BPJSKesehatanNoaltBPJSKES -> bpjs_kes_no_alt
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'BPJSKesehatanNoaltBPJSKES')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'bpjs_kes_no_alt')
BEGIN
    EXEC sp_rename 'dbo.employee_insurance.BPJSKesehatanNoaltBPJSKES', 'bpjs_kes_no_alt', 'COLUMN';
END
GO

-- employee_travel: NameasPasport -> name_as_passport
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'NameasPasport')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'name_as_passport')
BEGIN
    EXEC sp_rename 'dbo.employee_travel.NameasPasport', 'name_as_passport', 'COLUMN';
END
GO

-- employee_travel: JobTittleBasedonKITAS -> job_title_kitas
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'JobTittleBasedonKITAS')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'job_title_kitas')
BEGIN
    EXEC sp_rename 'dbo.employee_travel.JobTittleBasedonKITAS', 'job_title_kitas', 'COLUMN';
END
GO

/* =====================================================
   Section B: Upsert column_catalog display labels for renamed columns
   Table: dbo.column_catalog(table_name, column_name, display_label)
   ===================================================== */

-- employee_insurance.social_insurance_no_alt
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'SocialInsuranceNoaltBPJSTK')
BEGIN
    UPDATE dbo.column_catalog
       SET column_name = 'social_insurance_no_alt',
           display_label = 'Social Insurance No (alt BPJS TK)'
     WHERE table_name = 'employee_insurance'
       AND column_name = 'SocialInsuranceNoaltBPJSTK';
END
ELSE IF NOT EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'social_insurance_no_alt')
BEGIN
    INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
    VALUES ('employee_insurance', 'social_insurance_no_alt', 'Social Insurance No (alt BPJS TK)');
END
GO

-- employee_insurance.bpjs_kes_no_alt
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'BPJSKesehatanNoaltBPJSKES')
BEGIN
    UPDATE dbo.column_catalog
       SET column_name = 'bpjs_kes_no_alt',
           display_label = 'BPJS Kesehatan No (alt BPJS KES)'
     WHERE table_name = 'employee_insurance'
       AND column_name = 'BPJSKesehatanNoaltBPJSKES';
END
ELSE IF NOT EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'bpjs_kes_no_alt')
BEGIN
    INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
    VALUES ('employee_insurance', 'bpjs_kes_no_alt', 'BPJS Kesehatan No (alt BPJS KES)');
END
GO

-- employee_travel.name_as_passport
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'NameasPasport')
BEGIN
    UPDATE dbo.column_catalog
       SET column_name = 'name_as_passport',
           display_label = 'Name as Pasport'
     WHERE table_name = 'employee_travel'
       AND column_name = 'NameasPasport';
END
ELSE IF NOT EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'name_as_passport')
BEGIN
    INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
    VALUES ('employee_travel', 'name_as_passport', 'Name as Pasport');
END
GO

-- employee_travel.job_title_kitas
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'JobTittleBasedonKITAS')
BEGIN
    UPDATE dbo.column_catalog
       SET column_name = 'job_title_kitas',
           display_label = 'Job Tittle (Based on KITAS)'
     WHERE table_name = 'employee_travel'
       AND column_name = 'JobTittleBasedonKITAS';
END
ELSE IF NOT EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'job_title_kitas')
BEGIN
    INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
    VALUES ('employee_travel', 'job_title_kitas', 'Job Tittle (Based on KITAS)');
END
GO