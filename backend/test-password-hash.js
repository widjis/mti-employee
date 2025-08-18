import bcrypt from 'bcrypt';
import { executeQuery } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function testPasswordHash() {
    console.log('🔍 Testing password hash for widji.santoso...');
    
    try {
        // Get the current password hash from database
        const query = `
            SELECT username, password, auth_type
            FROM dbo.login 
            WHERE username = @username
        `;
        
        const result = await executeQuery(query, { username: 'widji.santoso' });
        
        if (result.recordset.length === 0) {
            console.log('❌ User not found in database');
            return;
        }
        
        const user = result.recordset[0];
        console.log('✅ User found:');
        console.log('- Username:', user.username);
        console.log('- Auth Type:', user.auth_type);
        console.log('- Has Password:', user.password ? 'Yes' : 'No');
        
        if (!user.password) {
            console.log('\n💡 User has no password set. Creating one...');
            
            // Hash the password
            const testPassword = 'JanganGilaDonk@1';
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            
            console.log('🔐 Generated password hash:', hashedPassword.substring(0, 20) + '...');
            
            // Update the user with the hashed password
            const updateQuery = `
                UPDATE dbo.login 
                SET password = @password
                WHERE username = @username
            `;
            
            await executeQuery(updateQuery, { 
                username: 'widji.santoso',
                password: hashedPassword
            });
            
            console.log('✅ Password updated in database');
            
        } else {
            console.log('\n🔐 Testing password verification...');
            const testPassword = 'JanganGilaDonk@1';
            
            try {
                const isValid = await bcrypt.compare(testPassword, user.password);
                console.log('Password verification result:', isValid ? '✅ Valid' : '❌ Invalid');
                
                if (!isValid) {
                    console.log('\n🔄 Updating password with correct hash...');
                    const hashedPassword = await bcrypt.hash(testPassword, 10);
                    
                    const updateQuery = `
                        UPDATE dbo.login 
                        SET password = @password
                        WHERE username = @username
                    `;
                    
                    await executeQuery(updateQuery, { 
                        username: 'widji.santoso',
                        password: hashedPassword
                    });
                    
                    console.log('✅ Password updated with correct hash');
                }
            } catch (hashError) {
                console.log('❌ Error verifying password hash:', hashError.message);
                console.log('🔄 Creating new password hash...');
                
                const hashedPassword = await bcrypt.hash(testPassword, 10);
                
                const updateQuery = `
                    UPDATE dbo.login 
                    SET password = @password
                    WHERE username = @username
                `;
                
                await executeQuery(updateQuery, { 
                    username: 'widji.santoso',
                    password: hashedPassword
                });
                
                console.log('✅ New password hash created and saved');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testPasswordHash().catch(console.error);