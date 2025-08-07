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

async function deleteWorkPackage(workPackageId) {
  try {
    await axios.delete(
      `${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`,
      { headers }
    );
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false; // Already deleted
    }
    console.error(`Error deleting work package ${workPackageId}:`, error.message);
    throw error;
  }
}

async function getWorkPackageTypes(projectId) {
  try {
    const response = await axios.get(
      `${OPENPROJECT_URL}/api/v3/projects/${projectId}/types`,
      { headers }
    );
    return response.data._embedded.elements;
  } catch (error) {
    console.error('Error getting work package types:', error.message);
    throw error;
  }
}

async function createWorkPackage(projectId, workPackageData) {
  try {
    const response = await axios.post(
      `${OPENPROJECT_URL}/api/v3/work_packages`,
      workPackageData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating work package:', error.response?.data || error.message);
    throw error;
  }
}

function calculateProjectDates() {
  const startDate = new Date('2025-08-07');
  const endDate = new Date('2025-09-05'); // 30 days project
  
  // Milestone dates based on agile methodology
  const milestones = {
    projectKickoff: '2025-08-07',
    sprintPlanning: '2025-08-08',
    sprint1Review: '2025-08-14',
    sprint2Review: '2025-08-21',
    sprint3Review: '2025-08-28',
    finalSprint: '2025-09-04',
    projectDelivery: '2025-09-05'
  };
  
  // Sprint dates
  const sprints = {
    sprint0: { start: '2025-08-07', end: '2025-08-08' }, // Planning
    sprint1: { start: '2025-08-09', end: '2025-08-14' }, // 6 days
    sprint2: { start: '2025-08-15', end: '2025-08-21' }, // 7 days
    sprint3: { start: '2025-08-22', end: '2025-08-28' }, // 7 days
    sprint4: { start: '2025-08-29', end: '2025-09-05' }  // 8 days
  };
  
  return { milestones, sprints };
}

async function createComprehensiveProjectPlan(projectId, types) {
  const { milestones, sprints } = calculateProjectDates();
  
  const milestoneType = types.find(t => t.name.toLowerCase().includes('milestone'));
  const taskType = types.find(t => t.name.toLowerCase().includes('task'));
  const epicType = types.find(t => t.name.toLowerCase().includes('epic')) || taskType;
  const userStoryType = types.find(t => t.name.toLowerCase().includes('user story')) || taskType;
  const phaseType = types.find(t => t.name.toLowerCase().includes('phase')) || taskType;
  
  const createdItems = [];
  const createdPhases = {};
  
  console.log('\n🏗️ Creating Project Phases...');
  
  // Create Project Phases as parent containers
  const phaseData = [
    {
      subject: '🚀 Phase 1: Project Initiation',
      description: 'Project setup, planning, and team initialization',
      startDate: '2025-08-07',
      endDate: '2025-08-11'
    },
    {
      subject: '📋 Phase 2: Planning & Analysis',
      description: 'Detailed planning, requirements analysis, and sprint preparation',
      startDate: '2025-08-11',
      endDate: '2025-08-15'
    },
    {
      subject: '🏗️ Phase 3: Development Phase 1',
      description: 'Core development work - Authentication and basic features',
      startDate: '2025-08-15',
      endDate: '2025-08-25'
    },
    {
      subject: '⚡ Phase 4: Development Phase 2',
      description: 'Advanced features and integrations',
      startDate: '2025-08-25',
      endDate: '2025-09-01'
    },
    {
      subject: '🧪 Phase 5: Testing & UAT',
      description: 'Comprehensive testing and user acceptance testing',
      startDate: '2025-09-01',
      endDate: '2025-09-03'
    },
    {
      subject: '🎉 Phase 6: Go Live & Production',
      description: 'Production deployment and project delivery',
      startDate: '2025-09-03',
      endDate: '2025-09-05'
    }
  ];
  
  for (const phase of phaseData) {
    const workPackage = {
      subject: phase.subject,
      description: {
        format: 'markdown',
        raw: `# ${phase.subject}\n\n${phase.description}\n\n## Phase Objectives\n- Clear deliverables and milestones\n- Quality assurance checkpoints\n- Stakeholder communication\n- Risk mitigation\n\n## Success Criteria\n- All phase deliverables completed\n- Quality standards met\n- Timeline adherence\n- Stakeholder approval`
      },
      startDate: phase.startDate,
      dueDate: phase.endDate,
      _links: {
        type: { href: `${OPENPROJECT_URL}/api/v3/types/${phaseType.id}` },
        project: { href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}` }
      }
    };
    
    const created = await createWorkPackage(projectId, workPackage);
    createdItems.push(created);
    createdPhases[phase.subject] = created;
    console.log(`  ✅ ${created.id}: ${created.subject}`);
  }
  
  console.log('\n🎯 Creating Agile Milestones...');
  
  // Create Agile Milestones
  const milestoneData = [
    {
      subject: '🚀 Project Kickoff & Team Setup',
      description: 'Project initiation, team setup, and environment configuration',
      date: milestones.projectKickoff
    },
    {
      subject: '📋 Sprint Planning Complete',
      description: 'All sprint planning sessions completed with defined user stories',
      date: milestones.sprintPlanning
    },
    {
      subject: '✅ Sprint 1 Review & Demo',
      description: 'First sprint review, demo, and retrospective completed',
      date: milestones.sprint1Review
    },
    {
      subject: '✅ Sprint 2 Review & Demo',
      description: 'Second sprint review, demo, and retrospective completed',
      date: milestones.sprint2Review
    },
    {
      subject: '✅ Sprint 3 Review & Demo',
      description: 'Third sprint review, demo, and retrospective completed',
      date: milestones.sprint3Review
    },
    {
      subject: '🏁 Final Sprint & UAT Complete',
      description: 'Final sprint completed with user acceptance testing',
      date: milestones.finalSprint
    },
    {
      subject: '🎉 Project Delivery & Go-Live',
      description: 'Project delivered and system goes live in production',
      date: milestones.projectDelivery
    }
  ];
  
  for (const milestone of milestoneData) {
    const workPackage = {
      subject: milestone.subject,
      description: {
        format: 'markdown',
        raw: `# ${milestone.subject}\n\n${milestone.description}\n\n## Key Activities\n- Stakeholder alignment\n- Progress review\n- Quality assurance\n- Risk assessment\n\n## Success Criteria\n- All planned deliverables completed\n- Quality standards met\n- Stakeholder approval obtained`
      },
      startDate: milestone.date,
      dueDate: milestone.date,
      _links: {
        type: { href: `${OPENPROJECT_URL}/api/v3/types/${milestoneType.id}` },
        project: { href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}` }
      }
    };
    
    const created = await createWorkPackage(projectId, workPackage);
    createdItems.push(created);
    console.log(`  ✅ ${created.id}: ${created.subject}`);
  }
  
  console.log('\n🏃‍♂️ Creating Sprint Structure...');
  
  // Create Sprint Structure with Phase associations
  const sprintData = [
    {
      name: 'Sprint 0: Project Setup & Planning',
      description: 'Initial project setup, environment configuration, and detailed planning',
      phase: '📋 Phase 2: Planning & Analysis',
      ...sprints.sprint0
    },
    {
      name: 'Sprint 1: Authentication & Core Setup',
      description: 'User authentication, database setup, and basic employee management',
      phase: '🏗️ Phase 3: Development Phase 1',
      ...sprints.sprint1
    },
    {
      name: 'Sprint 2: Employee Management Features',
      description: 'CRUD operations for employees, data validation, and basic UI',
      phase: '🏗️ Phase 3: Development Phase 1',
      ...sprints.sprint2
    },
    {
      name: 'Sprint 3: File Upload & Advanced Features',
      description: 'Excel file upload, data processing, search and filtering capabilities',
      phase: '⚡ Phase 4: Development Phase 2',
      ...sprints.sprint3
    },
    {
      name: 'Sprint 4: Testing, Optimization & Deployment',
      description: 'Comprehensive testing, performance optimization, and production deployment',
      phase: '🧪 Phase 5: Testing & UAT',
      ...sprints.sprint4
    }
  ];
  
  for (const sprint of sprintData) {
    const parentPhase = createdPhases[sprint.phase];
    const workPackage = {
      subject: `🏃‍♂️ ${sprint.name}`,
      description: {
        format: 'markdown',
        raw: `# ${sprint.name}\n\n## Sprint Goal\n${sprint.description}\n\n## Duration\n${sprint.start} to ${sprint.end}\n\n## Phase\n${sprint.phase}\n\n## Sprint Activities\n- Daily standups\n- Sprint planning\n- Development work\n- Code reviews\n- Testing\n- Sprint review\n- Retrospective\n\n## Definition of Done\n- All user stories completed\n- Code reviewed and tested\n- Documentation updated\n- Demo ready for stakeholders`
      },
      startDate: sprint.start,
      dueDate: sprint.end,
      _links: {
        type: { href: `${OPENPROJECT_URL}/api/v3/types/${epicType.id}` },
        project: { href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}` },
        ...(parentPhase && { parent: { href: `${OPENPROJECT_URL}/api/v3/work_packages/${parentPhase.id}` } })
      }
    };
    
    const created = await createWorkPackage(projectId, workPackage);
    createdItems.push(created);
    console.log(`  ✅ ${created.id}: ${created.subject} (Phase: ${sprint.phase})`);
  }
  
  console.log('\n📚 Creating Epic Structure...');
  
  // Create Epics with Phase associations
  const epicData = [
    {
      name: 'Epic: Authentication & Security',
      description: 'Complete user authentication system with role-based access control',
      phase: '🏗️ Phase 3: Development Phase 1',
      startDate: '2025-08-15',
      endDate: '2025-08-22'
    },
    {
      name: 'Epic: Employee Data Management',
      description: 'Comprehensive employee data management with CRUD operations',
      phase: '🏗️ Phase 3: Development Phase 1',
      startDate: '2025-08-18',
      endDate: '2025-08-25'
    },
    {
      name: 'Epic: File Upload & Processing',
      description: 'Excel file upload, validation, and bulk data processing',
      phase: '⚡ Phase 4: Development Phase 2',
      startDate: '2025-08-25',
      endDate: '2025-08-30'
    },
    {
      name: 'Epic: Search & Reporting',
      description: 'Advanced search, filtering, and reporting capabilities',
      phase: '⚡ Phase 4: Development Phase 2',
      startDate: '2025-08-28',
      endDate: '2025-09-01'
    },
    {
      name: 'Epic: Dashboard & Analytics',
      description: 'Management dashboard with analytics and insights',
      phase: '⚡ Phase 4: Development Phase 2',
      startDate: '2025-08-30',
      endDate: '2025-09-01'
    }
  ];
  
  const createdEpics = {};
  for (const epic of epicData) {
    const parentPhase = createdPhases[epic.phase];
    const workPackage = {
      subject: `📚 ${epic.name}`,
      description: {
        format: 'markdown',
        raw: `# ${epic.name}\n\n## Epic Description\n${epic.description}\n\n## Phase\n${epic.phase}\n\n## Business Value\n- Improved operational efficiency\n- Better data management\n- Enhanced user experience\n- Reduced manual work\n\n## Acceptance Criteria\n- All related user stories completed\n- Quality standards met\n- User acceptance testing passed\n- Documentation complete`
      },
      startDate: epic.startDate,
      dueDate: epic.endDate,
      _links: {
        type: { href: `${OPENPROJECT_URL}/api/v3/types/${epicType.id}` },
        project: { href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}` },
        ...(parentPhase && { parent: { href: `${OPENPROJECT_URL}/api/v3/work_packages/${parentPhase.id}` } })
      }
    };
    
    const created = await createWorkPackage(projectId, workPackage);
    createdItems.push(created);
    createdEpics[epic.name] = created;
    console.log(`  ✅ ${created.id}: ${created.subject} (Phase: ${epic.phase})`);
  }
  
  console.log('\n👤 Creating User Stories...');
  
  // Create User Stories with Epic associations
  const userStories = [
    // Authentication Epic
    { name: 'As a user, I can securely login to the system', epic: 'Epic: Authentication & Security', sprint: 1 },
    { name: 'As an admin, I can manage user roles and permissions', epic: 'Epic: Authentication & Security', sprint: 1 },
    { name: 'As a user, I can reset my password securely', epic: 'Epic: Authentication & Security', sprint: 1 },
    
    // Employee Management Epic
    { name: 'As an admin, I can add new employees to the system', epic: 'Epic: Employee Data Management', sprint: 2 },
    { name: 'As an admin, I can update employee information', epic: 'Epic: Employee Data Management', sprint: 2 },
    { name: 'As an admin, I can deactivate employee accounts', epic: 'Epic: Employee Data Management', sprint: 2 },
    { name: 'As a user, I can view employee profiles', epic: 'Epic: Employee Data Management', sprint: 2 },
    
    // File Upload Epic
    { name: 'As an admin, I can upload employee data via Excel files', epic: 'Epic: File Upload & Processing', sprint: 3 },
    { name: 'As an admin, I can preview and validate uploaded data', epic: 'Epic: File Upload & Processing', sprint: 3 },
    { name: 'As a user, I can download employee data templates', epic: 'Epic: File Upload & Processing', sprint: 3 },
    
    // Search & Reporting Epic
    { name: 'As a user, I can search employees by multiple criteria', epic: 'Epic: Search & Reporting', sprint: 3 },
    { name: 'As a user, I can export filtered employee data', epic: 'Epic: Search & Reporting', sprint: 3 },
    { name: 'As a manager, I can generate employee reports', epic: 'Epic: Search & Reporting', sprint: 4 },
    
    // Dashboard Epic
    { name: 'As a manager, I can view employee statistics on dashboard', epic: 'Epic: Dashboard & Analytics', sprint: 4 },
    { name: 'As a user, I can view real-time employee data updates', epic: 'Epic: Dashboard & Analytics', sprint: 4 }
  ];
  
  for (const story of userStories) {
    const sprintInfo = sprintData[story.sprint - 1] || sprintData[0];
    const parentEpic = createdEpics[story.epic];
    const workPackage = {
      subject: `👤 User Story: ${story.name}`,
      description: {
        format: 'markdown',
        raw: `# User Story: ${story.name}\n\n## Epic\n${story.epic}\n\n## Sprint\nSprint ${story.sprint}\n\n## Acceptance Criteria\n- [ ] User interface is intuitive and responsive\n- [ ] Functionality works as expected\n- [ ] Data validation is implemented\n- [ ] Error handling is robust\n- [ ] Security requirements are met\n- [ ] Performance is acceptable\n- [ ] Unit tests are written\n- [ ] Integration tests pass\n\n## Definition of Done\n- Code is reviewed and approved\n- All tests pass\n- Documentation is updated\n- Feature is deployed to staging\n- User acceptance testing completed`
      },
      startDate: sprintInfo.start,
      dueDate: sprintInfo.end,
      _links: {
        type: { href: `${OPENPROJECT_URL}/api/v3/types/${userStoryType.id}` },
        project: { href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}` },
        ...(parentEpic && { parent: { href: `${OPENPROJECT_URL}/api/v3/work_packages/${parentEpic.id}` } })
      }
    };
    
    const created = await createWorkPackage(projectId, workPackage);
    createdItems.push(created);
    console.log(`  ✅ ${created.id}: ${created.subject} (Epic: ${story.epic})`);
  }
  
  return createdItems;
}

async function cleanAndRebuildProject() {
  try {
    console.log('🧹 Starting comprehensive project cleanup and rebuild...');
    
    const projectId = await getProjectId();
    console.log(`✅ Project ID: ${projectId}`);
    
    // Step 1: Clean existing work packages
    console.log('\n🗑️  Removing all existing work packages...');
    const existingWorkPackages = await getAllWorkPackages(projectId);
    console.log(`Found ${existingWorkPackages.length} existing work packages`);
    
    let deletedCount = 0;
    for (const wp of existingWorkPackages) {
      const deleted = await deleteWorkPackage(wp.id);
      if (deleted) {
        deletedCount++;
        console.log(`  🗑️  Deleted: ${wp.id} - ${wp.subject}`);
      }
    }
    
    console.log(`\n✅ Cleanup complete: ${deletedCount} work packages removed`);
    
    // Step 2: Get available types
    console.log('\n📋 Getting available work package types...');
    const types = await getWorkPackageTypes(projectId);
    console.log(`Found ${types.length} work package types`);
    
    // Step 3: Create comprehensive project plan
    console.log('\n🏗️  Creating comprehensive agile project plan...');
    const createdItems = await createComprehensiveProjectPlan(projectId, types);
    
    console.log('\n🎉 Project rebuild completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  🗑️  Removed: ${deletedCount} old work packages`);
    console.log(`  ➕ Created: ${createdItems.length} new work packages`);
    console.log(`  📅 Project Duration: August 7 - September 5, 2025 (30 days)`);
    console.log(`  🏗️ Phases: 6 project phases as parent containers`);
    console.log(`  🏃‍♂️ Sprints: 5 sprints organized under phases`);
    console.log(`  🎯 Milestones: 7 key milestones`);
    console.log(`  📚 Epics: 5 major epics linked to phases`);
    console.log(`  👤 User Stories: 15 detailed user stories linked to epics`);
    console.log(`  🔗 Hierarchy: Phases > Epics > User Stories`);
    
    console.log('\n🔗 View project:', `${OPENPROJECT_URL}/projects/mti-employee-enhancement`);
    
  } catch (error) {
    console.error('❌ Error during project rebuild:', error.message);
    process.exit(1);
  }
}

// Run the cleanup and rebuild
cleanAndRebuildProject();