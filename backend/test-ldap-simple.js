import { Client } from 'ldapts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testLDAPConnection() {
  console.log('🔍 Testing LDAP Connection...');
  console.log('LDAP URL:', process.env.LDAP_URL);
  console.log('Base DN:', process.env.LDAP_BASE_DN);
  console.log('Bind DN:', process.env.LDAP_BIND_DN);
  console.log('User Search Base:', process.env.LDAP_USER_SEARCH_BASE);
  
  const client = new Client({
    url: process.env.LDAP_URL,
    timeout: 30000,
    connectTimeout: 30000,
    reconnect: {
      initialDelay: 100,
      maxDelay: 1000,
      failAfter: 3
    },
    tlsOptions: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n🔐 Attempting to bind with service account...');
    await client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD);
    console.log('✅ Service account bind successful!');

    console.log('\n🔍 Testing user search for widji.santoso...');
    const searchOptions = {
      scope: 'sub',
      filter: '(sAMAccountName=widji.santoso)',
      attributes: ['sAMAccountName', 'displayName', 'mail', 'memberOf', 'userAccountControl']
    };

    const { searchEntries } = await client.search(process.env.LDAP_USER_SEARCH_BASE, searchOptions);
    
    if (searchEntries.length > 0) {
      console.log('✅ User found!');
      const user = searchEntries[0];
      console.log('User Details:');
      console.log('- sAMAccountName:', user.sAMAccountName);
      console.log('- displayName:', user.displayName);
      console.log('- mail:', user.mail);
      console.log('- userAccountControl:', user.userAccountControl);
      console.log('- memberOf:', user.memberOf);
      
      // Check if user is in superadmin group
      const superadminGroup = process.env.LDAP_GROUP_SUPERADMIN;
      const isSuperadmin = Array.isArray(user.memberOf) 
        ? user.memberOf.includes(superadminGroup)
        : user.memberOf === superadminGroup;
      
      console.log('\n🔍 Group Membership Check:');
      console.log('- Looking for group:', superadminGroup);
      console.log('- Is member of superadmin group:', isSuperadmin);
    } else {
      console.log('❌ User not found in Active Directory');
    }

    await client.unbind();
    console.log('\n✅ LDAP test completed successfully!');
    
  } catch (error) {
    console.error('❌ LDAP Test Error:', error.message);
    console.error('Error details:', error);
  } finally {
    try {
      await client.unbind();
    } catch (e) {
      // Ignore unbind errors
    }
  }
}

testLDAPConnection();