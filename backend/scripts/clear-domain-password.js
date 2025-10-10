import { executeQuery } from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables (adjust path to project's .env)
dotenv.config({ path: '../.env' });

const username = process.argv[2] || 'widji.santoso';

async function clearDomainPassword(user) {
  try {
    console.log(`\n🔧 Clearing local password for domain user: ${user}`);

    const updateQuery = `
      UPDATE dbo.login
      SET password = NULL, updated_at = GETDATE()
      WHERE username = @username AND (auth_type = 'domain' OR auth_type = 'DOMAIN')
    `;

    await executeQuery(updateQuery, { username: user });

    const checkQuery = `
      SELECT username, auth_type,
             CASE WHEN password IS NULL THEN 'No' ELSE 'Yes' END AS has_password
      FROM dbo.login WHERE username = @username
    `;
    const result = await executeQuery(checkQuery, { username: user });

    if (result.recordset.length > 0) {
      const u = result.recordset[0];
      console.log(`✅ User: ${u.username}, auth_type: ${u.auth_type}, Has Password: ${u.has_password}`);
      if (u.has_password === 'No') {
        console.log('✅ Local password cleared successfully. Domain login will not fallback to local.');
      } else {
        console.log('⚠️ Local password still present. Please re-run or check DB permissions.');
      }
    } else {
      console.log('❌ User not found.');
    }
  } catch (err) {
    console.error('❌ Error clearing password:', err.message);
    process.exitCode = 1;
  }
}

clearDomainPassword(username);