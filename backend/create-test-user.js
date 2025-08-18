import bcrypt from 'bcrypt';
import { executeQuery } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function createTestUser() {
    console.log('🔍 Creating test user: widji.santoso...');
    
    try {
        // First check if user already exists
        const checkQuery = `
            SELECT username FROM dbo.login WHERE username = @username
        `;
        
        const existingUser = await executeQuery(checkQuery, { username: 'widji.santoso' });
        
        if (existingUser.recordset.length > 0) {
            console.log('⚠️ User already exists. Updating password...');
            
            const hashedPassword = await bcrypt.hash('JanganGilaDonk@1', 10);
            
            const updateQuery = `
                UPDATE dbo.login 
                SET password = @password,
                    auth_type = 'domain',
                    domain_username = @domain_username,
                    last_domain_sync = GETDATE()
                WHERE username = @username
            `;
            
            await executeQuery(updateQuery, {
                username: 'widji.santoso',
                password: hashedPassword,
                domain_username: 'widji.santoso'
            });
            
            console.log('✅ User updated successfully');
        } else {
            console.log('➕ Creating new user...');
            
            const hashedPassword = await bcrypt.hash('JanganGilaDonk@1', 10);
            
            const insertQuery = `
                INSERT INTO dbo.login (
                    username, 
                    name, 
                    password, 
                    role, 
                    department, 
                    auth_type, 
                    domain_username,
                    last_domain_sync,
                    created_at
                ) VALUES (
                    @username,
                    @name,
                    @password,
                    @role,
                    @department,
                    @auth_type,
                    @domain_username,
                    GETDATE(),
                    GETDATE()
                )
            `;
            
            await executeQuery(insertQuery, {
                username: 'widji.santoso',
                name: 'Widji Santoso',
                password: hashedPassword,
                role: 'superadmin',
                department: 'IT',
                auth_type: 'domain',
                domain_username: 'widji.santoso'
            });
            
            console.log('✅ User created successfully');
        }
        
        // Verify the user was created/updated
        const verifyQuery = `
            SELECT 
                id, username, name, role, department, auth_type, domain_username,
                CASE WHEN password IS NULL THEN 'No' ELSE 'Yes' END as has_password
            FROM dbo.login 
            WHERE username = @username
        `;
        
        const result = await executeQuery(verifyQuery, { username: 'widji.santoso' });
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            console.log('\n✅ User verification:');
            console.log('- ID:', user.id);
            console.log('- Username:', user.username);
            console.log('- Name:', user.name);
            console.log('- Role:', user.role);
            console.log('- Department:', user.department);
            console.log('- Auth Type:', user.auth_type);
            console.log('- Domain Username:', user.domain_username);
            console.log('- Has Password:', user.has_password);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestUser().catch(console.error);