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
    console.error(`Error getting children for work package ${workPackageId}:`, error.message);
    return [];
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
    console.error(`Error getting work package ${workPackageId}:`, error.message);
    return null;
  }
}

async function verifyPhaseHierarchy() {
  try {
    console.log('🔍 Verifying Phase-based Project Hierarchy...');
    
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
    const phases = workPackages.filter(wp => wp.subject.includes('🚀 Phase') || wp.subject.includes('📋 Phase') || wp.subject.includes('🏗️ Phase') || wp.subject.includes('⚡ Phase') || wp.subject.includes('🧪 Phase') || wp.subject.includes('🎉 Phase'));
    const sprints = workPackages.filter(wp => wp.subject.includes('🏃‍♂️ Sprint'));
    const epics = workPackages.filter(wp => wp.subject.includes('📚 Epic:'));
    const userStories = workPackages.filter(wp => wp.subject.includes('👤 User Story:'));
    const milestones = workPackages.filter(wp => !wp.subject.includes('🚀 Phase') && !wp.subject.includes('📋 Phase') && !wp.subject.includes('🏗️ Phase') && !wp.subject.includes('⚡ Phase') && !wp.subject.includes('🧪 Phase') && !wp.subject.includes('🎉 Phase') && !wp.subject.includes('🏃‍♂️ Sprint') && !wp.subject.includes('📚 Epic:') && !wp.subject.includes('👤 User Story:'));
    
    console.log('\n📊 Work Package Categories:');
    console.log(`  🏗️ Phases: ${phases.length}`);
    console.log(`  🏃‍♂️ Sprints: ${sprints.length}`);
    console.log(`  📚 Epics: ${epics.length}`);
    console.log(`  👤 User Stories: ${userStories.length}`);
    console.log(`  🎯 Milestones: ${milestones.length}`);
    
    console.log('\n🏗️ Phase Hierarchy Analysis:');
    console.log('================================================================================');
    
    // Check sprints linked to phases
    let sprintsLinkedToPhases = 0;
    const sprintPhaseMap = new Map();
    
    for (const sprint of sprints) {
      const sprintDetails = await getWorkPackageDetails(sprint.id);
      if (sprintDetails && sprintDetails._links?.parent) {
        const parentId = sprintDetails._links.parent.href.split('/').pop();
        const parentPhase = phases.find(p => p.id.toString() === parentId);
        if (parentPhase) {
          sprintsLinkedToPhases++;
          sprintPhaseMap.set(sprint.id, parentPhase.subject);
        }
      }
    }
    
    // Check epics linked to phases
    let epicsLinkedToPhases = 0;
    const epicPhaseMap = new Map();
    
    for (const epic of epics) {
      const epicDetails = await getWorkPackageDetails(epic.id);
      if (epicDetails && epicDetails._links?.parent) {
        const parentId = epicDetails._links.parent.href.split('/').pop();
        const parentPhase = phases.find(p => p.id.toString() === parentId);
        if (parentPhase) {
          epicsLinkedToPhases++;
          epicPhaseMap.set(epic.id, parentPhase.subject);
        }
      }
    }
    
    // Check user stories linked to epics
    let storiesLinkedToEpics = 0;
    const storyEpicMap = new Map();
    
    for (const story of userStories) {
      const storyDetails = await getWorkPackageDetails(story.id);
      if (storyDetails && storyDetails._links?.parent) {
        const parentId = storyDetails._links.parent.href.split('/').pop();
        const parentEpic = epics.find(e => e.id.toString() === parentId);
        if (parentEpic) {
          storiesLinkedToEpics++;
          storyEpicMap.set(story.id, parentEpic.subject);
        }
      }
    }
    
    // Display phase hierarchy with children
    for (const phase of phases) {
      console.log(`\n🔹 ${phase.subject} (ID: ${phase.id})`);
      
      // Find sprints in this phase
      const phaseSprints = sprints.filter(s => sprintPhaseMap.get(s.id) === phase.subject);
      const phaseEpics = epics.filter(e => epicPhaseMap.get(e.id) === phase.subject);
      
      if (phaseSprints.length > 0 || phaseEpics.length > 0) {
        if (phaseSprints.length > 0) {
          console.log(`   🏃‍♂️ Sprints (${phaseSprints.length}):`);
          phaseSprints.forEach(sprint => {
            console.log(`     - ${sprint.subject}`);
          });
        }
        
        if (phaseEpics.length > 0) {
          console.log(`   📚 Epics (${phaseEpics.length}):`);
          phaseEpics.forEach(epic => {
            console.log(`     - ${epic.subject}`);
            
            // Find user stories in this epic
            const epicStories = userStories.filter(s => storyEpicMap.get(s.id) === epic.subject);
            if (epicStories.length > 0) {
              console.log(`       👤 User Stories (${epicStories.length}):`);
              epicStories.forEach(story => {
                console.log(`         - ${story.subject}`);
              });
            }
          });
        }
      } else {
        console.log('   ⚠️  No direct children found');
      }
    }
    
    console.log('\n================================================================================');
    console.log('🎯 Hierarchy verification complete');
    
    console.log('\n📈 Relationship Summary:');
    console.log(`  🔗 Sprints linked to phases: ${sprintsLinkedToPhases}/${sprints.length}`);
    console.log(`  🔗 Epics linked to phases: ${epicsLinkedToPhases}/${epics.length}`);
    console.log(`  🔗 User stories linked to epics: ${storiesLinkedToEpics}/${userStories.length}`);
    
    const totalLinked = sprintsLinkedToPhases + epicsLinkedToPhases + storiesLinkedToEpics;
    const totalExpected = sprints.length + epics.length + userStories.length;
    
    if (totalLinked === totalExpected) {
      console.log('  ✅ All relationships are properly established!');
    } else {
      console.log(`  ⚠️  ${totalExpected - totalLinked} relationships are missing`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying hierarchy:', error.message);
    process.exit(1);
  }
}

verifyPhaseHierarchy();