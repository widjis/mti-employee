-- =====================================================
-- MTI Employee Management System - Comben Column Additions
-- Migration: 004_comben_columns.sql
-- Generated: 2025-12-08T05:56:10.706Z
-- Purpose: Add new columns from Comben assignment workbook
-- =====================================================

-- NOTE: This script is idempotent and will only add missing columns.
--       It assumes connection DB is set via environment; no USE statement.

-- Table: dbo.employee_core

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'BranchID')
BEGIN
    ALTER TABLE dbo.employee_core ADD BranchID NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'Branch')
BEGIN
    ALTER TABLE dbo.employee_core ADD Branch NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'OfficeEmail')
BEGIN
    ALTER TABLE dbo.employee_core ADD OfficeEmail NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'MonthofBirthday')
BEGIN
    ALTER TABLE dbo.employee_core ADD MonthofBirthday NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'IDCARDMTI')
BEGIN
    ALTER TABLE dbo.employee_core ADD IDCARDMTI BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'Field')
BEGIN
    ALTER TABLE dbo.employee_core ADD Field NVARCHAR(255) NULL;
END
GO

-- Table: dbo.employee_insurance

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'SocialInsuranceNoaltBPJSTK')
BEGIN
    ALTER TABLE dbo.employee_insurance ADD SocialInsuranceNoaltBPJSTK NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'BPJSKesehatanNoaltBPJSKES')
BEGIN
    ALTER TABLE dbo.employee_insurance ADD BPJSKesehatanNoaltBPJSKES NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'FPGNo')
BEGIN
    ALTER TABLE dbo.employee_insurance ADD FPGNo NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'OWLEXANo')
BEGIN
    ALTER TABLE dbo.employee_insurance ADD OWLEXANo NVARCHAR(255) NULL;
END
GO

-- Table: dbo.employee_bank

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_bank') AND name = 'BankCode')
BEGIN
    ALTER TABLE dbo.employee_bank ADD BankCode NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_bank') AND name = 'ICBCBankAccountNo')
BEGIN
    ALTER TABLE dbo.employee_bank ADD ICBCBankAccountNo NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_bank') AND name = 'ICBCUsername')
BEGIN
    ALTER TABLE dbo.employee_bank ADD ICBCUsername NVARCHAR(255) NULL;
END
GO

-- Table: dbo.employee_travel

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'NameasPasport')
BEGIN
    ALTER TABLE dbo.employee_travel ADD NameasPasport NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'PassportExpiry')
BEGIN
    ALTER TABLE dbo.employee_travel ADD PassportExpiry DATETIME2(3) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'KITASExpiry')
BEGIN
    ALTER TABLE dbo.employee_travel ADD KITASExpiry DATETIME2(3) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'IMTA')
BEGIN
    ALTER TABLE dbo.employee_travel ADD IMTA NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'RPTKANo')
BEGIN
    ALTER TABLE dbo.employee_travel ADD RPTKANo NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'RPTKAPosition')
BEGIN
    ALTER TABLE dbo.employee_travel ADD RPTKAPosition NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'KITASAddress')
BEGIN
    ALTER TABLE dbo.employee_travel ADD KITASAddress NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'JobTittleBasedonKITAS')
BEGIN
    ALTER TABLE dbo.employee_travel ADD JobTittleBasedonKITAS NVARCHAR(255) NULL;
END
GO

-- Table: dbo.employee_notes

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_notes') AND name = 'Batch')
BEGIN
    ALTER TABLE dbo.employee_notes ADD Batch NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_notes') AND name = 'CekDocumentNote')
BEGIN
    ALTER TABLE dbo.employee_notes ADD CekDocumentNote NVARCHAR(255) NULL;
END
GO

-- Table: dbo.employee_checklist

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'PasporChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD PasporChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'KITASChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD KITASChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'IMTAChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD IMTAChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'RPTKAChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD RPTKAChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'NPWPChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD NPWPChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'BPJSKESChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD BPJSKESChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'BPJSTKChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD BPJSTKChecklist BIT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_checklist') AND name = 'BankChecklist')
BEGIN
    ALTER TABLE dbo.employee_checklist ADD BankChecklist BIT NULL;
END
GO
