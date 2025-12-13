import 'dotenv/config';
import { executeQuery, closeDatabase } from '../config/database.js';

async function main() {
  try {
    console.log('🔍 Scanning dbo.employee_checklist schema and sample rows…');

    const schemaQ = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'employee_checklist'
      ORDER BY ORDINAL_POSITION;
    `;

    const sampleQ = `
      SELECT TOP 25 *
      FROM dbo.employee_checklist
      ORDER BY checklist_id DESC;
    `;

    const schemaRes = await executeQuery(schemaQ);
    const sampleRes = await executeQuery(sampleQ);

    const schema = schemaRes.recordset || [];
    const rows = sampleRes.recordset || [];

    console.log('\n📑 employee_checklist Columns:');
    console.table(schema.map(r => ({
      column: r.COLUMN_NAME,
      type: r.DATA_TYPE,
      len: r.CHARACTER_MAXIMUM_LENGTH,
      nullable: r.IS_NULLABLE,
      default: r.COLUMN_DEFAULT || null,
      checklist_flag: (r.DATA_TYPE?.toLowerCase() === 'bit') || ((r.CHARACTER_MAXIMUM_LENGTH === 1) && ['char','nchar','varchar','nvarchar'].includes((r.DATA_TYPE||'').toLowerCase()))
    })));

    if (rows.length === 0) {
      console.log('\n📭 No rows found in employee_checklist');
    } else {
      console.log(`\n📚 Sample Rows (${rows.length}):`);
      // Show a slim view: employee_id and checklist BITs
      const cols = schema.map(s => s.COLUMN_NAME);
      const bitCols = cols.filter(c => schema.find(s => s.COLUMN_NAME === c)?.DATA_TYPE?.toLowerCase() === 'bit');
      const view = rows.map(r => {
        const out = { employee_id: r.employee_id };
        for (const b of bitCols) {
          out[b] = r[b];
        }
        return out;
      });
      console.table(view);
    }

    console.log('\n✅ Scan complete.');
  } catch (err) {
    console.error('❌ Error scanning employee_checklist:', err.message);
    process.exitCode = 1;
  } finally {
    try { await closeDatabase(); } catch {}
  }
}

main();