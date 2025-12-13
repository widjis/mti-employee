-- Update blood_type column to CHAR(2) to support values like 'AB'
-- Idempotent: only alters when current length is 1

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'employee_core'
    AND COLUMN_NAME = 'blood_type'
    AND DATA_TYPE = 'char'
    AND CHARACTER_MAXIMUM_LENGTH = 1
)
BEGIN
  DECLARE @nullable NVARCHAR(20);
  SELECT @nullable = CASE WHEN IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'employee_core'
    AND COLUMN_NAME = 'blood_type';

  DECLARE @sql NVARCHAR(MAX) = N'ALTER TABLE dbo.employee_core ALTER COLUMN blood_type CHAR(2) ' + @nullable + N';';
  EXEC sp_executesql @sql;
END