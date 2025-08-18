import { Client } from 'ldapts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ldapConfig = {
  url: process.env.LDAP_URL || 'ldap://10.60.10.56:389',
  baseDN: process.env.LDAP_BASE_DN || 'DC=mbma,DC=com',
  bindDN: process.env.LDAP_BIND_DN || 'CN=MTI SysAdmin,OU=Testing Environment,OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com',
  bindPassword: process.env.LDAP_BIND_PASSWORD || 'Sy54dm1n@#Mb25',
  userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'DC=mbma,DC=com',
  userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={username})',
  timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
  connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
  tlsOptions: {
    rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
  }
};

async function testLDAPConnection() {
  console.log('🔍 Testing LDAP Connection...');
  console.log('LDAP URL:', ldapConfig.url);
  console.log('Base DN:', ldapConfig.baseDN);
  console.log('Bind DN:', ldapConfig.bindDN);
  console.log('User Search Base:', ldapConfig.userSearchBase);
  
  const client = new Client({
    url: ldapConfig.url,
    timeout: ldapConfig.timeout,
    connectTimeout: ldapConfig.connectTimeout,
    tlsOptions: ldapConfig.tlsOptions
  });

  try {
    console.log('\n📡 Attempting to connect to LDAP server...');
    
    // Test basic connection
    await client.bind(ldapConfig.bindDN, ldapConfig.bindPassword);
    console.log('✅ Successfully connected and authenticated with service account');
    
    // Test user search
    const testUsername = 'widji.santoso';
    const searchFilter = ldapConfig.userSearchFilter.replace('{username}', testUsername);
    console.log(`\n🔍 Searching for user: ${testUsername}`);
    console.log('Search filter:', searchFilter);
    
    const searchOptions = {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['sAMAccountName', 'displayName', 'mail', 'memberOf', 'userPrincipalName']
    };
    
    const searchResult = await client.search(ldapConfig.userSearchBase, searchOptions);
    
    if (searchResult.searchEntries.length > 0) {
      console.log('✅ User found in Active Directory:');
      const user = searchResult.searchEntries[0];
      console.log('- sAMAccountName:', user.sAMAccountName);
      console.log('- displayName:', user.displayName);
      console.log('- mail:', user.mail);
      console.log('- userPrincipalName:', user.userPrincipalName);
      console.log('- memberOf:', user.memberOf?.slice(0, 3) || 'No groups found');
    } else {
      console.log('❌ User not found in Active Directory');
    }
    
    await client.unbind();
    console.log('\n✅ LDAP connection test completed successfully');
    
  } catch (error) {
    console.error('❌ LDAP Connection Error:', error.message);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
  } finally {
    try {
      await client.unbind();
    } catch (e) {
      // Ignore unbind errors
    }
  }
}

// Run the test
testLDAPConnection().catch(console.error);