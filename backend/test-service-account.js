import { Client } from 'ldapts';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function testServiceAccount() {
    console.log('🔍 Testing LDAP Service Account Credentials...');
    console.log('LDAP URL:', process.env.LDAP_URL);
    console.log('Bind DN:', process.env.LDAP_BIND_DN);
    console.log('TLS Reject Unauthorized:', process.env.LDAP_TLS_REJECT_UNAUTHORIZED);
    
    // Test with different TLS configurations
    const configs = [
        {
            name: 'LDAPS with rejectUnauthorized: false',
            url: process.env.LDAP_URL,
            tlsOptions: { rejectUnauthorized: false }
        },
        {
            name: 'LDAPS with rejectUnauthorized: true',
            url: process.env.LDAP_URL,
            tlsOptions: { rejectUnauthorized: true }
        },
        {
            name: 'Plain LDAP (fallback)',
            url: 'ldap://10.60.10.56:389',
            tlsOptions: {}
        }
    ];
    
    for (const config of configs) {
        console.log(`\n🧪 Testing: ${config.name}`);
        
        const client = new Client({
            url: config.url,
            timeout: 10000,
            connectTimeout: 15000,
            tlsOptions: config.tlsOptions
        });
        
        try {
            console.log('📡 Attempting to bind...');
            await client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD);
            console.log('✅ Service account bind successful!');
            
            // Test a simple search
            console.log('🔍 Testing search capability...');
            const { searchEntries } = await client.search(process.env.LDAP_BASE_DN, {
                scope: 'base',
                filter: '(objectClass=*)',
                attributes: ['defaultNamingContext']
            });
            
            console.log('✅ Search successful!');
            await client.unbind();
            
            console.log(`🎉 SUCCESS: ${config.name} works!`);
            return config;
            
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            if (error.code) {
                console.log(`   Error Code: ${error.code}`);
            }
            
            try {
                await client.unbind();
            } catch (e) {
                // Ignore unbind errors
            }
        }
    }
    
    console.log('\n❌ All configurations failed!');
    return null;
}

testServiceAccount().catch(console.error);