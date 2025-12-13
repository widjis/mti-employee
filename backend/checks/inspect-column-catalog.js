import 'dotenv/config';
import { executeQuery, closeDatabase } from '../config/database.js';

async function main() {
  try {
    console.log('🔍 Inspecting dbo.column_catalog schema and sample data...');

    const schemaQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'column_catalog'
      ORDER BY ORDINAL_POSITION;
    `;

    const sampleRowsQuery = `
      SELECT TOP 25 
        id,
        table_name,
        column_name,
        display_label,
        data_type,
        is_exportable,
        is_sensitive,
        is_active,
        created_at,
        updated_at
      FROM dbo.column_catalog
      ORDER BY table_name, column_name;
    `;

    const perTableCountsQuery = `
      SELECT table_name, COUNT(*) AS column_count
      FROM dbo.column_catalog
      GROUP BY table_name
      ORDER BY table_name;
    `;

    const schemaRes = await executeQuery(schemaQuery);
    const sampleRes = await executeQuery(sampleRowsQuery);
    const countsRes = await executeQuery(perTableCountsQuery);

    console.log('\n📑 Column Catalog Schema:');
    console.table(schemaRes.recordset);

    console.log('\n📚 Sample Catalog Rows (Top 25):');
    console.table(sampleRes.recordset);

    console.log('\n📈 Column Counts Per Table:');
    console.table(countsRes.recordset);

    // Quick checks for commonly used fields
    const checkFields = ['gender', 'employment_status', 'position_grade', 'date_of_birth'];
    const checks = [];
    for (const f of checkFields) {
      const q = `SELECT TOP 10 table_name, column_name, display_label, data_type FROM dbo.column_catalog WHERE column_name = @column_name ORDER BY table_name;`;
      const r = await executeQuery(q, { column_name: f });
      checks.push({ field: f, rows: r.recordset });
    }

    console.log('\n🔎 Field Presence Checks:');
    for (const c of checks) {
      console.log(`\nField: ${c.field}`);
      console.table(c.rows);
    }

    console.log('\n✅ Inspection complete.');
  } catch (err) {
    console.error('❌ Error inspecting column_catalog:', err.message);
    process.exitCode = 1;
  } finally {
    try { await closeDatabase(); } catch {}
  }
}

main();