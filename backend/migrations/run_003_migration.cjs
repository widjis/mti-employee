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
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function runMigration() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to database');

        // Check if auth_type column exists
        const checkColumn = `
            SELECT COUNT(*) as count 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID('dbo.login') AND name = 'auth_type'
        `;
        
        const columnResult = await pool.request().query(checkColumn);
        
        if (columnResult.recordset[0].count === 0) {
            console.log('Adding authentication type columns...');
            
            // Add columns
            const addColumns = `
                ALTER TABLE dbo.login ADD 
                    auth_type NVARCHAR(20) NOT NULL DEFAULT 'local' CHECK (auth_type IN ('local', 'domain')),
                    domain_username NVARCHAR(100) NULL,
                    last_domain_sync DATETIME2(3) NULL
            `;
            
            await pool.request().query(addColumns);
            console.log('Added authentication type columns to login table');
        } else {
            console.log('Authentication type columns already exist');
        }

        // Check if index exists
        const checkIndex = `
            SELECT COUNT(*) as count 
            FROM sys.indexes 
            WHERE name = 'IX_login_domain_username'
        `;
        
        const indexResult = await pool.request().query(checkIndex);
        
        if (indexResult.recordset[0].count === 0) {
            console.log('Creating index for domain username lookups...');
            
            const createIndex = `
                CREATE INDEX IX_login_domain_username ON dbo.login (domain_username, auth_type)
            `;
            
            await pool.request().query(createIndex);
            console.log('Created index for domain username lookups');
        } else {
            console.log('Domain username index already exists');
        }

        // Update existing users
        console.log('Updating existing users to local authentication type...');
        const updateUsers = `
            UPDATE dbo.login 
            SET auth_type = 'local' 
            WHERE auth_type IS NULL OR auth_type = ''
        `;
        
        const updateResult = await pool.request().query(updateUsers);
        console.log(`Updated ${updateResult.rowsAffected[0]} users to local authentication type`);

        console.log('Migration 003_add_auth_type_column completed successfully');
        
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sql.close();
    }
}

runMigration();