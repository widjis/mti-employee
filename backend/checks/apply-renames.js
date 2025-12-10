import fs from 'fs';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

const PLAN_JSON = 'backend/checks/rename_plan.json';
const APPLIED_LOG = 'backend/checks/rename_applied_log.txt';
const SCHEMA = 'dbo';

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

async function applyRename(pool, table, from, to) {
  const request = pool.request();
  const sqlText = `EXEC sp_rename '${SCHEMA}.${table}.${from}', '${to}', 'COLUMN';`;
  await request.batch(sqlText);
  return sqlText;
}

async function main() {
  if (!fs.existsSync(PLAN_JSON)) {
    console.error(`Plan file not found: ${PLAN_JSON}`);
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(PLAN_JSON, 'utf8'));
  const renames = Array.isArray(plan.renameSuggestions) ? plan.renameSuggestions : [];

  if (renames.length === 0) {
    console.log('No renames to apply.');
    process.exit(0);
  }

  const pool = await connect();
  const applied = [];
  const failed = [];

  for (const r of renames) {
    try {
      const sqlBatch = await applyRename(pool, r.table_name, r.from, r.to);
      applied.push({ table_name: r.table_name, from: r.from, to: r.to, sql: sqlBatch });
      console.log(`Applied: ${r.table_name}.${r.from} -> ${r.to}`);
    } catch (e) {
      failed.push({ table_name: r.table_name, from: r.from, to: r.to, error: String(e.message || e) });
      console.error(`Failed: ${r.table_name}.${r.from} -> ${r.to} :: ${String(e.message || e)}`);
    }
  }

  const lines = [];
  lines.push('Applied Column Renames');
  for (const a of applied) {
    lines.push(`- ${a.table_name}.${a.from} -> ${a.to}`);
  }
  if (failed.length) {
    lines.push('');
    lines.push('Failed Column Renames');
    for (const f of failed) {
      lines.push(`- ${f.table_name}.${f.from} -> ${f.to} :: ${f.error}`);
    }
  }

  fs.writeFileSync(APPLIED_LOG, lines.join('\n'), 'utf8');
  console.log(`\nLog written to ${APPLIED_LOG}`);
  await pool.close();
}

main().catch(err => {
  console.error('Error applying renames:', err);
  process.exit(1);
});