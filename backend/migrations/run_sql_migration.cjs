const fs = require('fs');
const path = require('path');
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

async function runFile(filePath) {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error(`Migration file not found: ${abs}`);
    process.exit(1);
  }

  const content = fs.readFileSync(abs, 'utf8');
  // Robustly split on lines that contain only GO (case-insensitive)
  const lines = content.split(/\r?\n/);
  const batches = [];
  let current = [];
  for (const line of lines) {
    if (/^\s*GO\s*$/i.test(line)) {
      const chunk = current.join('\n').trim();
      if (chunk.length > 0) batches.push(chunk);
      current = [];
    } else {
      current.push(line);
    }
  }
  const tail = current.join('\n').trim();
  if (tail.length > 0) batches.push(tail);

  console.log(`Executing ${batches.length} batches from ${abs}`);

  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to database');

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        await pool.request().query(batch);
        console.log(`Batch ${i + 1}/${batches.length} executed successfully`);
      } catch (err) {
        console.error(`Batch ${i + 1} failed:`, err.message);
        throw err;
      }
    }

    console.log('Migration executed successfully');
  } catch (err) {
    console.error('Migration execution error:', err);
  } finally {
    try { await sql.close(); } catch {}
  }
}

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: node backend/migrations/run_sql_migration.cjs <path-to-sql>');
  process.exit(1);
}

runFile(fileArg);