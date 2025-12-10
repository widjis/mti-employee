-- =====================================================
-- MTI Employee Management System - Employee FK & Status Updates
-- Migration: 008_employee_fk_status.sql
-- Created: 2025-12-09
-- Purpose:
--  1) Add employee_id to child tables and create FKs to dbo.employee_core(employee_id)
--  2) Add employment_status to dbo.employee_employment with default and CHECK constraint
--  3) Move locality_status from dbo.employee_core to dbo.employee_employment and backfill
-- Notes: Idempotent. Uses SQL Server system catalogs to guard operations.
-- =====================================================

/* =====================================================
   Section A: Ensure employee_id column exists in child tables (nullable for safe rollout)
   Tables: employee_bank, employee_contact, employee_employment, employee_insurance, employee_onboard, employee_travel
   ===================================================== */

/* employee_bank */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_bank') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_bank ADD employee_id VARCHAR(20) NULL;
END
GO

/* employee_contact */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_contact') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_contact ADD employee_id VARCHAR(20) NULL;
END
GO

/* employee_employment */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_employment') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_employment ADD employee_id VARCHAR(20) NULL;
END
GO

/* employee_insurance */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_insurance') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_insurance ADD employee_id VARCHAR(20) NULL;
END
GO

/* employee_onboard */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_onboard') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_onboard ADD employee_id VARCHAR(20) NULL;
END
GO

/* employee_travel */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_travel') AND name = 'employee_id'
)
BEGIN
    ALTER TABLE dbo.employee_travel ADD employee_id VARCHAR(20) NULL;
END
GO

/* =====================================================
   Section B: Create nonclustered indexes on employee_id for lookups
   ===================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_bank_employee_id' AND object_id = OBJECT_ID('dbo.employee_bank')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_bank_employee_id ON dbo.employee_bank (employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_contact_employee_id' AND object_id = OBJECT_ID('dbo.employee_contact')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_contact_employee_id ON dbo.employee_contact (employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_employment_employee_id' AND object_id = OBJECT_ID('dbo.employee_employment')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_employment_employee_id ON dbo.employee_employment (employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_insurance_employee_id' AND object_id = OBJECT_ID('dbo.employee_insurance')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_insurance_employee_id ON dbo.employee_insurance (employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_onboard_employee_id' AND object_id = OBJECT_ID('dbo.employee_onboard')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_onboard_employee_id ON dbo.employee_onboard (employee_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_employee_travel_employee_id' AND object_id = OBJECT_ID('dbo.employee_travel')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_employee_travel_employee_id ON dbo.employee_travel (employee_id);
END
GO

/* =====================================================
   Section C: Add FKs from child tables to dbo.employee_core(employee_id)
   Policy: ON DELETE NO ACTION, ON UPDATE NO ACTION
   Note: USING WITH NOCHECK to avoid blocking on existing data, then enable constraint
   ===================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_bank_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_bank')
)
BEGIN
    ALTER TABLE dbo.employee_bank WITH NOCHECK
    ADD CONSTRAINT FK_employee_bank_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_bank CHECK CONSTRAINT FK_employee_bank_employee_core_employee_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_contact_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_contact')
)
BEGIN
    ALTER TABLE dbo.employee_contact WITH NOCHECK
    ADD CONSTRAINT FK_employee_contact_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_contact CHECK CONSTRAINT FK_employee_contact_employee_core_employee_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_employment_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_employment')
)
BEGIN
    ALTER TABLE dbo.employee_employment WITH NOCHECK
    ADD CONSTRAINT FK_employee_employment_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_employment CHECK CONSTRAINT FK_employee_employment_employee_core_employee_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_insurance_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_insurance')
)
BEGIN
    ALTER TABLE dbo.employee_insurance WITH NOCHECK
    ADD CONSTRAINT FK_employee_insurance_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_insurance CHECK CONSTRAINT FK_employee_insurance_employee_core_employee_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_onboard_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_onboard')
)
BEGIN
    ALTER TABLE dbo.employee_onboard WITH NOCHECK
    ADD CONSTRAINT FK_employee_onboard_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_onboard CHECK CONSTRAINT FK_employee_onboard_employee_core_employee_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_employee_travel_employee_core_employee_id' AND parent_object_id = OBJECT_ID('dbo.employee_travel')
)
BEGIN
    ALTER TABLE dbo.employee_travel WITH NOCHECK
    ADD CONSTRAINT FK_employee_travel_employee_core_employee_id
    FOREIGN KEY (employee_id) REFERENCES dbo.employee_core(employee_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE dbo.employee_travel CHECK CONSTRAINT FK_employee_travel_employee_core_employee_id;
END
GO

/* =====================================================
   Section D: employment_status in dbo.employee_employment
   - Add column
   - Backfill defaults to 'active'
   - Add DEFAULT constraint
   - Set NOT NULL
   - Add CHECK constraint enforcing allowed values
   ===================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_employment') AND name = 'employment_status'
)
BEGIN
    ALTER TABLE dbo.employee_employment ADD employment_status VARCHAR(30) NULL;
END
GO

/* Backfill NULLs to 'active' */
UPDATE dbo.employee_employment SET employment_status = 'active' WHERE employment_status IS NULL;
GO

/* DEFAULT constraint */
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints WHERE name = 'DF_employee_employment_employment_status' AND parent_object_id = OBJECT_ID('dbo.employee_employment')
)
BEGIN
    ALTER TABLE dbo.employee_employment
    ADD CONSTRAINT DF_employee_employment_employment_status DEFAULT('active') FOR employment_status;
END
GO

/* Set NOT NULL */
ALTER TABLE dbo.employee_employment ALTER COLUMN employment_status VARCHAR(30) NOT NULL;
GO

/* CHECK constraint for vocabulary */
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_employee_employment_employment_status' AND parent_object_id = OBJECT_ID('dbo.employee_employment')
)
BEGIN
    ALTER TABLE dbo.employee_employment WITH NOCHECK
    ADD CONSTRAINT CHK_employee_employment_employment_status
    CHECK (employment_status IN ('active','probation','contract','intern','non_active','terminated','retired','suspended'));
    ALTER TABLE dbo.employee_employment CHECK CONSTRAINT CHK_employee_employment_employment_status;
END
GO

/* =====================================================
   Section E: Move locality_status from core to employment and backfill
   ===================================================== */

/* Add locality_status to employee_employment */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_employment') AND name = 'locality_status'
)
BEGIN
    ALTER TABLE dbo.employee_employment ADD locality_status VARCHAR(20) NULL;
END
GO

/* Backfill from core where available (use dynamic SQL to avoid compile-time errors) */
IF EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'locality_status'
)
BEGIN
    EXEC sp_executesql N'
        UPDATE ee
        SET ee.locality_status = ec.locality_status
        FROM dbo.employee_employment ee
        INNER JOIN dbo.employee_core ec ON ee.employee_id = ec.employee_id
        WHERE ee.locality_status IS NULL AND ec.locality_status IS NOT NULL;
    ';
END
GO

/* Register locality_status in column_catalog under employee_employment */
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'column_catalog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_employment' AND column_name = 'locality_status'
    )
    BEGIN
        INSERT INTO dbo.column_catalog (table_name, column_name, display_label, data_type)
        VALUES ('employee_employment', 'locality_status', 'Locality Status', 'VARCHAR(20)');
    END
END
GO

/* Remove core locality_status and its catalog entry */
IF EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.employee_core') AND name = 'locality_status'
)
BEGIN
    ALTER TABLE dbo.employee_core DROP COLUMN locality_status;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'column_catalog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DELETE FROM dbo.column_catalog WHERE table_name = 'employee_core' AND column_name = 'locality_status';
END
GO

-- =====================================================
-- End of migration 008_employee_fk_status.sql
-- =====================================================