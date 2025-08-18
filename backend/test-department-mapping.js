import dotenv from 'dotenv';
import { Client } from 'ldapts';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

async function testDepartmentMapping() {
    console.log('🏢 Testing Department Mapping from Active Directory\n');
    
    // Debug environment variables
    console.log('🔧 Environment Variables:');
    console.log('- LDAP_URL:', process.env.LDAP_URL || 'NOT SET');
    console.log('- LDAP_BIND_DN:', process.env.LDAP_BIND_DN || 'NOT SET');
    console.log('- LDAP_USER_SEARCH_BASE:', process.env.LDAP_USER_SEARCH_BASE || 'NOT SET');
    console.log('- LDAP_USER_SEARCH_FILTER:', process.env.LDAP_USER_SEARCH_FILTER || 'NOT SET');
    console.log('');
    
    if (!process.env.LDAP_URL) {
        console.error('❌ LDAP_URL is not set in environment variables');
        return;
    }
    
    const client = new Client({
        url: process.env.LDAP_URL,
        timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
        connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
        tlsOptions: {
            rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED === 'true'
        }
    });

    try {
        console.log('🔐 Step 1: Binding with service account...');
        await client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD);
        console.log('✅ Service account bind successful');
        
        console.log('\n🔍 Step 2: Searching for test user...');
        const testUsername = 'widji.santoso';
        const searchFilter = process.env.LDAP_USER_SEARCH_FILTER.replace('{username}', testUsername);
        
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
                'distinguishedName',
                'company',
                'division',
                'ou',
                'organizationalUnit',
                'physicalDeliveryOfficeName',
                'streetAddress',
                'l', // locality/city
                'st', // state
                'co', // country
                'description',
                'info',
                'extensionAttribute1',
                'extensionAttribute2',
                'extensionAttribute3',
                'extensionAttribute4',
                'extensionAttribute5'
            ]
        };
        
        const { searchEntries } = await client.search(process.env.LDAP_USER_SEARCH_BASE, searchOptions);
        
        if (searchEntries.length === 0) {
            console.log('❌ User not found in Active Directory');
            return;
        }
        
        const userEntry = searchEntries[0];
        console.log('✅ User found! Analyzing department-related attributes:\n');
        
        // Display all department-related attributes
        console.log('📋 Standard Department Attributes:');
        console.log('- department:', userEntry.department || 'NOT SET');
        console.log('- company:', userEntry.company || 'NOT SET');
        console.log('- division:', userEntry.division || 'NOT SET');
        console.log('- title:', userEntry.title || 'NOT SET');
        console.log('- physicalDeliveryOfficeName:', userEntry.physicalDeliveryOfficeName || 'NOT SET');
        
        console.log('\n🏢 Organizational Unit Information:');
        console.log('- distinguishedName:', userEntry.distinguishedName || 'NOT SET');
        
        // Parse OU from DN
        if (userEntry.distinguishedName) {
            const dnParts = userEntry.distinguishedName.split(',');
            const ouParts = dnParts.filter(part => part.trim().startsWith('OU='));
            console.log('- Organizational Units from DN:');
            ouParts.forEach((ou, index) => {
                console.log(`  ${index + 1}. ${ou.trim()}`);
            });
        }
        
        console.log('\n📍 Location Attributes:');
        console.log('- streetAddress:', userEntry.streetAddress || 'NOT SET');
        console.log('- l (locality/city):', userEntry.l || 'NOT SET');
        console.log('- st (state):', userEntry.st || 'NOT SET');
        console.log('- co (country):', userEntry.co || 'NOT SET');
        
        console.log('\n📝 Additional Information:');
        console.log('- description:', userEntry.description || 'NOT SET');
        console.log('- info:', userEntry.info || 'NOT SET');
        
        console.log('\n🔧 Extension Attributes:');
        for (let i = 1; i <= 5; i++) {
            const attrName = `extensionAttribute${i}`;
            console.log(`- ${attrName}:`, userEntry[attrName] || 'NOT SET');
        }
        
        console.log('\n👥 Group Memberships (first 5):');
        const groups = Array.isArray(userEntry.memberOf) ? userEntry.memberOf : [userEntry.memberOf].filter(Boolean);
        groups.slice(0, 5).forEach((group, index) => {
            console.log(`  ${index + 1}. ${group}`);
        });
        if (groups.length > 5) {
            console.log(`  ... and ${groups.length - 5} more groups`);
        }
        
        console.log('\n🎯 Current Department Mapping Logic:');
        console.log('- Currently using AD attribute: "department"');
        console.log('- Current value:', userEntry.department || 'NULL');
        console.log('- This value will be stored in local database as-is');
        
        console.log('\n💡 Recommendations:');
        if (!userEntry.department) {
            console.log('⚠️  The "department" attribute is not set in AD for this user');
            console.log('   Consider using one of these alternatives:');
            if (userEntry.company) console.log('   - company:', userEntry.company);
            if (userEntry.division) console.log('   - division:', userEntry.division);
            if (userEntry.physicalDeliveryOfficeName) console.log('   - physicalDeliveryOfficeName:', userEntry.physicalDeliveryOfficeName);
            
            // Suggest OU-based mapping
            if (userEntry.distinguishedName) {
                const dnParts = userEntry.distinguishedName.split(',');
                const ouParts = dnParts.filter(part => part.trim().startsWith('OU='));
                if (ouParts.length > 0) {
                    console.log('   - Or extract from OU structure:', ouParts[0].replace('OU=', '').trim());
                }
            }
        } else {
            console.log('✅ Department attribute is properly set in AD');
        }
        
        await client.unbind();
        console.log('\n✅ Department mapping analysis completed!');
        
    } catch (error) {
        console.error('❌ Error during department mapping test:', error.message);
        console.error('Error details:', error);
    } finally {
        try {
            await client.unbind();
        } catch (e) {
            // Ignore unbind errors
        }
    }
}

// Run the test
testDepartmentMapping().catch(console.error);