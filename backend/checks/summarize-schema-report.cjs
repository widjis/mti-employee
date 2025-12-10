const fs = require('fs');

function main() {
  const reportPath = 'backend/checks/schema_report.json';
  if (!fs.existsSync(reportPath)) {
    console.error(`Report not found at ${reportPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const rows = Array.isArray(data.report) ? data.report : [];

  const missingTable = rows.filter(x => !x.existsInTable);
  const missingCatalog = rows.filter(x => !x.existsInCatalog);
  const labelMismatch = rows.filter(x => x.existsInCatalog && !x.labelMatch);

  const summary = {
    total: rows.length,
    missingTable: missingTable.length,
    missingCatalog: missingCatalog.length,
    labelMismatch: labelMismatch.length,
  };

  const out = [
    'Schema Validation Summary',
    `File: ${data.file} | Sheet: ${data.sheet} | Schema: ${data.schema}`,
    '',
    `Total rows: ${summary.total}`,
    `Missing in table: ${summary.missingTable}`,
    `Missing in catalog: ${summary.missingCatalog}`,
    `Label mismatches: ${summary.labelMismatch}`,
    '',
    'Missing in table (up to 50):',
    ...missingTable.slice(0, 50).map(x => `${x.table_name}.${x.column_name} | Header=${x.display_label}`),
    '',
    'Missing in catalog (up to 50):',
    ...missingCatalog.slice(0, 50).map(x => `${x.table_name}.${x.column_name} | Header=${x.display_label}`),
    '',
    'Label mismatches (catalog vs excel, up to 50):',
    ...labelMismatch.slice(0, 50).map(x => `${x.table_name}.${x.column_name}: catalog='${x.catalogLabel}' vs excel='${x.display_label}'`),
  ].join('\n');

  const summaryPath = 'backend/checks/schema_summary.txt';
  fs.writeFileSync(summaryPath, out, 'utf8');
  console.log(out);
  console.log(`\nSummary written to ${summaryPath}`);
}

main();