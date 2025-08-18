import { Client } from 'ldapts';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

async function testLDAPSAuthentication() {
    console.log('🔍 Testing LDAPS Authentication...');
    console.log('LDAP URL:', process.env.LDAP_URL);
    console.log('Base DN:', process.env.LDAP_BASE_DN);
    console.log('Bind DN:', process.env.LDAP_BIND_DN);
    console.log('User Search Base:', process.env.LDAP_USER_SEARCH_BASE);
    console.log('TLS Reject Unauthorized:', process.env.LDAP_TLS_REJECT_UNAUTHORIZED);
    
    const client = new Client({
        url: process.env.LDAP_URL,
        timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
        connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
        tlsOptions: {
            rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
    });

    try {
        console.log('\n📡 Step 1: Testing service account bind...');
        await client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD);
        console.log('✅ Service account bind successful!');
        
        console.log('\n🔍 Step 2: Searching for user widji.santoso...');
        const searchFilter = process.env.LDAP_USER_SEARCH_FILTER.replace('{username}', 'widji.santoso');
        console.log('Search filter:', searchFilter);
        
        const searchOptions = {
            scope: 'sub',
            filter: searchFilter,
            attributes: [
                'sAMAccountName',
                'displayName', 
                'mail',
                'department',
                'title',
                'telephoneNumber',
                'memberOf',
                'userAccountControl',
                'distinguishedName'
            ]
        };
        
        const { searchEntries } = await client.search(process.env.LDAP_USER_SEARCH_BASE, searchOptions);
        
        if (searchEntries.length === 0) {
            console.log('❌ User not found in Active Directory');
            return;
        }
        
        const userEntry = searchEntries[0];
        console.log('✅ User found!');
        console.log('User Details:');
        console.log('- sAMAccountName:', userEntry.sAMAccountName);
        console.log('- displayName:', userEntry.displayName);
        console.log('- mail:', userEntry.mail);
        console.log('- department:', userEntry.department);
        console.log('- userAccountControl:', userEntry.userAccountControl);
        console.log('- distinguishedName:', userEntry.distinguishedName);
        
        // Check if account is disabled
        const userAccountControl = parseInt(userEntry.userAccountControl) || 0;
        if (userAccountControl & 2) {
            console.log('❌ User account is disabled in Active Directory');
            return;
        }
        
        console.log('✅ User account is enabled');
        
        // Unbind service account
        await client.unbind();
        
        console.log('\n🔐 Step 3: Testing user authentication...');
        const userClient = new Client({
            url: process.env.LDAP_URL,
            timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
            connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
            tlsOptions: {
                rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
            }
        });
        
        try {
            await userClient.bind(userEntry.distinguishedName, 'JanganGilaDonk@1');
            console.log('✅ User authentication successful!');
            await userClient.unbind();
        } catch (authError) {
            console.log('❌ User authentication failed:', authError.message);
        }
        
    } catch (error) {
        console.error('❌ LDAPS Test Error:', error.message);
        console.error('Error details:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall
        });
    } finally {
        try {
            await client.unbind();
        } catch (e) {
            // Ignore unbind errors
        }
    }
}

testLDAPSAuthentication().catch(console.error);