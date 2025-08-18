import { executeQuery } from './config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

async function createDomainUser() {
  console.log('🔄 Creating domain user account for widji.santoso...');
  
  try {
    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT * FROM dbo.login WHERE domain_username = @domainUsername OR username = @username',
      { domainUsername: 'widji.santoso', username: 'widji.santoso' }
    );
    
    if (existingUser.length > 0) {
      console.log('⚠️  User already exists. Updating role to superadmin...');
      
      await executeQuery(
        `UPDATE dbo.login 
         SET Role = 'superadmin', 
             auth_type = 'domain',
             domain_username = 'widji.santoso',
             last_domain_sync = GETDATE(),
             updated_at = GETDATE()
         WHERE Id = @userId`,
        { userId: existingUser[0].Id }
      );
      
      console.log('✅ User role updated to superadmin');
    } else {
      console.log('➕ Creating new domain user account...');
      
      // Create a placeholder password (won't be used for domain auth)
      const placeholderPassword = await bcrypt.hash('domain-user-placeholder', 12);
      
      await executeQuery(
        `INSERT INTO dbo.login 
         (username, password, Role, name, department, auth_type, domain_username, last_domain_sync, created_at, updated_at)
         VALUES (@username, @password, 'superadmin', @name, @department, 'domain', @domainUsername, GETDATE(), GETDATE(), GETDATE())`,
        { 
          username: 'widji.santoso', 
          password: placeholderPassword, 
          name: 'Widji Santoso',
          department: 'IT',
          domainUsername: 'widji.santoso' 
        }
      );
      
      console.log('✅ Domain user account created successfully');
    }
    
    // Verify the user was created/updated
    const verifyUser = await executeQuery(
      'SELECT Id, username, Role, auth_type, domain_username FROM dbo.login WHERE domain_username = @domainUsername',
      { domainUsername: 'widji.santoso' }
    );
    
    if (verifyUser.length > 0) {
      console.log('\n📋 User Account Details:');
      console.log('- ID:', verifyUser[0].Id);
      console.log('- Username:', verifyUser[0].username);
      console.log('- Role:', verifyUser[0].Role);
      console.log('- Auth Type:', verifyUser[0].auth_type);
      console.log('- Domain Username:', verifyUser[0].domain_username);
      
      console.log('\n✅ User can now log in with:');
      console.log('- Authentication Type: Domain Account');
      console.log('- Username: widji.santoso');
      console.log('- Password: [AD Password]');
      console.log('\n⚠️  Note: LDAP connection issues prevent automatic authentication.');
      console.log('   The user account is ready for when LDAP connectivity is restored.');
    }
    
  } catch (error) {
    console.error('❌ Error creating domain user:', error.message);
    console.error('Error details:', error);
  }
}

createDomainUser();