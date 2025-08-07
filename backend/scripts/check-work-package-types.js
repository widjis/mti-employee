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

async function checkWorkPackageTypes() {
  try {
    console.log('🔍 Checking available work package types...');
    
    const projectId = await getProjectId();
    console.log(`✅ Project ID: ${projectId}`);
    
    // Get project-specific types
    const projectTypesResponse = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/types`,
      { headers }
    );
    
    console.log('\n📋 Available Work Package Types in Project:');
    console.log('=' .repeat(50));
    
    projectTypesResponse.data._embedded.elements.forEach(type => {
      console.log(`🏷️  ID: ${type.id} | Name: "${type.name}" | Color: ${type.color}`);
    });
    
    // Also get global types for reference
    console.log('\n📋 All Available Work Package Types (Global):');
    console.log('=' .repeat(50));
    
    const globalTypesResponse = await axios.get(
      `${OPENPROJECT_URL}/api/v3/types`,
      { headers }
    );
    
    globalTypesResponse.data._embedded.elements.forEach(type => {
      console.log(`🏷️  ID: ${type.id} | Name: "${type.name}" | Color: ${type.color}`);
    });
    
    console.log('\n💡 Recommendations for missing work packages:');
    const projectTypes = projectTypesResponse.data._embedded.elements;
    
    const milestoneType = projectTypes.find(t => t.name.toLowerCase().includes('milestone'));
    const taskType = projectTypes.find(t => t.name.toLowerCase().includes('task'));
    const epicType = projectTypes.find(t => t.name.toLowerCase().includes('epic'));
    const phaseType = projectTypes.find(t => t.name.toLowerCase().includes('phase'));
    
    console.log('\n🎯 For Testing & UAT Milestone:');
    if (milestoneType) {
      console.log(`  ✅ Use Milestone type: ID ${milestoneType.id} - "${milestoneType.name}"`);
    } else {
      console.log(`  ❌ No Milestone type found - use Task type instead`);
    }
    
    console.log('\n🚀 For Sprint 4:');
    if (epicType) {
      console.log(`  ✅ Use Epic type: ID ${epicType.id} - "${epicType.name}"`);
    } else if (phaseType) {
      console.log(`  ✅ Use Phase type: ID ${phaseType.id} - "${phaseType.name}"`);
    } else if (taskType) {
      console.log(`  ⚠️  Use Task type: ID ${taskType.id} - "${taskType.name}" (not ideal but workable)`);
    } else {
      console.log(`  ❌ No suitable type found for Sprint`);
    }
    
  } catch (error) {
    console.error('❌ Error checking work package types:', error.message);
    process.exit(1);
  }
}

// Run the check
checkWorkPackageTypes();