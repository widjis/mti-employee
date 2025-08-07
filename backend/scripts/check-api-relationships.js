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

async function getAllWorkPackagesWithRelations(projectId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=100&filters=[{"status":{"operator":"o","values":[]}}]`,
      { headers }
    );
    
    return response.data._embedded.elements;
  } catch (error) {
    console.error('Error fetching work packages:', error.message);
    throw error;
  }
}

async function getWorkPackageDetails(workPackageId) {
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

async function checkAPIRelationships() {
  try {
    console.log('🔍 Checking OpenProject API relationships...');
    
    const projectId = await getProjectId();
    console.log(`📋 Project ID: ${projectId}`);
    
    const workPackages = await getAllWorkPackagesWithRelations(projectId);
    console.log(`📦 Total work packages: ${workPackages.length}`);
    
    console.log('\n📊 Work Package Details with Relationships:');
    console.log('=' .repeat(80));
    
    for (const wp of workPackages) {
      const details = await getWorkPackageDetails(wp.id);
      if (!details) continue;
      
      const type = details.type?.name || 'Unknown';
      const subject = details.subject;
      const parentId = details.parent?.href ? details.parent.href.split('/').pop() : null;
      const children = details.children || [];
      
      console.log(`\n🔹 ID: ${wp.id} | Type: ${type}`);
      console.log(`   Subject: ${subject}`);
      
      if (parentId) {
        console.log(`   👆 Parent: ${parentId}`);
      }
      
      if (children.length > 0) {
        const childIds = children.map(child => child.href.split('/').pop());
        console.log(`   👇 Children: ${childIds.join(', ')}`);
      }
      
      if (!parentId && children.length === 0) {
        console.log(`   ⚠️  No relationships found`);
      }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('🎯 Relationship Analysis Complete');
    
    // Categorize by type
    const byType = {};
    for (const wp of workPackages) {
      const details = await getWorkPackageDetails(wp.id);
      if (!details) continue;
      
      const type = details.type?.name || 'Unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        id: wp.id,
        subject: details.subject,
        parent: details.parent?.href ? details.parent.href.split('/').pop() : null,
        childrenCount: details.children?.length || 0
      });
    }
    
    console.log('\n📈 Summary by Type:');
    for (const [type, items] of Object.entries(byType)) {
      console.log(`\n${type} (${items.length}):`);
      items.forEach(item => {
        const parentInfo = item.parent ? ` → Parent: ${item.parent}` : '';
        const childInfo = item.childrenCount > 0 ? ` → Children: ${item.childrenCount}` : '';
        console.log(`  • ${item.id}: ${item.subject}${parentInfo}${childInfo}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking relationships:', error.message);
    process.exit(1);
  }
}

checkAPIRelationships();