import 'dotenv/config';
import sql from 'mssql';

async function main() {
  const config = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: { trustServerCertificate: true },
  };
  const pool = await sql.connect(config);
  const q = `
    SELECT 
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'employee_core' AND COLUMN_NAME = 'employee_id'
  `;
  const res = await pool.request().query(q);
  if (res.recordset.length === 0) {
    console.log('employee_core.employee_id not found');
  } else {
    const r = res.recordset[0];
    console.log(`employee_core.employee_id => type=${r.DATA_TYPE} length=${r.CHARACTER_MAXIMUM_LENGTH} nullable=${r.IS_NULLABLE}`);
  }
  await pool.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});