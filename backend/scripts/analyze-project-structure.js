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

function categorizeWorkPackages(workPackages) {
  const categories = {
    milestones: [],
    sprints: [],
    epics: [],
    userStories: [],
    tasks: [],
    others: []
  };
  
  for (const wp of workPackages) {
    const subject = wp.subject.toLowerCase();
    const type = wp._links?.type?.title?.toLowerCase() || '';
    
    if (type.includes('milestone') || subject.includes('milestone')) {
      categories.milestones.push(wp);
    } else if (subject.includes('sprint')) {
      categories.sprints.push(wp);
    } else if (subject.includes('epic') || type.includes('epic')) {
      categories.epics.push(wp);
    } else if (subject.includes('user story') || subject.includes('as a') || type.includes('story')) {
      categories.userStories.push(wp);
    } else if (type.includes('task') || subject.includes('task')) {
      categories.tasks.push(wp);
    } else {
      categories.others.push(wp);
    }
  }
  
  return categories;
}

function analyzeExpectedStructure(categories) {
  const expected = {
    milestones: {
      expected: 6,
      names: [
        'Project Initiation',
        'Planning & Analysis', 
        'Design & Architecture',
        'Development Phase',
        'Testing & UAT',
        'Go Live & Production'
      ]
    },
    sprints: {
      expected: 5,
      names: [
        'Sprint 0',
        'Sprint 1', 
        'Sprint 2',
        'Sprint 3',
        'Sprint 4'
      ]
    },
    userStories: {
      expected: 10-20,
      categories: [
        'Authentication',
        'Employee Management',
        'File Upload',
        'Data Display',
        'Testing'
      ]
    }
  };
  
  const analysis = {
    milestones: {
      actual: categories.milestones.length,
      expected: expected.milestones.expected,
      status: categories.milestones.length === expected.milestones.expected ? '✅' : '❌',
      missing: []
    },
    sprints: {
      actual: categories.sprints.length,
      expected: expected.sprints.expected,
      status: categories.sprints.length >= expected.sprints.expected ? '✅' : '❌',
      missing: []
    },
    userStories: {
      actual: categories.userStories.length,
      expected: `${expected.userStories.expected}`,
      status: categories.userStories.length >= 10 ? '✅' : '❌'
    },
    overall: 'pending'
  };
  
  // Check for missing milestones
  for (const expectedName of expected.milestones.names) {
    const found = categories.milestones.find(m => 
      m.subject.toLowerCase().includes(expectedName.toLowerCase())
    );
    if (!found) {
      analysis.milestones.missing.push(expectedName);
    }
  }
  
  // Check for missing sprints
  for (const expectedName of expected.sprints.names) {
    const found = categories.sprints.find(s => 
      s.subject.toLowerCase().includes(expectedName.toLowerCase())
    );
    if (!found) {
      analysis.sprints.missing.push(expectedName);
    }
  }
  
  // Overall status
  const allGood = analysis.milestones.status === '✅' && 
                  analysis.sprints.status === '✅' && 
                  analysis.userStories.status === '✅';
  analysis.overall = allGood ? '✅ Expected Structure' : '❌ Needs Adjustment';
  
  return analysis;
}

function displayStructure(categories, analysis) {
  console.log('\n📊 CURRENT PROJECT STRUCTURE ANALYSIS');
  console.log('=' .repeat(50));
  
  console.log('\n🎯 MILESTONES:');
  console.log(`Status: ${analysis.milestones.status} (${analysis.milestones.actual}/${analysis.milestones.expected})`);
  categories.milestones.forEach(m => {
    const dates = m.startDate && m.dueDate ? 
      ` (${m.startDate} → ${m.dueDate})` : '';
    console.log(`  📍 ${m.id}: ${m.subject}${dates}`);
  });
  if (analysis.milestones.missing.length > 0) {
    console.log(`  ❌ Missing: ${analysis.milestones.missing.join(', ')}`);
  }
  
  console.log('\n🚀 SPRINTS:');
  console.log(`Status: ${analysis.sprints.status} (${analysis.sprints.actual}/${analysis.sprints.expected})`);
  categories.sprints.forEach(s => {
    const dates = s.startDate && s.dueDate ? 
      ` (${s.startDate} → ${s.dueDate})` : '';
    console.log(`  🏃 ${s.id}: ${s.subject}${dates}`);
  });
  if (analysis.sprints.missing.length > 0) {
    console.log(`  ❌ Missing: ${analysis.sprints.missing.join(', ')}`);
  }
  
  console.log('\n📚 EPICS:');
  console.log(`Count: ${categories.epics.length}`);
  categories.epics.forEach(e => {
    console.log(`  📖 ${e.id}: ${e.subject}`);
  });
  
  console.log('\n👤 USER STORIES:');
  console.log(`Status: ${analysis.userStories.status} (${analysis.userStories.actual} stories)`);
  categories.userStories.forEach(us => {
    console.log(`  📝 ${us.id}: ${us.subject}`);
  });
  
  console.log('\n⚙️  TASKS:');
  console.log(`Count: ${categories.tasks.length}`);
  categories.tasks.forEach(t => {
    console.log(`  🔧 ${t.id}: ${t.subject}`);
  });
  
  if (categories.others.length > 0) {
    console.log('\n❓ OTHER ITEMS:');
    console.log(`Count: ${categories.others.length}`);
    categories.others.forEach(o => {
      console.log(`  ❓ ${o.id}: ${o.subject}`);
    });
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 OVERALL STATUS: ${analysis.overall}`);
  console.log('=' .repeat(50));
}

function generateRecommendations(analysis, categories) {
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (analysis.milestones.missing.length > 0) {
    console.log('\n🎯 Missing Milestones:');
    analysis.milestones.missing.forEach(milestone => {
      console.log(`  ➕ Create: ${milestone}`);
    });
  }
  
  if (analysis.sprints.missing.length > 0) {
    console.log('\n🚀 Missing Sprints:');
    analysis.sprints.missing.forEach(sprint => {
      console.log(`  ➕ Create: ${sprint}`);
    });
  }
  
  if (analysis.userStories.actual < 10) {
    console.log('\n👤 User Stories:');
    console.log(`  ➕ Add more user stories (current: ${analysis.userStories.actual}, recommended: 10-20)`);
  }
  
  if (analysis.overall === '✅ Expected Structure') {
    console.log('\n✨ Project structure looks good!');
    console.log('  ✅ All required milestones present');
    console.log('  ✅ Sprint structure adequate');
    console.log('  ✅ Sufficient user stories');
  } else {
    console.log('\n🔧 Structure needs adjustment - see recommendations above');
  }
}

async function analyzeProjectStructure() {
  try {
    console.log('🔍 Analyzing OpenProject structure...');
    
    const projectId = await getProjectId();
    console.log(`✅ Project ID: ${projectId}`);
    
    const workPackages = await getWorkPackages(projectId);
    console.log(`✅ Found ${workPackages.length} work packages`);
    
    const categories = categorizeWorkPackages(workPackages);
    const analysis = analyzeExpectedStructure(categories);
    
    displayStructure(categories, analysis);
    generateRecommendations(analysis, categories);
    
    console.log('\n🔗 Project URL:', `${OPENPROJECT_URL}/projects/mti-employee-enhancement`);
    
    // Return analysis for potential script usage
    return {
      categories,
      analysis,
      needsAdjustment: analysis.overall.includes('❌')
    };
    
  } catch (error) {
    console.error('❌ Error analyzing project structure:', error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeProjectStructure();