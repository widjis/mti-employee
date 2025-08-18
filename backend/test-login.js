import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('🔄 Testing login for widji.santoso...');
    
    const response = await fetch('http://localhost:8080/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'widji.santoso',
        password: 'test123'
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Login successful!');
      console.log('🎫 Token:', data.token ? 'Present' : 'Missing');
      console.log('👤 User:', data.user);
    } else {
      console.log('❌ Login failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('🚨 Error:', errorData);
      } catch (e) {
        console.log('🚨 Raw error:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin();