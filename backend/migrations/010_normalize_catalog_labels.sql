-- =====================================================
-- MTI Employee Management System - Column Catalog Label Normalization
-- Migration: 010_normalize_catalog_labels.sql
-- Created: 2025-12-09
-- Purpose:
--  - Normalize dbo.column_catalog.display_label to match Excel headers
--  - Based on latest validator summary mismatches
-- Notes: Idempotent upserts (UPDATE if exists, else INSERT)
-- =====================================================

-- Helper pattern per entry (example):
-- IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = '<table>' AND column_name = '<column>')
-- BEGIN
--   UPDATE dbo.column_catalog SET display_label = '<Excel Label>'
--    WHERE table_name = '<table>' AND column_name = '<column>';
-- END
-- ELSE BEGIN
--   INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
--   VALUES ('<table>', '<column>', '<Excel Label>');
-- END

-- employee_insurance labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'insurance_endorsement')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Insurance (Endorsment)'
   WHERE table_name = 'employee_insurance' AND column_name = 'insurance_endorsement';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'insurance_endorsement', 'Insurance (Endorsment)');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'insurance_owlexa')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Insurance Card Owlexa'
   WHERE table_name = 'employee_insurance' AND column_name = 'insurance_owlexa';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'insurance_owlexa', 'Insurance Card Owlexa');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'insurance_fpg')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Insurance Card FPG'
   WHERE table_name = 'employee_insurance' AND column_name = 'insurance_fpg';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'insurance_fpg', 'Insurance Card FPG');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'bpjs_tk')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'BPJS TK No'
   WHERE table_name = 'employee_insurance' AND column_name = 'bpjs_tk';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'bpjs_tk', 'BPJS TK No');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'bpjs_kes')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'BPJS KES No'
   WHERE table_name = 'employee_insurance' AND column_name = 'bpjs_kes';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'bpjs_kes', 'BPJS KES No');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_insurance' AND column_name = 'status_bpjs_kes')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'STATUS BPJS Kesehatan'
   WHERE table_name = 'employee_insurance' AND column_name = 'status_bpjs_kes';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_insurance', 'status_bpjs_kes', 'STATUS BPJS Kesehatan');
END
GO

-- employee_core labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_core' AND column_name = 'name')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Employee Name'
   WHERE table_name = 'employee_core' AND column_name = 'name';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_core', 'name', 'Employee Name');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_core' AND column_name = 'place_of_birth')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Place of Birth'
   WHERE table_name = 'employee_core' AND column_name = 'place_of_birth';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_core', 'place_of_birth', 'Place of Birth');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_core' AND column_name = 'date_of_birth')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Date of Birth'
   WHERE table_name = 'employee_core' AND column_name = 'date_of_birth';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_core', 'date_of_birth', 'Date of Birth');
END
GO

-- employee_contact labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_contact' AND column_name = 'phone_number')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Mobile Phone'
   WHERE table_name = 'employee_contact' AND column_name = 'phone_number';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_contact', 'phone_number', 'Mobile Phone');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_contact' AND column_name = 'address')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'KTP Address'
   WHERE table_name = 'employee_contact' AND column_name = 'address';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_contact', 'address', 'KTP Address');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_contact' AND column_name = 'city')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'KTP City'
   WHERE table_name = 'employee_contact' AND column_name = 'city';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_contact', 'city', 'KTP City');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_contact' AND column_name = 'email')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Personal email'
   WHERE table_name = 'employee_contact' AND column_name = 'email';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_contact', 'email', 'Personal email');
END
GO

-- employee_onboard labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_onboard' AND column_name = 'point_of_hire')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Poin of Hire'
   WHERE table_name = 'employee_onboard' AND column_name = 'point_of_hire';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_onboard', 'point_of_hire', 'Poin of Hire');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_onboard' AND column_name = 'point_of_origin')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Poin of Origin'
   WHERE table_name = 'employee_onboard' AND column_name = 'point_of_origin';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_onboard', 'point_of_origin', 'Poin of Origin');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_onboard' AND column_name = 'first_join_date_merdeka')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'First Join Date (Merdeka Group)'
   WHERE table_name = 'employee_onboard' AND column_name = 'first_join_date_merdeka';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_onboard', 'first_join_date_merdeka', 'First Join Date (Merdeka Group)');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_onboard' AND column_name = 'transfer_merdeka')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Transfer Merdeka Group'
   WHERE table_name = 'employee_onboard' AND column_name = 'transfer_merdeka';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_onboard', 'transfer_merdeka', 'Transfer Merdeka Group');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_onboard' AND column_name = 'years_in_service')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Years in Service'
   WHERE table_name = 'employee_onboard' AND column_name = 'years_in_service';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_onboard', 'years_in_service', 'Years in Service');
END
GO

-- employee_travel labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'kitas_no')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'KITAS NO'
   WHERE table_name = 'employee_travel' AND column_name = 'kitas_no';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_travel', 'kitas_no', 'KITAS NO');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_travel' AND column_name = 'passport_no')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'PASSPORT ID'
   WHERE table_name = 'employee_travel' AND column_name = 'passport_no';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_travel', 'passport_no', 'PASSPORT ID');
END
GO

-- employee_employment labels
IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_employment' AND column_name = 'blacklist_mti')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Black List MTI'
   WHERE table_name = 'employee_employment' AND column_name = 'blacklist_mti';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_employment', 'blacklist_mti', 'Black List MTI');
END
GO

IF EXISTS (SELECT 1 FROM dbo.column_catalog WHERE table_name = 'employee_employment' AND column_name = 'blacklist_imip')
BEGIN
  UPDATE dbo.column_catalog SET display_label = 'Black List IMIP'
   WHERE table_name = 'employee_employment' AND column_name = 'blacklist_imip';
END
ELSE BEGIN
  INSERT INTO dbo.column_catalog(table_name, column_name, display_label)
  VALUES ('employee_employment', 'blacklist_imip', 'Black List IMIP');
END
GO