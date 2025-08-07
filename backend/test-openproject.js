#!/usr/bin/env node

/**
 * OpenProject Connection Test Script
 * 
 * This script tests the connection to OpenProject API
 * Run with: node test-openproject.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n=== ${msg} ===${colors.reset}`)
};

const testOpenProjectConnection = async () => {
  console.log('Script started...');
  log.header('OpenProject Connection Test');
  
  // Check environment variables
  log.info('Checking environment variables...');
  console.log('Environment loaded:', {
    url: process.env.OPENPROJECT_URL,
    hasKey: !!process.env.OPENPROJECT_API_KEY,
    version: process.env.OPENPROJECT_API_VERSION
  });
  
  const requiredVars = {
    OPENPROJECT_URL: process.env.OPENPROJECT_URL,
    OPENPROJECT_API_KEY: process.env.OPENPROJECT_API_KEY,
    OPENPROJECT_API_VERSION: process.env.OPENPROJECT_API_VERSION || 'v3'
  };
  
  let hasAllVars = true;
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      log.error(`Missing environment variable: ${key}`);
      hasAllVars = false;
    } else {
      if (key === 'OPENPROJECT_API_KEY') {
        log.success(`${key}: ${'*'.repeat(value.length)} (hidden)`);
      } else {
        log.success(`${key}: ${value}`);
      }
    }
  }
  
  if (!hasAllVars) {
    log.error('Please set all required environment variables in your .env file');
    log.info('Required variables:');
    console.log('  OPENPROJECT_URL=https://your-openproject-instance.com');
    console.log('  OPENPROJECT_API_KEY=your_api_key_here');
    console.log('  OPENPROJECT_API_VERSION=v3');
    process.exit(1);
  }
  
  // Test basic connectivity
  log.header('Testing API Connection');
  
  try {
    const baseURL = `${requiredVars.OPENPROJECT_URL}/api/${requiredVars.OPENPROJECT_API_VERSION}`;
    log.info(`Connecting to: ${baseURL}`);
    
    const client = axios.create({
      baseURL,
      headers: {
        'Authorization': `apikey ${requiredVars.OPENPROJECT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    // Test projects endpoint
    log.info('Testing /projects endpoint...');
    const projectsResponse = await client.get('/projects?pageSize=5');
    
    log.success('Connection successful!');
    log.success(`API Version: ${projectsResponse.data.apiVersion || 'Unknown'}`);
    log.success(`Total Projects: ${projectsResponse.data.total || 0}`);
    log.success(`Projects Found: ${projectsResponse.data._embedded?.elements?.length || 0}`);
    
    // Display projects if any
    if (projectsResponse.data._embedded?.elements?.length > 0) {
      log.info('\nProjects:');
      projectsResponse.data._embedded.elements.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
      });
    } else {
      log.warning('No projects found. You may want to create a test project.');
    }
    
    // Test users endpoint
    log.info('\nTesting /users endpoint...');
    const usersResponse = await client.get('/users?pageSize=5');
    
    log.success(`Total Users: ${usersResponse.data.total || 0}`);
    log.success(`Users Found: ${usersResponse.data._embedded?.elements?.length || 0}`);
    
    // Test work packages endpoint
    log.info('\nTesting /work_packages endpoint...');
    const workPackagesResponse = await client.get('/work_packages?pageSize=5');
    
    log.success(`Total Work Packages: ${workPackagesResponse.data.total || 0}`);
    log.success(`Work Packages Found: ${workPackagesResponse.data._embedded?.elements?.length || 0}`);
    
    // Summary
    log.header('Test Summary');
    log.success('All API endpoints are accessible');
    log.success('Authentication is working correctly');
    log.success('OpenProject integration is ready!');
    
    log.info('\nNext steps:');
    console.log('  1. Install axios dependency: npm install axios');
    console.log('  2. Copy OpenProject service code from documentation');
    console.log('  3. Add OpenProject routes to your app.js');
    console.log('  4. Test employee synchronization');
    
    return true;
    
  } catch (error) {
    log.header('Connection Failed');
    
    if (error.code === 'ENOTFOUND') {
      log.error('DNS resolution failed - check your OpenProject URL');
      log.info('Make sure your OpenProject instance is accessible');
    } else if (error.code === 'ECONNREFUSED') {
      log.error('Connection refused - OpenProject instance may be down');
    } else if (error.code === 'ETIMEDOUT') {
      log.error('Connection timeout - check network connectivity');
    } else if (error.response) {
      const { status, data } = error.response;
      log.error(`HTTP ${status}: ${data.message || data.error || 'Unknown error'}`);
      
      if (status === 401) {
        log.warning('Authentication failed - check your API key');
        log.info('To generate a new API key:');
        console.log('  1. Login to OpenProject');
        console.log('  2. Go to My Account → Access Tokens');
        console.log('  3. Create new API Token');
        console.log('  4. Update OPENPROJECT_API_KEY in .env file');
      } else if (status === 403) {
        log.warning('Access forbidden - check user permissions');
      } else if (status === 404) {
        log.warning('API endpoint not found - check OpenProject version');
      }
    } else {
      log.error(`Unexpected error: ${error.message}`);
    }
    
    log.info('\nTroubleshooting:');
    console.log('  1. Verify OpenProject URL is correct and accessible');
    console.log('  2. Check API key is valid and has proper permissions');
    console.log('  3. Ensure OpenProject instance is running');
    console.log('  4. Check network connectivity and firewall settings');
    
    return false;
  }
};

// Run the test
console.log('About to run test...');
testOpenProjectConnection()
  .then((success) => {
    console.log('Test completed, success:', success);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

export default testOpenProjectConnection;