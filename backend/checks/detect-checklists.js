import 'dotenv/config';
import { executeQuery, closeDatabase } from '../config/database.js';

/**
 * Detect checklist-type fields by inspecting dbo.column_catalog joined with INFORMATION_SCHEMA.COLUMNS
 * Heuristics:
 * - BIT columns are checklists
 * - CHAR(1)/NCHAR(1) are checklists (typically Y/N)
 * - VARCHAR(1)/NVARCHAR(1) are checklists
 */
async function main() {
  try {
    console.log('🔎 Detecting checklist-type fields from dbo.column_catalog …');

    const query = `
      SELECT 
        cat.table_name,
        cat.column_name,
        cat.display_label,
        isc.DATA_TYPE AS actual_data_type,
        isc.CHARACTER_MAXIMUM_LENGTH AS max_len
      FROM dbo.column_catalog AS cat
      JOIN INFORMATION_SCHEMA.COLUMNS AS isc
        ON isc.TABLE_SCHEMA = 'dbo'
       AND isc.TABLE_NAME = cat.table_name
       AND isc.COLUMN_NAME = cat.column_name
      WHERE cat.is_active = 1
      ORDER BY cat.table_name, cat.column_name;
    `;

    const res = await executeQuery(query);
    const rows = res.recordset || [];
    const checklist = [];

    for (const r of rows) {
      const dt = (r.actual_data_type || '').toLowerCase();
      const len = typeof r.max_len === 'number' ? r.max_len : null;
      const isBit = dt === 'bit';
      const isChar1 = (dt === 'char' || dt === 'nchar') && (len === 1);
      const isVarchar1 = (dt === 'varchar' || dt === 'nvarchar') && (len === 1);
      if (isBit || isChar1 || isVarchar1) {
        checklist.push({
          table_name: r.table_name,
          column_name: r.column_name,
          display_label: r.display_label,
          data_type: dt,
          max_len: len
        });
      }
    }

    // Group by table for nicer output
    const grouped = new Map();
    for (const item of checklist) {
      if (!grouped.has(item.table_name)) grouped.set(item.table_name, []);
      grouped.get(item.table_name).push(item);
    }

    console.log(`\n✅ Found ${checklist.length} checklist-type fields across ${grouped.size} tables:`);
    for (const [table, items] of grouped.entries()) {
      console.log(`\n📂 ${table} (${items.length})`);
      console.table(items.map(i => ({ column: i.column_name, label: i.display_label, type: i.data_type, len: i.max_len })));
    }

    // Emit a minimal JSON for downstream usage
    const names = checklist.map(i => i.column_name);
    const unique = Array.from(new Set(names));
    console.log('\n🧾 Checklist field names (unique):');
    console.log(unique.join(', '));

    console.log('\nℹ️ Note: This heuristic flags BIT and 1-char text fields.');
    console.log('   If you want to include other patterns (e.g., smallint 0/1), let me know.');
  } catch (err) {
    console.error('❌ Error detecting checklist fields:', err.message);
    process.exitCode = 1;
  } finally {
    try { await closeDatabase(); } catch {}
  }
}

main();