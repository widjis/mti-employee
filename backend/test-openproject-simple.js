#!/usr/bin/env node

/**
 * Simple OpenProject Connection Test (with SSL bypass for testing)
 */

import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Create axios instance with SSL bypass for testing
const api = axios.create({
  baseURL: `${process.env.OPENPROJECT_URL}/api/v3`,
  headers: {
    'Authorization': `Basic ${Buffer.from(`apikey:${process.env.OPENPROJECT_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json'
  },
  // Bypass SSL verification for testing (NOT for production!)
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const testConnection = async () => {
  console.log('🚀 Testing OpenProject Connection...');
  console.log(`📍 URL: ${process.env.OPENPROJECT_URL}`);
  console.log(`🔑 API Key: ${process.env.OPENPROJECT_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log('');

  try {
    // Test basic connection
    console.log('1️⃣ Testing basic API connection...');
    const response = await api.get('/');
    console.log('✅ API Root accessible');
    console.log(`   Version: ${response.data._type || 'Unknown'}`);
    console.log('');

    // Test projects endpoint
    console.log('2️⃣ Testing projects endpoint...');
    const projectsResponse = await api.get('/projects');
    console.log(`✅ Projects endpoint accessible`);
    console.log(`   Total projects: ${projectsResponse.data.total || 0}`);
    
    if (projectsResponse.data._embedded && projectsResponse.data._embedded.elements) {
      console.log('   Projects found:');
      projectsResponse.data._embedded.elements.slice(0, 3).forEach((project, index) => {
        console.log(`     ${index + 1}. ${project.name} (ID: ${project.id})`);
      });
    }
    console.log('');

    // Test users endpoint
    console.log('3️⃣ Testing users endpoint...');
    const usersResponse = await api.get('/users');
    console.log(`✅ Users endpoint accessible`);
    console.log(`   Total users: ${usersResponse.data.total || 0}`);
    console.log('');

    // Test work packages endpoint
    console.log('4️⃣ Testing work packages endpoint...');
    const workPackagesResponse = await api.get('/work_packages?pageSize=5');
    console.log(`✅ Work packages endpoint accessible`);
    console.log(`   Total work packages: ${workPackagesResponse.data.total || 0}`);
    console.log('');

    console.log('🎉 All tests passed! OpenProject API is working correctly.');
    console.log('');
    console.log('⚠️  Note: SSL verification was bypassed for testing.');
    console.log('   For production, ensure proper SSL certificates are configured.');
    
    return true;

  } catch (error) {
    console.log('❌ Connection failed!');
    console.log(`   Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('');
        console.log('🔐 Authentication failed. Please check:');
        console.log('   1. API key is correct');
        console.log('   2. API key has proper permissions');
        console.log('   3. User account is active');
      }
    }
    
    return false;
  }
};

// Run the test
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });