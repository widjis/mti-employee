import { sql, poolPromise } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Update the password column to accommodate bcrypt hashes
 * Bcrypt hashes are typically 60 characters long
 */
async function updatePasswordColumn() {
  try {
    console.log('🔄 Starting password column update...');
    
    const pool = await poolPromise;
    
    if (!pool) {
      throw new Error('Database connection failed');
    }
    
    // Check current column size
    const checkColumnQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'login' 
        AND COLUMN_NAME = 'password'
        AND TABLE_SCHEMA = 'dbo'
    `;
    
    const columnInfo = await pool.request().query(checkColumnQuery);
    
    if (columnInfo.recordset.length === 0) {
      throw new Error('Password column not found in login table');
    }
    
    const currentLength = columnInfo.recordset[0].CHARACTER_MAXIMUM_LENGTH;
    console.log(`📊 Current password column length: ${currentLength}`);
    
    if (currentLength >= 255) {
      console.log('✅ Password column is already large enough for bcrypt hashes');
      return;
    }
    
    // Update column size to VARCHAR(255) to accommodate bcrypt hashes
    const updateColumnQuery = `
      ALTER TABLE [dbo].[login]
      ALTER COLUMN [password] VARCHAR(255) NOT NULL
    `;
    
    await pool.request().query(updateColumnQuery);
    
    console.log('✅ Password column updated successfully to VARCHAR(255)');
    
    // Verify the update
    const verifyQuery = await pool.request().query(checkColumnQuery);
    const newLength = verifyQuery.recordset[0].CHARACTER_MAXIMUM_LENGTH;
    console.log(`📊 New password column length: ${newLength}`);
    
  } catch (error) {
    console.error('❌ Column update failed:', error.message);
    throw error;
  }
}

// Run the update
updatePasswordColumn()
  .then(() => {
    console.log('🎉 Password column update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Password column update failed:', error.message);
    process.exit(1);
  });