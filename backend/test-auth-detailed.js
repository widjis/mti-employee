import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testAuthentication() {
    console.log('Testing authentication with provided credentials...');
    console.log('Username: widji.santoso');
    console.log('Password: [REDACTED]');
    console.log('Server URL: http://localhost:8080/api/login');
    console.log('\n--- Testing Authentication ---');
    
    try {
        const response = await axios.post('http://localhost:8080/api/login', {
            username: 'widji.santoso',
            password: 'JanganGilaDonk@1'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Authentication successful!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Authentication failed!');
        
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Status Text:', error.response.statusText);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            console.log('No response received:', error.request);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testAuthentication();