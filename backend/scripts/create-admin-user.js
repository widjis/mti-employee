import bcrypt from 'bcrypt';
import { sql, poolPromise } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SALT_ROUNDS = 12;

async function createAdminUser() {
  try {
    console.log('🔄 Creating new admin user...');
    
    const pool = await poolPromise;
    
    if (!pool) {
      throw new Error('Database connection failed');
    }
    
    const username = 'mti-ict';
    const password = 'T$1ngsh4n@24';
    const role = 'admin';
    const name = 'MTI ICT Admin';
    const department = 'Human Resources';
    
    // Check if user already exists
    const checkUserQuery = 'SELECT Id, username FROM dbo.login WHERE username = @username';
    const checkResult = await pool.request()
      .input('username', sql.VarChar, username)
      .query(checkUserQuery);
    
    if (checkResult.recordset.length > 0) {
      console.log(`⚠️  User '${username}' already exists with ID: ${checkResult.recordset[0].Id}`);
      
      // Ask if we should update the password
      console.log('🔄 Updating password for existing user...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Update the existing user's password
      await pool.request()
        .input('username', sql.VarChar, username)
        .input('hashedPassword', sql.VarChar, hashedPassword)
        .input('role', sql.VarChar, role)
        .input('name', sql.VarChar, name)
        .input('department', sql.VarChar, department)
        .query('UPDATE dbo.login SET password = @hashedPassword, role = @role, name = @name, department = @department WHERE username = @username');
      
      console.log(`✅ Password updated for user: ${username}`);
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert new admin user
    const insertQuery = `
      INSERT INTO dbo.login (username, password, role, name, department)
      VALUES (@username, @hashedPassword, @role, @name, @department)
    `;
    
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('hashedPassword', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, role)
      .input('name', sql.VarChar, name)
      .input('department', sql.VarChar, department)
      .query(insertQuery);
    
    console.log(`✅ Admin user created successfully!`);
    console.log(`📊 User Details:`);
    console.log(`   - Username: ${username}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Role: ${role}`);
    console.log(`   - Department: ${department}`);
    console.log(`   - Password: [HASHED]`);
    
    // Verify the user was created
    const verifyResult = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT Id, username, role, name, department FROM dbo.login WHERE username = @username');
    
    if (verifyResult.recordset.length > 0) {
      const user = verifyResult.recordset[0];
      console.log(`🎉 Verification successful - User ID: ${user.Id}`);
    }
    
  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    
    // Check if it's a column doesn't exist error
    if (error.message.includes('Invalid column name')) {
      console.log('💡 Hint: The login table might not have a "role" column.');
      console.log('   You may need to run a database migration to add the role column.');
      console.log('   Alternatively, check the exact column names in the login table.');
    }
    
    throw error;
  }
}

// Run the user creation
createAdminUser()
  .then(() => {
    console.log('🎉 Admin user creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Admin user creation failed:', error.message);
    process.exit(1);
  });