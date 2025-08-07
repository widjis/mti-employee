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

async function migratePasswords() {
  try {
    console.log('🔄 Starting password migration...');
    
    const pool = await poolPromise;
    
    // Get all users with plain-text passwords
    const result = await pool.request()
      .query('SELECT Id, username, password FROM dbo.login');
    
    const users = result.recordset;
    console.log(`📊 Found ${users.length} users to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (user.password.startsWith('$2b$')) {
        console.log(`⏭️  Skipping ${user.username} - already hashed`);
        skippedCount++;
        continue;
      }
      
      // Hash the plain-text password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Update the database
      await pool.request()
        .input('id', sql.Int, user.Id)
        .input('hashedPassword', sql.VarChar, hashedPassword)
        .query('UPDATE dbo.login SET password = @hashedPassword WHERE Id = @id');
      
      console.log(`✅ Migrated password for user: ${user.username}`);
      migratedCount++;
    }
    
    console.log('\n🎉 Password migration completed!');
    console.log(`📈 Statistics:`);
    console.log(`   - Migrated: ${migratedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users (already hashed)`);
    console.log(`   - Total: ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run migration
migratePasswords();