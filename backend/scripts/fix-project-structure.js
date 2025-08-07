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

function calculateDates() {
  // Project starts August 7, 2025 (30 days total)
  const projectStart = new Date('2025-08-07');
  const projectEnd = new Date('2025-09-05');
  
  // Testing & UAT milestone should be near the end (around day 25)
  const testingUATDate = new Date('2025-09-01'); // 4 days before project end
  
  // Sprint 4 should be the final sprint (last 6 days)
  const sprint4Start = new Date('2025-08-30');
  const sprint4End = new Date('2025-09-05');
  
  return {
    testingUAT: testingUATDate.toISOString().split('T')[0],
    sprint4Start: sprint4Start.toISOString().split('T')[0],
    sprint4End: sprint4End.toISOString().split('T')[0]
  };
}

async function fixProjectStructure() {
  try {
    console.log('🔧 Fixing OpenProject structure...');
    
    const projectId = await getProjectId();
    console.log(`✅ Project ID: ${projectId}`);
    
    const types = await getWorkPackageTypes(projectId);
    const milestoneType = types.find(t => t.name.toLowerCase().includes('milestone'));
    const taskType = types.find(t => t.name.toLowerCase().includes('task'));
    
    if (!milestoneType) {
      throw new Error('Milestone type not found');
    }
    
    if (!taskType) {
      throw new Error('Task type not found');
    }
    
    console.log(`📋 Using types: Milestone (ID: ${milestoneType.id}), Task (ID: ${taskType.id})`);
    
    const dates = calculateDates();
    
    console.log('📅 Calculated dates:');
    console.log(`  Testing & UAT Milestone: ${dates.testingUAT}`);
    console.log(`  Sprint 4: ${dates.sprint4Start} → ${dates.sprint4End}`);
    
    // Create Testing & UAT Milestone
    console.log('\n🎯 Creating Testing & UAT Milestone...');
    const testingMilestone = {
      subject: '🧪 Testing & UAT',
      description: {
        format: 'markdown',
        raw: `# Testing & User Acceptance Testing Phase\n\n## Objectives\n- Comprehensive system testing\n- User acceptance testing\n- Performance validation\n- Security testing\n- Bug fixes and optimization\n\n## Key Activities\n- Unit testing completion\n- Integration testing\n- User acceptance testing sessions\n- Performance testing\n- Security audit\n- Bug fixing and optimization\n\n## Deliverables\n- Test execution reports\n- UAT sign-off\n- Performance test results\n- Security audit report\n- Bug fix documentation\n- System optimization report`
      },
      startDate: dates.testingUAT,
      dueDate: dates.testingUAT,
      _links: {
        type: {
          href: `${OPENPROJECT_URL}/api/v3/types/${milestoneType.id}`
        },
        project: {
          href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}`
        }
      }
    };
    
    const createdMilestone = await createWorkPackage(projectId, testingMilestone);
    console.log(`✅ Created milestone: ${createdMilestone.id} - ${createdMilestone.subject}`);
    
    // Create Sprint 4
    console.log('\n🚀 Creating Sprint 4...');
    const sprint4 = {
      subject: '🏃‍♂️ Sprint 4: Final Implementation & Testing',
      description: {
        format: 'markdown',
        raw: `# Sprint 4: Final Implementation & Testing\n\n## Sprint Goals\n- Complete remaining user stories\n- Comprehensive testing\n- Performance optimization\n- Production preparation\n\n## Duration\n6 days (${dates.sprint4Start} - ${dates.sprint4End})\n\n## Key Focus Areas\n- Final feature implementation\n- Integration testing\n- Performance optimization\n- Security hardening\n- Documentation completion\n- Deployment preparation\n\n## Success Criteria\n- All user stories completed\n- System passes all tests\n- Performance meets requirements\n- Security audit passed\n- Documentation complete\n- Ready for production deployment`
      },
      startDate: dates.sprint4Start,
      dueDate: dates.sprint4End,
      _links: {
        type: {
          href: `${OPENPROJECT_URL}/api/v3/types/${taskType.id}`
        },
        project: {
          href: `${OPENPROJECT_URL}/api/v3/projects/${projectId}`
        }
      }
    };
    
    const createdSprint = await createWorkPackage(projectId, sprint4);
    console.log(`✅ Created sprint: ${createdSprint.id} - ${createdSprint.subject}`);
    
    console.log('\n🎉 Project structure fixes completed!');
    console.log('\n📊 Summary of changes:');
    console.log(`  ➕ Added Testing & UAT milestone (${dates.testingUAT})`);
    console.log(`  ➕ Added Sprint 4 (${dates.sprint4Start} → ${dates.sprint4End})`);
    
    console.log('\n✅ Project structure should now be complete!');
    console.log('🔗 View updated project:', `${OPENPROJECT_URL}/projects/mti-employee-enhancement`);
    
  } catch (error) {
    console.error('❌ Error fixing project structure:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixProjectStructure();