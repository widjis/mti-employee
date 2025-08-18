import { executeQuery } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function checkAllUsers() {
    console.log('🔍 Checking all users in database...');
    
    try {
        const query = `
            SELECT TOP 10
                id,
                username,
                name,
                role,
                auth_type,
                CASE WHEN password IS NULL THEN 'No' ELSE 'Yes' END as has_password
            FROM dbo.login 
            ORDER BY created_at DESC
        `;
        
        const result = await executeQuery(query);
        
        console.log(`✅ Found ${result.recordset.length} users:`);
        result.recordset.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} (${user.name}) - Role: ${user.role}, Auth: ${user.auth_type}, Password: ${user.has_password}`);
        });
        
        // Specifically search for widji.santoso with different case variations
        console.log('\n🔍 Searching for widji.santoso variations...');
        const searchQuery = `
            SELECT *
            FROM dbo.login 
            WHERE username LIKE '%widji%' OR username LIKE '%santoso%'
        `;
        
        const searchResult = await executeQuery(searchQuery);
        
        if (searchResult.recordset.length > 0) {
            console.log('✅ Found matching users:');
            searchResult.recordset.forEach(user => {
                console.log(`- ID: ${user.id}, Username: ${user.username}, Name: ${user.name}`);
            });
        } else {
            console.log('❌ No users found matching widji or santoso');
        }
        
    } catch (error) {
        console.error('❌ Database Error:', error.message);
    }
}

checkAllUsers().catch(console.error);