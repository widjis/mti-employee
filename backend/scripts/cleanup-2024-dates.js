import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configure axios to ignore SSL certificate errors for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

const OPENPROJECT_URL = process.env.OPENPROJECT_URL || 'https://project.merdekabattery.com';
const API_KEY = process.env.OPENPROJECT_API_KEY;

if (!API_KEY) {
  console.error('OPENPROJECT_API_KEY is required in .env file');
  process.exit(1);
}

const headers = {
  'Authorization': `Basic ${Buffer.from(`apikey:${API_KEY}`).toString('base64')}`,
  'Content-Type': 'application/json'
};

async function getProjectId() {
  try {
    const response = await axios.get(`${OPENPROJECT_URL}/api/v3/projects`, { headers });
    const project = response.data._embedded.elements.find(p => 
      p.name.includes('MTI Employee') || p.identifier.includes('mti-employee')
    );
    
    if (!project) {
      throw new Error('MTI Employee project not found');
    }
    
    return project.id;
  } catch (error) {
    console.error('Error getting project ID:', error.message);
    throw error;
  }
}

async function getWorkPackages(projectId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=100`,
      { headers }
    );
    return response.data._embedded.elements;
  } catch (error) {
    console.error('Error getting work packages:', error.message);
    throw error;
  }
}

async function deleteWorkPackage(workPackageId) {
  try {
    const response = await axios.delete(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      { headers }
    );
    return response.status === 204;
  } catch (error) {
    console.error(`Error deleting work package ${workPackageId}:`, error.response?.data || error.message);
    return false;
  }
}

function isUnnecessaryWorkPackage(wp) {
  const subject = wp.subject.toLowerCase();
  const description = wp.description?.raw?.toLowerCase() || '';
  
  // Check for 2024 dates in dates
  const has2024Dates = (
    (wp.startDate && wp.startDate.includes('2024')) ||
    (wp.dueDate && wp.dueDate.includes('2024'))
  );
  
  // Check for outdated or test content
  const isTestOrOutdated = (
    subject.includes('test') ||
    subject.includes('demo') ||
    subject.includes('sample') ||
    subject.includes('placeholder') ||
    subject.includes('2024') ||
    description.includes('2024') ||
    description.includes('test') ||
    description.includes('placeholder')
  );
  
  // Check for duplicate or redundant entries
  const isDuplicate = (
    subject.includes('duplicate') ||
    subject.includes('old') ||
    subject.includes('backup') ||
    subject.includes('copy')
  );
  
  return has2024Dates || isTestOrOutdated || isDuplicate;
}

async function cleanupWorkPackages() {
  try {
    console.log('🔍 Getting project ID...');
    const projectId = await getProjectId();
    console.log(`✅ Found project ID: ${projectId}`);
    
    console.log('📋 Getting work packages...');
    const workPackages = await getWorkPackages(projectId);
    console.log(`✅ Found ${workPackages.length} work packages`);
    
    console.log('\n🔍 Analyzing work packages for cleanup...');
    
    const unnecessaryPackages = [];
    const keepPackages = [];
    
    for (const wp of workPackages) {
      if (isUnnecessaryWorkPackage(wp)) {
        unnecessaryPackages.push(wp);
        console.log(`❌ UNNECESSARY: ${wp.id} - ${wp.subject}`);
        if (wp.startDate && wp.startDate.includes('2024')) {
          console.log(`   📅 Has 2024 start date: ${wp.startDate}`);
        }
        if (wp.dueDate && wp.dueDate.includes('2024')) {
          console.log(`   📅 Has 2024 due date: ${wp.dueDate}`);
        }
      } else {
        keepPackages.push(wp);
        console.log(`✅ KEEP: ${wp.id} - ${wp.subject}`);
      }
    }
    
    console.log('\n📊 Analysis Summary:');
    console.log(`❌ Unnecessary work packages: ${unnecessaryPackages.length}`);
    console.log(`✅ Work packages to keep: ${keepPackages.length}`);
    console.log(`📋 Total work packages: ${workPackages.length}`);
    
    if (unnecessaryPackages.length === 0) {
      console.log('\n✨ No unnecessary work packages found - project is clean!');
      return;
    }
    
    console.log('\n🗑️  Deleting unnecessary work packages...');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const wp of unnecessaryPackages) {
      console.log(`🗑️  Deleting: ${wp.id} - ${wp.subject}`);
      
      const success = await deleteWorkPackage(wp.id);
      if (success) {
        deletedCount++;
        console.log(`  ✅ Deleted successfully`);
      } else {
        failedCount++;
        console.log(`  ❌ Failed to delete`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 Cleanup Results:');
    console.log(`✅ Successfully deleted: ${deletedCount}`);
    console.log(`❌ Failed to delete: ${failedCount}`);
    console.log(`📋 Remaining work packages: ${keepPackages.length}`);
    
    if (deletedCount > 0) {
      console.log('\n🎉 Work package cleanup completed successfully!');
      console.log('🔗 Check your cleaned project at:', `${OPENPROJECT_URL}/projects/mti-employee-enhancement`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupWorkPackages();