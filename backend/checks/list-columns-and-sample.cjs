const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

const TARGETS = [
  'dbo.employee_bank',
  'dbo.employee_contact',
  'dbo.employee_employment',
  'dbo.employee_insurance',
  'dbo.employee_onboard',
  'dbo.employee_travel',
];

function looksLikeEmployeeId(colName) {
  const n = colName.toLowerCase();
  return (
    n === 'employee_id' ||
    n === 'emp_id' ||
    n.includes('employee') && n.includes('id') ||
    n.includes('emp') && n.includes('id') ||
    n === 'nik' || n.includes('nik')
  );
}

async function getColumns(pool, table) {
  const rq = pool.request();
  rq.input('table', table);
  const q = `SELECT c.name AS column_name, t.name AS data_type, c.max_length
             FROM sys.columns c
             JOIN sys.types t ON c.user_type_id = t.user_type_id
             WHERE c.object_id = OBJECT_ID(@table)
             ORDER BY c.column_id`;
  const rs = await rq.query(q);
  return rs.recordset || [];
}

async function getSampleValues(pool, table, column) {
  const rq = pool.request();
  const sqlText = `SELECT TOP (10) ${column} AS val FROM ${table} WHERE ${column} IS NOT NULL GROUP BY ${column} ORDER BY COUNT(*) DESC`;
  try {
    const rs = await rq.query(sqlText);
    return (rs.recordset || []).map(r => r.val);
  } catch (err) {
    return [`<error: ${err.message}>`];
  }
}

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to database');

    for (const table of TARGETS) {
      console.log(`\n=== Table: ${table} ===`);
      const cols = await getColumns(pool, table);
      if (!cols.length) {
        console.log('No columns found or table missing.');
        continue;
      }
      // Print candidate columns
      const candidates = cols.filter(c => looksLikeEmployeeId(c.column_name));
      console.table(cols.map(c => ({ column: c.column_name, type: c.data_type, max_length: c.max_length })));
      if (candidates.length) {
        console.log('Candidate employee key columns:');
        for (const c of candidates) {
          const samples = await getSampleValues(pool, table, c.column_name);
          console.log(`- ${c.column_name} (${c.data_type}): ${samples.join(', ')}`);
        }
      } else {
        console.log('No obvious employee key columns found by heuristic.');
      }
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    try { await sql.close(); } catch {}
  }
}

main();