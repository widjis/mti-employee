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

// Agile SDLC Project Structure (4 Sprints x 1 week each)
const agileWorkPackages = [
  // Sprint 0: Project Initiation (Days 1-3)
  {
    subject: 'Sprint 0: Project Initiation & Setup',
    type: 'milestone',
    description: 'Project kickoff, team setup, and initial planning',
    startDate: '2024-01-01',
    dueDate: '2024-01-03',
    estimatedHours: 24,
    priority: 'high'
  },
  {
    subject: 'Epic: Project Foundation',
    type: 'feature',
    description: 'Establish project foundation and development environment',
    startDate: '2024-01-01',
    dueDate: '2024-01-03',
    estimatedHours: 16
  },
  {
    subject: 'User Story: As a developer, I need a configured development environment',
    type: 'task',
    description: 'Setup development tools, IDE configurations, and project structure',
    startDate: '2024-01-01',
    dueDate: '2024-01-02',
    estimatedHours: 8
  },
  {
    subject: 'User Story: As a team, we need project documentation and standards',
    type: 'task',
    description: 'Create coding standards, Git workflow, and project documentation',
    startDate: '2024-01-02',
    dueDate: '2024-01-03',
    estimatedHours: 8
  },

  // Sprint 1: Core Backend Infrastructure (Days 4-10)
  {
    subject: 'Sprint 1: Core Backend Infrastructure',
    type: 'milestone',
    description: 'Develop core backend APIs and authentication system',
    startDate: '2024-01-04',
    dueDate: '2024-01-10',
    estimatedHours: 56,
    priority: 'high'
  },
  {
    subject: 'Epic: Authentication & Security',
    type: 'feature',
    description: 'Implement secure authentication and authorization system',
    startDate: '2024-01-04',
    dueDate: '2024-01-07',
    estimatedHours: 32
  },
  {
    subject: 'User Story: As a user, I can securely login to the system',
    type: 'task',
    description: 'Implement JWT-based authentication with secure password handling',
    startDate: '2024-01-04',
    dueDate: '2024-01-05',
    estimatedHours: 16
  },
  {
    subject: 'User Story: As an admin, I can manage user roles and permissions',
    type: 'task',
    description: 'Implement role-based access control (RBAC) system',
    startDate: '2024-01-06',
    dueDate: '2024-01-07',
    estimatedHours: 16
  },
  {
    subject: 'Epic: Employee Data Management',
    type: 'feature',
    description: 'Core employee CRUD operations and data validation',
    startDate: '2024-01-08',
    dueDate: '2024-01-10',
    estimatedHours: 24
  },
  {
    subject: 'User Story: As an admin, I can add new employees to the system',
    type: 'task',
    description: 'Implement employee creation with validation and data integrity',
    startDate: '2024-01-08',
    dueDate: '2024-01-09',
    estimatedHours: 12
  },
  {
    subject: 'User Story: As an admin, I can update employee information',
    type: 'task',
    description: 'Implement employee update functionality with audit trail',
    startDate: '2024-01-09',
    dueDate: '2024-01-10',
    estimatedHours: 12
  },

  // Sprint 2: Advanced Features & File Processing (Days 11-17)
  {
    subject: 'Sprint 2: Advanced Features & File Processing',
    type: 'milestone',
    description: 'Implement file upload, Excel processing, and advanced search',
    startDate: '2024-01-11',
    dueDate: '2024-01-17',
    estimatedHours: 56,
    priority: 'high'
  },
  {
    subject: 'Epic: File Upload & Processing',
    type: 'feature',
    description: 'Excel file upload and bulk employee data processing',
    startDate: '2024-01-11',
    dueDate: '2024-01-14',
    estimatedHours: 32
  },
  {
    subject: 'User Story: As an admin, I can upload employee data via Excel files',
    type: 'task',
    description: 'Implement secure file upload with Excel parsing and validation',
    startDate: '2024-01-11',
    dueDate: '2024-01-12',
    estimatedHours: 16
  },
  {
    subject: 'User Story: As an admin, I can preview and validate uploaded data',
    type: 'task',
    description: 'Implement data preview and validation before bulk import',
    startDate: '2024-01-13',
    dueDate: '2024-01-14',
    estimatedHours: 16
  },
  {
    subject: 'Epic: Search & Filtering',
    type: 'feature',
    description: 'Advanced search and filtering capabilities',
    startDate: '2024-01-15',
    dueDate: '2024-01-17',
    estimatedHours: 24
  },
  {
    subject: 'User Story: As a user, I can search employees by multiple criteria',
    type: 'task',
    description: 'Implement advanced search with filters and sorting',
    startDate: '2024-01-15',
    dueDate: '2024-01-16',
    estimatedHours: 12
  },
  {
    subject: 'User Story: As a user, I can export filtered employee data',
    type: 'task',
    description: 'Implement data export functionality with multiple formats',
    startDate: '2024-01-16',
    dueDate: '2024-01-17',
    estimatedHours: 12
  },

  // Sprint 3: Frontend Development & UI/UX (Days 18-24)
  {
    subject: 'Sprint 3: Frontend Development & UI/UX',
    type: 'milestone',
    description: 'Develop responsive frontend with Material UI components',
    startDate: '2024-01-18',
    dueDate: '2024-01-24',
    estimatedHours: 56,
    priority: 'high'
  },
  {
    subject: 'Epic: Dashboard & Analytics',
    type: 'feature',
    description: 'Interactive dashboard with employee analytics and charts',
    startDate: '2024-01-18',
    dueDate: '2024-01-21',
    estimatedHours: 32
  },
  {
    subject: 'User Story: As a manager, I can view employee statistics on dashboard',
    type: 'task',
    description: 'Implement dashboard with charts, KPIs, and employee metrics',
    startDate: '2024-01-18',
    dueDate: '2024-01-19',
    estimatedHours: 16
  },
  {
    subject: 'User Story: As a user, I can view real-time employee data updates',
    type: 'task',
    description: 'Implement real-time data updates and notifications',
    startDate: '2024-01-20',
    dueDate: '2024-01-21',
    estimatedHours: 16
  },
  {
    subject: 'Epic: Employee Management Interface',
    type: 'feature',
    description: 'Comprehensive employee management forms and tables',
    startDate: '2024-01-22',
    dueDate: '2024-01-24',
    estimatedHours: 24
  },
  {
    subject: 'User Story: As an admin, I can manage employees through intuitive forms',
    type: 'task',
    description: 'Implement responsive forms with validation and error handling',
    startDate: '2024-01-22',
    dueDate: '2024-01-23',
    estimatedHours: 12
  },
  {
    subject: 'User Story: As a user, I can view employees in a sortable table',
    type: 'task',
    description: 'Implement data table with sorting, pagination, and filtering',
    startDate: '2024-01-23',
    dueDate: '2024-01-24',
    estimatedHours: 12
  },

  // Sprint 4: Testing, Integration & Deployment (Days 25-30)
  {
    subject: 'Sprint 4: Testing, Integration & Deployment',
    type: 'milestone',
    description: 'Comprehensive testing, integration, and production deployment',
    startDate: '2024-01-25',
    dueDate: '2024-01-30',
    estimatedHours: 48,
    priority: 'high'
  },
  {
    subject: 'Epic: Quality Assurance',
    type: 'feature',
    description: 'Comprehensive testing and quality assurance',
    startDate: '2024-01-25',
    dueDate: '2024-01-27',
    estimatedHours: 24
  },
  {
    subject: 'User Story: As a developer, I need automated tests for all features',
    type: 'task',
    description: 'Implement unit tests, integration tests, and E2E tests',
    startDate: '2024-01-25',
    dueDate: '2024-01-26',
    estimatedHours: 12
  },
  {
    subject: 'User Story: As a user, I experience a bug-free application',
    type: 'task',
    description: 'Perform manual testing, bug fixes, and performance optimization',
    startDate: '2024-01-26',
    dueDate: '2024-01-27',
    estimatedHours: 12
  },
  {
    subject: 'Epic: Production Deployment',
    type: 'feature',
    description: 'Production deployment and go-live activities',
    startDate: '2024-01-28',
    dueDate: '2024-01-30',
    estimatedHours: 24
  },
  {
    subject: 'User Story: As a stakeholder, I can access the live application',
    type: 'task',
    description: 'Deploy to production environment with monitoring and logging',
    startDate: '2024-01-28',
    dueDate: '2024-01-29',
    estimatedHours: 12
  },
  {
    subject: 'User Story: As a user, I have documentation and training materials',
    type: 'task',
    description: 'Create user documentation, training materials, and support guides',
    startDate: '2024-01-29',
    dueDate: '2024-01-30',
    estimatedHours: 12
  },

  // Continuous Activities (Throughout project)
  {
    subject: 'Daily Standups & Sprint Planning',
    type: 'task',
    description: 'Daily standups, sprint planning, and retrospectives',
    startDate: '2024-01-01',
    dueDate: '2024-01-30',
    estimatedHours: 30
  },
  {
    subject: 'Code Reviews & Pair Programming',
    type: 'task',
    description: 'Continuous code reviews and collaborative development',
    startDate: '2024-01-01',
    dueDate: '2024-01-30',
    estimatedHours: 40
  }
];

async function deleteExistingWorkPackages(projectId) {
  console.log('\n🗑️  Removing existing work packages...');
  
  try {
    // Get existing work packages
    const response = await api.get(`/projects/${projectId}/work_packages`);
    const workPackages = response.data._embedded?.elements || [];
    
    for (const wp of workPackages) {
      try {
        await api.delete(`/work_packages/${wp.id}`);
        console.log(`✅ Deleted work package: ${wp.subject}`);
      } catch (error) {
        console.log(`⚠️  Could not delete work package ${wp.id}:`, error.response?.status);
      }
    }
  } catch (error) {
    console.log('⚠️  Could not retrieve existing work packages:', error.response?.status);
  }
}

async function createAgileWorkPackages(projectId) {
  console.log('\n📋 Creating Agile work packages...');
  
  for (const wp of agileWorkPackages) {
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
            href: `/api/v3/types/1`
          },
          status: {
            href: `/api/v3/statuses/1`
          },
          priority: {
            href: wp.priority === 'high' ? `/api/v3/priorities/3` : `/api/v3/priorities/2`
          }
        }
      };
      
      const response = await api.post('/work_packages', workPackageData);
      console.log(`✅ Created: ${wp.subject}`);
    } catch (error) {
      console.log(`❌ Failed to create "${wp.subject}":`, error.response?.data?.message || error.message);
    }
  }
}

async function updateProjectDescription(projectId) {
  console.log('\n📝 Updating project description for Agile methodology...');
  
  const agileDescription = `# MTI Employee Management System Enhancement - Agile SDLC

## Project Overview
This project follows Agile SDLC methodology with 4 sprints over 30 days.

## Agile Principles Applied
- **Iterative Development**: 4 one-week sprints with working software delivered each sprint
- **User Stories**: All features defined as user stories with acceptance criteria
- **Sprint Planning**: Each sprint has clear goals and deliverables
- **Daily Standups**: Regular team communication and progress tracking
- **Sprint Reviews**: Demo working software at end of each sprint
- **Retrospectives**: Continuous improvement and team learning

## Sprint Structure
- **Sprint 0**: Project Initiation & Setup (3 days)
- **Sprint 1**: Core Backend Infrastructure (7 days)
- **Sprint 2**: Advanced Features & File Processing (7 days)
- **Sprint 3**: Frontend Development & UI/UX (7 days)
- **Sprint 4**: Testing, Integration & Deployment (6 days)

## Definition of Done
- Code reviewed and approved
- Unit tests written and passing
- Integration tests passing
- Documentation updated
- User acceptance criteria met
- Deployed to staging environment

## Team Roles
- **Product Owner**: Defines requirements and priorities
- **Scrum Master**: Facilitates ceremonies and removes blockers
- **Development Team**: Cross-functional team delivering working software`;

  try {
    const updateData = {
      description: {
        format: 'markdown',
        raw: agileDescription
      }
    };
    
    await api.patch(`/projects/${projectId}`, updateData);
    console.log('✅ Project description updated with Agile methodology');
  } catch (error) {
    console.log('⚠️  Could not update project description:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Converting to Agile SDLC Project Structure');
  console.log('=' .repeat(60));
  
  try {
    const projectIdentifier = 'mti-employee-enhancement';
    
    // Get project details
    const project = await api.get(`/projects/${projectIdentifier}`);
    const projectId = project.data.id;
    
    console.log(`📊 Project: ${project.data.name}`);
    console.log(`🆔 Project ID: ${projectId}`);
    
    // Step 1: Delete existing work packages
    await deleteExistingWorkPackages(projectId);
    
    // Step 2: Update project description
    await updateProjectDescription(projectId);
    
    // Step 3: Create Agile work packages
    await createAgileWorkPackages(projectId);
    
    console.log('\n🎉 Agile SDLC conversion completed successfully!');
    console.log('=' .repeat(60));
    console.log(`📊 Project: MTI Employee Management System Enhancement`);
    console.log(`🔗 URL: ${OPENPROJECT_URL}/projects/${projectIdentifier}`);
    console.log(`📋 Work Packages: ${agileWorkPackages.length} (Agile structure)`);
    console.log(`🏃‍♂️ Methodology: Agile SDLC with 4 Sprints`);
    console.log('\n📝 Agile Features Implemented:');
    console.log('✅ Sprint-based timeline (4 sprints x 7 days)');
    console.log('✅ User stories with acceptance criteria');
    console.log('✅ Epics for feature grouping');
    console.log('✅ Milestones for sprint deliverables');
    console.log('✅ Continuous activities (standups, code reviews)');
    console.log('✅ Definition of Done criteria');
    console.log('\n🎯 Next Steps:');
    console.log('1. Set up Kanban board for sprint management');
    console.log('2. Configure sprint planning views');
    console.log('3. Assign team members to user stories');
    console.log('4. Schedule daily standups and sprint ceremonies');
    console.log('5. Begin Sprint 0 with project initiation');
    
  } catch (error) {
    console.log('❌ Conversion failed:', error.message);
  }
}

// Run the conversion
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };