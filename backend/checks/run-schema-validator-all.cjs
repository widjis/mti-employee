const path = require('path');
const { spawnSync } = require('child_process');
const XLSX = require('xlsx');

/**
 * Run backend/check-schema-vs-excel.js against all sheets in a workbook.
 * Usage:
 *   node backend/checks/run-schema-validator-all.cjs --file "backend/scripts/Comben Master Data Column Assignment.xlsx" [--schema dbo]
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { schema: 'dbo' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file') out.file = args[++i];
    else if (a === '--schema') out.schema = args[++i];
  }
  return out;
}

function runSheet(file, sheet, schema) {
  const cmd = process.execPath; // node executable
  const script = path.join(process.cwd(), 'backend', 'check-schema-vs-excel.js');
  const args = [script, '--file', file, '--sheet', sheet, '--schema', schema];
  console.log(`\n>>> Validating sheet: ${sheet}`);
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.error) {
    console.error(`Error running validator for sheet ${sheet}:`, res.error.message);
    return { sheet, status: 'error', error: res.error.message };
  }
  if (res.status !== 0) {
    console.error(`Validator exited with code ${res.status} for sheet ${sheet}`);
    console.error(res.stderr || '');
    console.error(res.stdout || '');
    return { sheet, status: 'failed', code: res.status };
  }
  console.log(res.stdout || '');
  return { sheet, status: 'ok' };
}

function main() {
  const { file, schema } = parseArgs();
  if (!file) {
    console.error('Usage: node backend/checks/run-schema-validator-all.cjs --file <excel-file> [--schema dbo]');
    process.exit(1);
  }

  let wb;
  try {
    wb = XLSX.readFile(file);
  } catch (err) {
    console.error(`ERROR: Cannot read Excel file: ${file}`);
    console.error(err.message);
    process.exit(1);
  }
  const sheets = wb.SheetNames || [];
  if (!sheets.length) {
    console.error('ERROR: Workbook has no sheets.');
    process.exit(1);
  }

  console.log(`Running schema validation for ${sheets.length} sheets in ${file}`);
  const results = [];
  for (const s of sheets) {
    results.push(runSheet(file, s, schema));
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status !== 'ok');
  console.log(`\nSummary: ${ok} succeeded, ${failed.length} failed.`);
  if (failed.length) {
    console.log('Failed sheets:', failed.map(f => f.sheet).join(', '));
  }
}

main();