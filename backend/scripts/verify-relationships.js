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

async function getWorkPackageChildren(workPackageId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}/children`,
      { headers }
    );
    
    return response.data._embedded?.elements || [];
  } catch (error) {
    // If no children endpoint or error, return empty array
    return [];
  }
}

async function getWorkPackage(workPackageId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching work package ${workPackageId}:`, error.message);
    return null;
  }
}

async function verifyRelationships() {
  try {
    console.log('🔍 Verifying OpenProject relationships...');
    
    const projectId = await getProjectId();
    console.log(`📋 Project ID: ${projectId}`);
    
    // Get all work packages
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=100`,
      { headers }
    );
    
    const workPackages = response.data._embedded.elements;
    console.log(`📦 Total work packages: ${workPackages.length}`);
    
    // Focus on epics (125-129)
    const epics = workPackages.filter(wp => 
      wp.subject.includes('📚 Epic:')
    );
    
    console.log('\n📚 Epic-Story Relationships:');
    console.log('=' .repeat(60));
    
    for (const epic of epics) {
      console.log(`\n🔹 Epic ${epic.id}: ${epic.subject}`);
      
      // Get children of this epic
      const children = await getWorkPackageChildren(epic.id);
      
      if (children.length > 0) {
        console.log(`   👇 Children (${children.length}):`);
        for (const child of children) {
          console.log(`      • ${child.id}: ${child.subject}`);
        }
      } else {
        console.log(`   ⚠️  No children found`);
      }
      
      // Also check via parent relationship
      const userStories = workPackages.filter(wp => 
        wp.subject.includes('👤 User Story:')
      );
      
      const relatedStories = [];
      for (const story of userStories) {
        const storyDetails = await getWorkPackage(story.id);
        if (storyDetails && storyDetails.parent) {
          const parentId = storyDetails.parent.href.split('/').pop();
          if (parentId == epic.id) {
            relatedStories.push(story);
          }
        }
      }
      
      if (relatedStories.length > 0) {
        console.log(`   ✅ Related stories via parent (${relatedStories.length}):`);
        for (const story of relatedStories) {
          console.log(`      • ${story.id}: ${story.subject}`);
        }
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Relationship verification complete');
    
  } catch (error) {
    console.error('❌ Error verifying relationships:', error.message);
    process.exit(1);
  }
}

verifyRelationships();