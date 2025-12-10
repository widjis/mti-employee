import XLSX from 'xlsx';
import { poolPromise } from './db.js';

/**
 * Validate DB schema against an Excel "Column Name" sheet.
 * Expects columns: "Column Header", "database column name", "table name".
 *
 * Usage:
 *   node backend/check-schema-vs-excel.js --file "public/template_data.xlsx" --sheet "Column Name"
 * Optional:
 *   --schema dbo
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file') out.file = args[++i];
    else if (a === '--sheet') out.sheet = args[++i];
    else if (a === '--schema') out.schema = args[++i];
  }
  return out;
}

function normalizeKey(k) {
  return k.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function pick(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const match = keys.find(k => normalizeKey(k) === normalizeKey(cand));
    if (match) return row[match];
  }
  // Fallback: try contains
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (candidates.some(c => nk.includes(normalizeKey(c)))) {
      return row[k];
    }
  }
  return undefined;
}

async function main() {
  const { file, sheet, schema = 'dbo' } = parseArgs();
  if (!file || !sheet) {
    console.error('ERROR: Please provide --file <path-to-excel> and --sheet <sheet-name>.');
    process.exit(1);
  }

  // Read Excel
  let wb;
  try {
    wb = XLSX.readFile(file);
  } catch (err) {
    console.error(`ERROR: Cannot read Excel file: ${file}`);
    console.error(err.message);
    process.exit(1);
  }
  const ws = wb.Sheets[sheet];
  if (!ws) {
    console.error(`ERROR: Sheet "${sheet}" not found in ${file}`);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('ERROR: No rows found in the provided sheet.');
    process.exit(1);
  }

  const raw = rows.map((row, idx) => {
    // Display label (Excel header)
    const display_label = pick(row, ['Column Name', 'Column Header', 'Excel Header', 'Display Label']);
    // Database column name
    const column_name = pick(row, [
      'Mapping to Existing DB Schema', // authoritative per user instruction
      'database column name',
      'db column name',
      'column name',
      'column_name'
    ]);
    // Table name
    const table_name = pick(row, ['Table Name', 'table name', 'table', 'table_name']);
    return { index: idx + 1, display_label, column_name, table_name };
  }).filter(r => r.column_name && r.table_name);

  // Expand comma-separated table names into individual checks
  const expected = [];
  for (const r of raw) {
    const tables = r.table_name.toString().split(',').map(t => t.trim()).filter(Boolean);
    if (!tables.length) continue;
    for (const t of tables) {
      expected.push({ index: r.index, display_label: r.display_label, column_name: r.column_name, table_name: t });
    }
  }

  const pool = await poolPromise;
  const report = [];

  async function checkColumn(table_name, column_name, display_label) {
    const qualified = table_name.includes('.') ? table_name : `${schema}.${table_name}`;
    const request = pool.request();
    request.input('qualified', qualified);
    request.input('column_name', column_name);
    request.input('table_name', table_name);

    const colRes = await request.query(
      `SELECT 1 AS exists_col
       FROM sys.columns
       WHERE object_id = OBJECT_ID(@qualified)
         AND name = @column_name`
    );
    const existsInTable = colRes.recordset.length > 0;

    const catRes = await request.query(
      `SELECT display_label
         FROM dbo.column_catalog
        WHERE table_name = @table_name
          AND column_name = @column_name`
    );
    const existsInCatalog = catRes.recordset.length > 0;
    const catalogLabel = existsInCatalog ? (catRes.recordset[0].display_label || '') : '';

    let labelMatch = true;
    if (existsInCatalog && display_label) {
      labelMatch = catalogLabel.trim() === display_label.toString().trim();
    }

    report.push({
      table_name,
      column_name,
      display_label: display_label || '',
      existsInTable,
      existsInCatalog,
      catalogLabel,
      labelMatch
    });
  }

  for (const r of expected) {
    // eslint-disable-next-line no-await-in-loop
    await checkColumn(r.table_name, r.column_name, r.display_label);
  }

  const missingInTable = report.filter(r => !r.existsInTable);
  const missingInCatalog = report.filter(r => !r.existsInCatalog);
  const labelMismatches = report.filter(r => r.existsInCatalog && !r.labelMatch);

  console.log('=== Schema vs Excel Validation Report ===');
  console.log(`File: ${file}`);
  console.log(`Sheet: ${sheet}`);
  console.log(`Schema: ${schema}`);
  console.log(`Checked rows: ${expected.length}`);
  console.log('----------------------------------------');
  console.log(`Missing in DB table columns: ${missingInTable.length}`);
  console.log(`Missing in column_catalog entries: ${missingInCatalog.length}`);
  console.log(`Display label mismatches: ${labelMismatches.length}`);
  console.log('----------------------------------------');
  if (missingInTable.length) {
    console.log('Missing in DB table:');
    console.table(missingInTable.map(({ table_name, column_name }) => ({ table_name, column_name })));
  }
  if (missingInCatalog.length) {
    console.log('Missing in column_catalog:');
    console.table(missingInCatalog.map(({ table_name, column_name, display_label }) => ({ table_name, column_name, expected_label: display_label })));
  }
  if (labelMismatches.length) {
    console.log('Label mismatches:');
    console.table(labelMismatches.map(({ table_name, column_name, display_label, catalogLabel }) => ({ table_name, column_name, expected_label: display_label, catalog_label: catalogLabel })));
  }

  // Persist JSON report
  const fs = await import('fs');
  const outPath = new URL('./checks/schema_report.json', import.meta.url);
  const dirPath = new URL('./checks/', import.meta.url);
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {}
  fs.writeFileSync(outPath, JSON.stringify({ file, sheet, schema, report }, null, 2));
  console.log(`Report written to backend/checks/schema_report.json`);
}

main().catch(err => {
  console.error('ERROR running validation:', err);
  process.exit(1);
});