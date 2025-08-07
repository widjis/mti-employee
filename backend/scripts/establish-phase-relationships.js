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

async function updateWorkPackageParent(workPackageId, parentId) {
  try {
    // First, get the current work package to obtain lockVersion
    const getResponse = await axios.get(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      { headers }
    );
    
    const currentWorkPackage = getResponse.data;
    
    const updateData = {
      lockVersion: currentWorkPackage.lockVersion,
      _links: {
        parent: { href: `${OPENPROJECT_URL}/api/v3/work_packages/${parentId}` }
      }
    };
    
    const response = await axios.patch(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      updateData,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error updating work package ${workPackageId}:`, error.response?.data || error.message);
    return null;
  }
}

async function establishPhaseRelationships() {
  try {
    console.log('🔗 Establishing Phase-based Relationships...');
    
    const projectId = await getProjectId();
    console.log(`📋 Project ID: ${projectId}`);
    
    // Get all work packages
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=100`,
      { headers }
    );
    
    const workPackages = response.data._embedded.elements;
    console.log(`📦 Total work packages: ${workPackages.length}`);
    
    // Categorize work packages
    const phases = workPackages.filter(wp => 
      wp.subject.includes('🚀 Phase') || 
      wp.subject.includes('📋 Phase') || 
      wp.subject.includes('🏗️ Phase') || 
      wp.subject.includes('⚡ Phase') || 
      wp.subject.includes('🧪 Phase') || 
      wp.subject.includes('🎉 Phase')
    );
    
    const sprints = workPackages.filter(wp => wp.subject.includes('🏃‍♂️ Sprint'));
    const epics = workPackages.filter(wp => wp.subject.includes('📚 Epic:'));
    const userStories = workPackages.filter(wp => wp.subject.includes('👤 User Story:'));
    
    console.log('\n📊 Found:');
    console.log(`  🏗️ Phases: ${phases.length}`);
    console.log(`  🏃‍♂️ Sprints: ${sprints.length}`);
    console.log(`  📚 Epics: ${epics.length}`);
    console.log(`  👤 User Stories: ${userStories.length}`);
    
    // Create phase mapping
    const phaseMap = {};
    phases.forEach(phase => {
      phaseMap[phase.subject] = phase.id;
    });
    
    // Create epic mapping
    const epicMap = {};
    epics.forEach(epic => {
      const epicName = epic.subject.replace('📚 ', '');
      epicMap[epicName] = epic.id;
    });
    
    console.log('\n🔗 Step 1: Linking Sprints to Phases...');
    
    // Sprint to Phase mapping
    const sprintPhaseMapping = {
      'Sprint 0: Project Setup & Planning': '📋 Phase 2: Planning & Analysis',
      'Sprint 1: Authentication & Core Setup': '🏗️ Phase 3: Development Phase 1',
      'Sprint 2: Employee Management Features': '🏗️ Phase 3: Development Phase 1',
      'Sprint 3: File Upload & Advanced Features': '⚡ Phase 4: Development Phase 2',
      'Sprint 4: Testing, Optimization & Deployment': '🧪 Phase 5: Testing & UAT'
    };
    
    let sprintLinked = 0;
    for (const sprint of sprints) {
      const sprintName = sprint.subject.replace('🏃‍♂️ ', '');
      const targetPhase = sprintPhaseMapping[sprintName];
      
      if (targetPhase && phaseMap[targetPhase]) {
        const result = await updateWorkPackageParent(sprint.id, phaseMap[targetPhase]);
        if (result) {
          console.log(`  ✅ ${sprint.subject} → ${targetPhase}`);
          sprintLinked++;
        } else {
          console.log(`  ❌ Failed: ${sprint.subject} → ${targetPhase}`);
        }
      }
    }
    
    console.log('\n🔗 Step 2: Linking Epics to Phases...');
    
    // Epic to Phase mapping
    const epicPhaseMapping = {
      'Epic: Authentication & Security': '🏗️ Phase 3: Development Phase 1',
      'Epic: Employee Data Management': '🏗️ Phase 3: Development Phase 1',
      'Epic: File Upload & Processing': '⚡ Phase 4: Development Phase 2',
      'Epic: Search & Reporting': '⚡ Phase 4: Development Phase 2',
      'Epic: Dashboard & Analytics': '⚡ Phase 4: Development Phase 2'
    };
    
    let epicLinked = 0;
    for (const epic of epics) {
      const epicName = epic.subject.replace('📚 ', '');
      const targetPhase = epicPhaseMapping[epicName];
      
      if (targetPhase && phaseMap[targetPhase]) {
        const result = await updateWorkPackageParent(epic.id, phaseMap[targetPhase]);
        if (result) {
          console.log(`  ✅ ${epic.subject} → ${targetPhase}`);
          epicLinked++;
        } else {
          console.log(`  ❌ Failed: ${epic.subject} → ${targetPhase}`);
        }
      }
    }
    
    console.log('\n🔗 Step 3: Linking User Stories to Epics...');
    
    // User Story to Epic mapping
    const storyEpicMapping = {
      'As a user, I can securely login to the system': 'Epic: Authentication & Security',
      'As an admin, I can manage user roles and permissions': 'Epic: Authentication & Security',
      'As a user, I can reset my password securely': 'Epic: Authentication & Security',
      'As an admin, I can add new employees to the system': 'Epic: Employee Data Management',
      'As an admin, I can update employee information': 'Epic: Employee Data Management',
      'As an admin, I can deactivate employee accounts': 'Epic: Employee Data Management',
      'As a user, I can view employee profiles': 'Epic: Employee Data Management',
      'As an admin, I can upload employee data via Excel files': 'Epic: File Upload & Processing',
      'As an admin, I can preview and validate uploaded data': 'Epic: File Upload & Processing',
      'As a user, I can download employee data templates': 'Epic: File Upload & Processing',
      'As a user, I can search employees by multiple criteria': 'Epic: Search & Reporting',
      'As a user, I can export filtered employee data': 'Epic: Search & Reporting',
      'As a manager, I can generate employee reports': 'Epic: Search & Reporting',
      'As a manager, I can view employee statistics on dashboard': 'Epic: Dashboard & Analytics',
      'As a user, I can view real-time employee data updates': 'Epic: Dashboard & Analytics'
    };
    
    let storyLinked = 0;
    for (const story of userStories) {
      const storyName = story.subject.replace('👤 User Story: ', '');
      const targetEpic = storyEpicMapping[storyName];
      
      if (targetEpic && epicMap[targetEpic]) {
        const result = await updateWorkPackageParent(story.id, epicMap[targetEpic]);
        if (result) {
          console.log(`  ✅ ${storyName} → ${targetEpic}`);
          storyLinked++;
        } else {
          console.log(`  ❌ Failed: ${storyName} → ${targetEpic}`);
        }
      }
    }
    
    console.log('\n🎉 Relationship establishment complete!');
    console.log('\n📊 Summary:');
    console.log(`  🔗 Sprints linked to phases: ${sprintLinked}/${sprints.length}`);
    console.log(`  🔗 Epics linked to phases: ${epicLinked}/${epics.length}`);
    console.log(`  🔗 User stories linked to epics: ${storyLinked}/${userStories.length}`);
    
    const totalSuccess = sprintLinked + epicLinked + storyLinked;
    const totalAttempted = sprints.length + epics.length + userStories.length;
    
    if (totalSuccess === totalAttempted) {
      console.log('  ✅ All relationships established successfully!');
    } else {
      console.log(`  ⚠️  ${totalAttempted - totalSuccess} relationships failed`);
    }
    
  } catch (error) {
    console.error('❌ Error establishing relationships:', error.message);
    process.exit(1);
  }
}

establishPhaseRelationships();