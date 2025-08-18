import { executeQuery } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function checkUserInDatabase() {
    console.log('🔍 Checking if user exists in local database...');
    
    try {
        const query = `
            SELECT 
                id,
                username,
                name,
                role,
                department,
                auth_type,
                domain_username,
                last_domain_sync,
                created_at,
                CASE WHEN password IS NULL THEN 'No' ELSE 'Yes' END as has_password
            FROM dbo.login 
            WHERE username = @username
        `;
        
        const result = await executeQuery(query, { username: 'widji.santoso' });
        
        if (result.recordset.length > 0) {
            console.log('✅ User found in database:');
            const user = result.recordset[0];
            console.log('- ID:', user.id);
            console.log('- Username:', user.username);
            console.log('- Name:', user.name);
            console.log('- Role:', user.role);
            console.log('- Department:', user.department);
            console.log('- Auth Type:', user.auth_type);
            console.log('- Domain Username:', user.domain_username);
            console.log('- Last Domain Sync:', user.last_domain_sync);
            console.log('- Has Password:', user.has_password);
            console.log('- Created At:', user.created_at);
        } else {
            console.log('❌ User not found in local database');
            console.log('\n💡 This means the user needs to be created during first successful domain login');
        }
        
    } catch (error) {
        console.error('❌ Database Error:', error.message);
    }
}

checkUserInDatabase().catch(console.error);