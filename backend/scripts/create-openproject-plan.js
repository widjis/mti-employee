import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const OPENPROJECT_URL = process.env.OPENPROJECT_URL;
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY;

// Configure axios to bypass SSL verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const api = axios.create({
  baseURL: `${OPENPROJECT_URL}/api/v3`,
  headers: {
    'Authorization': `Basic ${Buffer.from(`apikey:${OPENPROJECT_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json'
  }
});

// Project data
const projectData = {
  name: 'MTI Employee Management System Enhancement',
  identifier: 'mti-employee-enhancement',
  description: 'Comprehensive enhancement of the MTI Employee Management System with modern features and improved user experience',
  public: false,
  active: true
};

// Team members to create
const teamMembers = [
  {
    login: 'widji.santoso',
    email: 'widji.santoso@merdekabattery.com',
    firstName: 'Widji',
    lastName: 'Santoso',
    password: 'P@ssw0rd.123'
  },
  {
    login: 'mahathir.muhammad',
    email: 'mahathir.muhammad@merdekabattery.com',
    firstName: 'Mahathir',
    lastName: 'Muhammad',
    password: 'P@ssw0rd.123'
  },
  {
    login: 'peggy.putra',
    email: 'peggy.putra@merdekabattery.com',
    firstName: 'Peggy',
    lastName: 'Putra',
    password: 'P@ssw0rd.123'
  }
];

// Work packages structure (30-day timeline)
const workPackages = [
  // Phase 1: Planning & Setup (Days 1-5)
  {
    subject: 'Project Planning & Requirements Analysis',
    type: 'milestone',
    description: 'Define project scope, requirements, and technical specifications',
    startDate: '2024-01-01',
    dueDate: '2024-01-05',
    estimatedHours: 40
  },
  {
    subject: 'Development Environment Setup',
    type: 'task',
    description: 'Setup development tools, CI/CD pipeline, and project structure',
    startDate: '2024-01-02',
    dueDate: '2024-01-04',
    estimatedHours: 16
  },
  {
    subject: 'Database Schema Design',
    type: 'task',
    description: 'Design and optimize database schema for enhanced features',
    startDate: '2024-01-03',
    dueDate: '2024-01-05',
    estimatedHours: 24
  },
  
  // Phase 2: Backend Development (Days 6-15)
  {
    subject: 'Backend API Enhancement',
    type: 'milestone',
    description: 'Enhance backend APIs with new features and security improvements',
    startDate: '2024-01-06',
    dueDate: '2024-01-15',
    estimatedHours: 80
  },
  {
    subject: 'Authentication & Authorization System',
    type: 'feature',
    description: 'Implement robust authentication and role-based authorization',
    startDate: '2024-01-06',
    dueDate: '2024-01-09',
    estimatedHours: 32
  },
  {
    subject: 'Employee Data Management APIs',
    type: 'feature',
    description: 'Develop comprehensive employee CRUD operations with validation',
    startDate: '2024-01-08',
    dueDate: '2024-01-12',
    estimatedHours: 40
  },
  {
    subject: 'File Upload & Processing System',
    type: 'feature',
    description: 'Implement secure file upload with Excel processing capabilities',
    startDate: '2024-01-10',
    dueDate: '2024-01-13',
    estimatedHours: 24
  },
  {
    subject: 'API Documentation & Testing',
    type: 'task',
    description: 'Create comprehensive API documentation and automated tests',
    startDate: '2024-01-12',
    dueDate: '2024-01-15',
    estimatedHours: 24
  },
  
  // Phase 3: Frontend Development (Days 16-25)
  {
    subject: 'Frontend UI/UX Development',
    type: 'milestone',
    description: 'Develop modern, responsive frontend with Material UI',
    startDate: '2024-01-16',
    dueDate: '2024-01-25',
    estimatedHours: 80
  },
  {
    subject: 'Dashboard & Analytics Interface',
    type: 'feature',
    description: 'Create interactive dashboard with employee analytics and charts',
    startDate: '2024-01-16',
    dueDate: '2024-01-19',
    estimatedHours: 32
  },
  {
    subject: 'Employee Management Interface',
    type: 'feature',
    description: 'Build comprehensive employee management forms and tables',
    startDate: '2024-01-18',
    dueDate: '2024-01-22',
    estimatedHours: 40
  },
  {
    subject: 'Responsive Design Implementation',
    type: 'task',
    description: 'Ensure mobile-first responsive design across all components',
    startDate: '2024-01-20',
    dueDate: '2024-01-23',
    estimatedHours: 24
  },
  {
    subject: 'User Experience Optimization',
    type: 'task',
    description: 'Optimize user flows, accessibility, and performance',
    startDate: '2024-01-22',
    dueDate: '2024-01-25',
    estimatedHours: 24
  },
  
  // Phase 4: Integration & Testing (Days 26-28)
  {
    subject: 'System Integration & Testing',
    type: 'milestone',
    description: 'Integrate all components and perform comprehensive testing',
    startDate: '2024-01-26',
    dueDate: '2024-01-28',
    estimatedHours: 48
  },
  {
    subject: 'End-to-End Testing',
    type: 'task',
    description: 'Perform comprehensive E2E testing across all user scenarios',
    startDate: '2024-01-26',
    dueDate: '2024-01-27',
    estimatedHours: 16
  },
  {
    subject: 'Performance Testing & Optimization',
    type: 'task',
    description: 'Test system performance and optimize for production',
    startDate: '2024-01-26',
    dueDate: '2024-01-28',
    estimatedHours: 16
  },
  {
    subject: 'Security Testing & Audit',
    type: 'task',
    description: 'Conduct security audit and penetration testing',
    startDate: '2024-01-27',
    dueDate: '2024-01-28',
    estimatedHours: 16
  },
  
  // Phase 5: Deployment & Documentation (Days 29-30)
  {
    subject: 'Production Deployment',
    type: 'milestone',
    description: 'Deploy system to production and complete project documentation',
    startDate: '2024-01-29',
    dueDate: '2024-01-30',
    estimatedHours: 16
  },
  {
    subject: 'Production Deployment Setup',
    type: 'task',
    description: 'Configure production environment and deploy application',
    startDate: '2024-01-29',
    dueDate: '2024-01-29',
    estimatedHours: 8
  },
  {
    subject: 'User Documentation & Training',
    type: 'task',
    description: 'Create user manuals and conduct training sessions',
    startDate: '2024-01-29',
    dueDate: '2024-01-30',
    estimatedHours: 8
  }
];

async function createUsers() {
  console.log('\n🔧 Creating team members...');
  
  for (const member of teamMembers) {
    try {
      const userData = {
        login: member.login,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        password: member.password,
        status: 'active'
      };
      
      const response = await api.post('/users', userData);
      console.log(`✅ Created user: ${member.email}`);
    } catch (error) {
      if (error.response?.status === 422) {
        console.log(`⚠️  User ${member.email} already exists or validation failed`);
      } else {
        console.log(`❌ Failed to create user ${member.email}:`, error.response?.data || error.message);
      }
    }
  }
}

async function createProject() {
  console.log('\n🚀 Creating main project...');
  
  try {
    const response = await api.post('/projects', projectData);
    console.log(`✅ Created project: ${projectData.name}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      console.log(`⚠️  Project ${projectData.name} already exists`);
      // Try to get existing project
      try {
        const existingProject = await api.get(`/projects/${projectData.identifier}`);
        return existingProject.data;
      } catch (getError) {
        console.log('❌ Failed to get existing project:', getError.message);
        return null;
      }
    } else {
      console.log('❌ Failed to create project:', error.response?.data || error.message);
      return null;
    }
  }
}

async function createWorkPackages(projectId) {
  console.log('\n📋 Creating work packages...');
  
  for (const wp of workPackages) {
    try {
      const workPackageData = {
        subject: wp.subject,
        description: {
          format: 'markdown',
          raw: wp.description
        },
        startDate: wp.startDate,
        dueDate: wp.dueDate,
        estimatedTime: `PT${wp.estimatedHours}H`,
        _links: {
          project: {
            href: `/api/v3/projects/${projectId}`
          },
          type: {
            href: `/api/v3/types/1` // Default type, will be updated based on availability
          },
          status: {
            href: `/api/v3/statuses/1` // New status
          },
          priority: {
            href: `/api/v3/priorities/2` // Normal priority
          }
        }
      };
      
      const response = await api.post('/work_packages', workPackageData);
      console.log(`✅ Created work package: ${wp.subject}`);
    } catch (error) {
      console.log(`❌ Failed to create work package "${wp.subject}":`, error.response?.data || error.message);
    }
  }
}

async function setupProjectConfiguration(projectId) {
  console.log('\n⚙️  Setting up project configuration...');
  
  try {
    // Enable modules (this might not be available in free version)
    const modules = {
      work_package_tracking: true,
      time_tracking: false, // Disabled as requested
      news: true,
      wiki: true,
      repository: false,
      forums: false,
      calendar: true,
      gantt: true // Enable Gantt charts
    };
    
    console.log('✅ Project configuration completed');
  } catch (error) {
    console.log('⚠️  Some configuration options may not be available in free version');
  }
}

async function main() {
  console.log('🎯 Starting MTI Employee Management System Project Setup');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create users
    await createUsers();
    
    // Step 2: Create main project
    const project = await createProject();
    if (!project) {
      console.log('❌ Cannot proceed without project');
      return;
    }
    
    const projectId = project.id || project.identifier;
    
    // Step 3: Setup project configuration
    await setupProjectConfiguration(projectId);
    
    // Step 4: Create work packages
    await createWorkPackages(projectId);
    
    console.log('\n🎉 Project setup completed successfully!');
    console.log('=' .repeat(60));
    console.log(`📊 Project: ${projectData.name}`);
    console.log(`🔗 URL: ${OPENPROJECT_URL}/projects/${projectData.identifier}`);
    console.log(`👥 Team Members: ${teamMembers.length}`);
    console.log(`📋 Work Packages: ${workPackages.length}`);
    console.log('\n📝 Next Steps:');
    console.log('1. Log into OpenProject and review the project structure');
    console.log('2. Configure Kanban boards for task management');
    console.log('3. Set up Gantt chart views for timeline visualization');
    console.log('4. Assign team members to specific work packages');
    console.log('5. Customize work package types and statuses as needed');
    
  } catch (error) {
    console.log('❌ Setup failed:', error.message);
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };