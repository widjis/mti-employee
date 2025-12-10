import fs from 'fs';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

const SCHEMA = 'dbo';
const REPORT_PATH = 'backend/checks/schema_report.json';
const PLAN_JSON = 'backend/checks/rename_plan.json';
const PLAN_TXT = 'backend/checks/rename_plan.txt';

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[_\s\-]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function connect() {
  const config = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: { trustServerCertificate: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
  const pool = await sql.connect(config);
  return pool;
}

async function listColumns(pool, tableName) {
  const request = pool.request();
  const result = await request.query(`
    SELECT c.name AS column_name
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID('${SCHEMA}.${tableName}')
    ORDER BY c.column_id
  `);
  return result.recordset.map(r => r.column_name);
}

async function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Report not found: ${REPORT_PATH}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const rows = Array.isArray(data.report) ? data.report : [];

  const pool = await connect();

  const renameSuggestions = [];
  const additions = [];

  // Focus only on entries missing in table; try to find case/format variants
  const missing = rows.filter(r => !r.existsInTable);

  for (const r of missing) {
    const desired = r.column_name; // Excel-mapped DB name (snake_case expected)
    const table = r.table_name;
    try {
      const cols = await listColumns(pool, table);
      const desiredNorm = normalizeName(desired);
      let candidate = null;

      for (const col of cols) {
        const colNorm = normalizeName(col);
        if (colNorm === desiredNorm && col !== desired) {
          candidate = col;
          break;
        }
      }

      if (candidate) {
        renameSuggestions.push({ table_name: table, from: candidate, to: desired });
      } else {
        additions.push({ table_name: table, column_name: desired, display_label: r.display_label });
      }
    } catch (e) {
      additions.push({ table_name: table, column_name: desired, display_label: r.display_label, error: String(e.message || e) });
    }
  }

  const plan = { schema: SCHEMA, renameSuggestions, additions };
  fs.writeFileSync(PLAN_JSON, JSON.stringify(plan, null, 2));

  const lines = [];
  lines.push('DB Rename Plan (from Excel alignment)');
  lines.push(`Schema: ${SCHEMA}`);
  lines.push('');
  lines.push('Renames:');
  if (renameSuggestions.length === 0) {
    lines.push('- None suggested');
  } else {
    for (const s of renameSuggestions) {
      lines.push(`- ${s.table_name}: ${s.from} -> ${s.to}`);
      lines.push(`  EXEC sp_rename '${SCHEMA}.${s.table_name}.${s.from}', '${s.to}', 'COLUMN';`);
    }
  }
  lines.push('');
  lines.push('Additions (types/constraints TBD):');
  if (additions.length === 0) {
    lines.push('- None');
  } else {
    for (const a of additions) {
      lines.push(`- ${a.table_name}.${a.column_name} | label='${a.display_label}'`);
    }
  }

  fs.writeFileSync(PLAN_TXT, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  console.log(`\nPlan written to ${PLAN_JSON} and ${PLAN_TXT}`);

  await pool.close();
}

main().catch(err => {
  console.error('Error generating rename plan:', err);
  process.exit(1);
});