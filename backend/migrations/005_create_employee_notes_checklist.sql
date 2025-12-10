-- =====================================================
-- MTI Employee Management System - Create Notes & Checklist Tables
-- Migration: 005_create_employee_notes_checklist.sql
-- Generated: 2025-12-08
-- Purpose: Create dbo.employee_notes and dbo.employee_checklist with minimal schema
-- =====================================================

-- NOTE: This script is idempotent and will only create tables if missing.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables 
    WHERE name = 'employee_notes' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.employee_notes (
        note_id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL,
        Batch NVARCHAR(255) NULL,
        CekDocumentNote NVARCHAR(255) NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_employee_notes_employee_id ON dbo.employee_notes(employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.tables 
    WHERE name = 'employee_checklist' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.employee_checklist (
        checklist_id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL,
        PasporChecklist BIT NULL,
        KITASChecklist BIT NULL,
        IMTAChecklist BIT NULL,
        RPTKAChecklist BIT NULL,
        NPWPChecklist BIT NULL,
        BPJSKESChecklist BIT NULL,
        BPJSTKChecklist BIT NULL,
        BankChecklist BIT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_employee_checklist_employee_id ON dbo.employee_checklist(employee_id);
END
GO