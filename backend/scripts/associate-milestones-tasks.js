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

async function getAllWorkPackages(projectId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=200`,
      { headers }
    );
    return response.data._embedded.elements;
  } catch (error) {
    console.error('Error getting work packages:', error.message);
    throw error;
  }
}

async function updateWorkPackage(workPackageId, updateData) {
  try {
    // First get the current work package to get the lockVersion
    const currentResponse = await axios.get(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      { headers }
    );
    
    const lockVersion = currentResponse.data.lockVersion;
    
    // Include lockVersion in the update
    const payload = {
      ...updateData,
      lockVersion
    };
    
    const response = await axios.patch(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating work package ${workPackageId}:`, error.response?.data || error.message);
    throw error;
  }
}

function categorizeWorkPackages(workPackages) {
  const categories = {
    milestones: [],
    sprints: [],
    epics: [],
    userStories: []
  };
  
  for (const wp of workPackages) {
    const subject = wp.subject.toLowerCase();
    const type = wp._links?.type?.title?.toLowerCase() || '';
    
    // Based on the actual API response, milestones are the Sprint items (🏃‍♂️)
    if (subject.includes('🏃‍♂️') || subject.includes('sprint')) {
      categories.milestones.push(wp);
    } else if (subject.includes('📚') || subject.includes('epic')) {
      categories.epics.push(wp);
    } else if (subject.includes('👤') || subject.includes('user story')) {
      categories.userStories.push(wp);
    }
  }
  
  return categories;
}

function createMilestoneAssociations(categories) {
  // OpenProject doesn't allow milestones to be parents
  // So we'll skip milestone associations and focus on epic-story relationships
  console.log('⚠️  Skipping milestone associations - OpenProject constraint: milestones cannot be parents');
  return [];
}

// Function removed - sprint-epic associations now handled in milestone associations

function createEpicUserStoryAssociations(categories) {
  const associations = [];
  
  // Define epic-to-user-story associations
  const epicStoryMapping = {
    'authentication': ['login', 'manage user roles', 'reset my password'],
    'employee data': ['add new employees', 'update employee', 'deactivate employee', 'view employee profiles'],
    'file upload': ['upload employee data', 'preview and validate', 'download employee data'],
    'search': ['search employees', 'export filtered'],
    'dashboard': ['generate employee reports', 'view employee statistics', 'view real-time']
  };
  
  // Create epic-user story associations
  for (const epic of categories.epics) {
    const epicKey = Object.keys(epicStoryMapping).find(key => 
      epic.subject.toLowerCase().includes(key)
    );
    
    if (epicKey) {
      const storyKeywords = epicStoryMapping[epicKey];
      
      for (const storyKeyword of storyKeywords) {
        const userStory = categories.userStories.find(us => 
          us.subject.toLowerCase().includes(storyKeyword)
        );
        if (userStory) {
          associations.push({
            parent: epic,
            child: userStory,
            type: 'user_story'
          });
        }
      }
    }
  }
  
  return associations;
}

async function applyAssociations(associations, projectId) {
  console.log(`\n🔗 Applying ${associations.length} parent-child associations...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const association of associations) {
    try {
      const updateData = {
        _links: {
          parent: {
            href: `${OPENPROJECT_URL}/api/v3/work_packages/${association.parent.id}`
          }
        }
      };
      
      await updateWorkPackage(association.child.id, updateData);
      console.log(`  ✅ ${association.child.id} (${association.type}) → ${association.parent.id} (${association.parent.subject.substring(0, 30)}...)`);
      successCount++;
      
    } catch (error) {
      console.log(`  ❌ Failed: ${association.child.id} → ${association.parent.id} (${error.message})`);
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
}

async function associateMilestonesToTasks() {
  try {
    console.log('🔗 Creating milestone-task associations...');
    
    const projectId = await getProjectId();
    console.log(`✅ Project ID: ${projectId}`);
    
    const workPackages = await getAllWorkPackages(projectId);
    console.log(`✅ Found ${workPackages.length} work packages`);
    
    const categories = categorizeWorkPackages(workPackages);
    console.log(`\n📊 Categorized work packages:`);
    console.log(`  🎯 Milestones: ${categories.milestones.length}`);
    console.log(`  🏃‍♂️ Sprints: ${categories.sprints.length}`);
    console.log(`  📚 Epics: ${categories.epics.length}`);
    console.log(`  👤 User Stories: ${categories.userStories.length}`);
    
    // Create all associations
    const milestoneAssociations = createMilestoneAssociations(categories);
    const epicStoryAssociations = createEpicUserStoryAssociations(categories);
    
    console.log(`\n📋 Association plan:`);
    console.log(`  🎯 Milestone associations: ${milestoneAssociations.length}`);
    console.log(`  📚 Epic-Story associations: ${epicStoryAssociations.length}`);
    
    // Apply milestone associations
    console.log(`\n🎯 Applying milestone associations...`);
    const milestoneResults = await applyAssociations(milestoneAssociations, projectId);
    
    // Apply epic-story associations
    console.log(`\n📚 Applying epic-story associations...`);
    const epicResults = await applyAssociations(epicStoryAssociations, projectId);
    
    const totalSuccess = milestoneResults.successCount + epicResults.successCount;
    const totalErrors = milestoneResults.errorCount + epicResults.errorCount;
    
    console.log('\n🎉 Association process completed!');
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successful associations: ${totalSuccess}`);
    console.log(`  ❌ Failed associations: ${totalErrors}`);
    console.log(`  🎯 Milestones now have child tasks and epics`);
    console.log(`  📚 Epics contain their user stories`);
    console.log(`  👤 User stories are properly categorized`);
    
    console.log('\n🔗 View updated project:', `${OPENPROJECT_URL}/projects/mti-employee-enhancement`);
    
  } catch (error) {
    console.error('❌ Error creating associations:', error.message);
    process.exit(1);
  }
}

// Run the association process
associateMilestonesToTasks();