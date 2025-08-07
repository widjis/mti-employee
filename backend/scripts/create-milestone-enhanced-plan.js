import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import https from 'https';

// Configure axios to ignore SSL certificate errors for development
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const OPENPROJECT_URL = process.env.OPENPROJECT_URL;
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY;
const PROJECT_IDENTIFIER = 'mti-employee-enhancement';

if (!OPENPROJECT_URL || !OPENPROJECT_API_KEY) {
    console.error('❌ Missing OpenProject configuration in .env file');
    process.exit(1);
}

const headers = {
    'Authorization': `Basic ${Buffer.from(`apikey:${OPENPROJECT_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json'
};

// Enhanced milestone structure with traditional SDLC phases
const SDLC_MILESTONES = [
    {
        subject: '🚀 Project Initiation Milestone',
        description: 'Project kickoff, team formation, and initial setup completed',
        startDate: '2024-01-01',
        dueDate: '2024-01-03',
        priority: 'high',
        estimatedTime: 'PT24H',
        type: 'milestone'
    },
    {
        subject: '📋 Planning & Analysis Milestone',
        description: 'Requirements gathering, technical analysis, and project planning completed',
        startDate: '2024-01-04',
        dueDate: '2024-01-07',
        priority: 'high',
        estimatedTime: 'PT32H',
        type: 'milestone'
    },
    {
        subject: '🎨 Design & Architecture Milestone',
        description: 'System design, UI/UX mockups, and technical architecture completed',
        startDate: '2024-01-08',
        dueDate: '2024-01-10',
        priority: 'high',
        estimatedTime: 'PT24H',
        type: 'milestone'
    },
    {
        subject: '⚡ Development Phase Milestone',
        description: 'Core development, feature implementation, and integration completed',
        startDate: '2024-01-11',
        dueDate: '2024-01-24',
        priority: 'high',
        estimatedTime: 'PT112H',
        type: 'milestone'
    },
    {
        subject: '🧪 Testing & UAT Milestone',
        description: 'Unit testing, integration testing, and user acceptance testing completed',
        startDate: '2024-01-25',
        dueDate: '2024-01-28',
        priority: 'high',
        estimatedTime: 'PT32H',
        type: 'milestone'
    },
    {
        subject: '🌟 Go Live & Production Milestone',
        description: 'Production deployment, go-live activities, and project closure completed',
        startDate: '2024-01-29',
        dueDate: '2024-01-30',
        priority: 'high',
        estimatedTime: 'PT16H',
        type: 'milestone'
    }
];

// Enhanced work packages with milestone relationships
const MILESTONE_WORK_PACKAGES = [
    // Project Initiation Phase
    {
        subject: '📊 Stakeholder Analysis & Communication Plan',
        description: 'Identify key stakeholders, establish communication channels, and create project charter',
        startDate: '2024-01-01',
        dueDate: '2024-01-02',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🚀 Project Initiation Milestone'
    },
    {
        subject: '🔧 Development Environment Setup',
        description: 'Configure development tools, repositories, and team access',
        startDate: '2024-01-02',
        dueDate: '2024-01-03',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🚀 Project Initiation Milestone'
    },
    {
        subject: '👥 Team Onboarding & Role Assignment',
        description: 'Onboard team members and assign specific roles and responsibilities',
        startDate: '2024-01-01',
        dueDate: '2024-01-03',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🚀 Project Initiation Milestone'
    },
    
    // Planning & Analysis Phase
    {
        subject: '📝 Business Requirements Documentation',
        description: 'Document detailed business requirements and acceptance criteria',
        startDate: '2024-01-04',
        dueDate: '2024-01-05',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '📋 Planning & Analysis Milestone'
    },
    {
        subject: '🔍 Technical Feasibility Analysis',
        description: 'Analyze technical requirements and identify potential risks',
        startDate: '2024-01-05',
        dueDate: '2024-01-06',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '📋 Planning & Analysis Milestone'
    },
    {
        subject: '📅 Sprint Planning & Backlog Creation',
        description: 'Create product backlog and plan sprint activities',
        startDate: '2024-01-06',
        dueDate: '2024-01-07',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '📋 Planning & Analysis Milestone'
    },
    
    // Design & Architecture Phase
    {
        subject: '🏗️ System Architecture Design',
        description: 'Design system architecture, database schema, and API structure',
        startDate: '2024-01-08',
        dueDate: '2024-01-09',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '🎨 Design & Architecture Milestone'
    },
    {
        subject: '🎨 UI/UX Design & Prototyping',
        description: 'Create wireframes, mockups, and interactive prototypes',
        startDate: '2024-01-08',
        dueDate: '2024-01-10',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '🎨 Design & Architecture Milestone'
    },
    
    // Testing & UAT Phase
    {
        subject: '🧪 Test Plan & Test Cases Creation',
        description: 'Develop comprehensive test plans and test cases for all features',
        startDate: '2024-01-25',
        dueDate: '2024-01-26',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '🧪 Testing & UAT Milestone'
    },
    {
        subject: '👥 User Acceptance Testing Execution',
        description: 'Conduct UAT with stakeholders and gather feedback',
        startDate: '2024-01-26',
        dueDate: '2024-01-27',
        priority: 'high',
        estimatedTime: 'PT12H',
        type: 'task',
        milestone: '🧪 Testing & UAT Milestone'
    },
    {
        subject: '🐛 Bug Fixes & Performance Optimization',
        description: 'Address UAT feedback and optimize system performance',
        startDate: '2024-01-27',
        dueDate: '2024-01-28',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🧪 Testing & UAT Milestone'
    },
    
    // Go Live & Production Phase
    {
        subject: '🚀 Production Deployment',
        description: 'Deploy application to production environment',
        startDate: '2024-01-29',
        dueDate: '2024-01-29',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🌟 Go Live & Production Milestone'
    },
    {
        subject: '📚 User Training & Documentation',
        description: 'Conduct user training sessions and finalize documentation',
        startDate: '2024-01-29',
        dueDate: '2024-01-30',
        priority: 'high',
        estimatedTime: 'PT8H',
        type: 'task',
        milestone: '🌟 Go Live & Production Milestone'
    },
    {
        subject: '🎯 Project Closure & Handover',
        description: 'Complete project closure activities and knowledge transfer',
        startDate: '2024-01-30',
        dueDate: '2024-01-30',
        priority: 'medium',
        estimatedTime: 'PT4H',
        type: 'task',
        milestone: '🌟 Go Live & Production Milestone'
    }
];

async function getProjectId() {
    try {
        const response = await axios.get(`${OPENPROJECT_URL}/api/v3/projects/${PROJECT_IDENTIFIER}`, { headers });
        return response.data.id;
    } catch (error) {
        console.error('❌ Error getting project ID:', error.response?.data || error.message);
        throw error;
    }
}

async function createMilestone(projectId, milestone) {
    try {
        const workPackageData = {
            subject: milestone.subject,
            description: {
                format: 'markdown',
                raw: milestone.description
            },
            startDate: milestone.startDate,
            dueDate: milestone.dueDate,
            estimatedTime: milestone.estimatedTime,
            _links: {
                project: {
                    href: `/api/v3/projects/${projectId}`
                },
                type: {
                    href: '/api/v3/types/1' // Milestone type
                },
                priority: {
                    href: milestone.priority === 'high' ? '/api/v3/priorities/7' : '/api/v3/priorities/8'
                },
                status: {
                    href: '/api/v3/statuses/1' // New status
                }
            }
        };

        const response = await axios.post(`${OPENPROJECT_URL}/api/v3/work_packages`, workPackageData, { headers });
        console.log(`✅ Created milestone: ${milestone.subject}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error creating milestone ${milestone.subject}:`, error.response?.data || error.message);
        throw error;
    }
}

async function createWorkPackage(projectId, workPackage, milestoneId = null) {
    try {
        const workPackageData = {
            subject: workPackage.subject,
            description: {
                format: 'markdown',
                raw: workPackage.description
            },
            startDate: workPackage.startDate,
            dueDate: workPackage.dueDate,
            estimatedTime: workPackage.estimatedTime,
            _links: {
                project: {
                    href: `/api/v3/projects/${projectId}`
                },
                type: {
                    href: '/api/v3/types/1' // Task type
                },
                priority: {
                    href: workPackage.priority === 'high' ? '/api/v3/priorities/7' : '/api/v3/priorities/8'
                },
                status: {
                    href: '/api/v3/statuses/1' // New status
                }
            }
        };

        // Add parent relationship if milestone is specified
        if (milestoneId) {
            workPackageData._links.parent = {
                href: `/api/v3/work_packages/${milestoneId}`
            };
        }

        const response = await axios.post(`${OPENPROJECT_URL}/api/v3/work_packages`, workPackageData, { headers });
        console.log(`✅ Created work package: ${workPackage.subject}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error creating work package ${workPackage.subject}:`, error.response?.data || error.message);
        throw error;
    }
}

async function updateProjectDescription(projectId) {
    try {
        const updatedDescription = `
# MTI Employee Management System Enhancement

## 🎯 Project Overview
Comprehensive enhancement of the MTI Employee Management System with modern web technologies, advanced features, and improved user experience.

## 📊 Project Methodology
**Hybrid Agile-Waterfall Approach:**
- **Traditional SDLC Milestones** for governance and stakeholder visibility
- **Agile Sprint Structure** for iterative development and flexibility
- **Continuous Integration** and delivery practices

## 🏗️ SDLC Milestones Structure

### Phase 1: 🚀 Project Initiation (Days 1-3)
- Stakeholder analysis and communication planning
- Development environment setup
- Team onboarding and role assignment

### Phase 2: 📋 Planning & Analysis (Days 4-7)
- Business requirements documentation
- Technical feasibility analysis
- Sprint planning and backlog creation

### Phase 3: 🎨 Design & Architecture (Days 8-10)
- System architecture design
- UI/UX design and prototyping
- Technical specifications finalization

### Phase 4: ⚡ Development (Days 11-24)
- **Sprint 1:** Core Backend Infrastructure (Days 11-17)
- **Sprint 2:** Frontend Development & Integration (Days 18-24)
- Continuous testing and code reviews

### Phase 5: 🧪 Testing & UAT (Days 25-28)
- Test plan and test cases creation
- User acceptance testing execution
- Bug fixes and performance optimization

### Phase 6: 🌟 Go Live & Production (Days 29-30)
- Production deployment
- User training and documentation
- Project closure and handover

## 🎯 Key Features
- **Modern Tech Stack:** React + Material UI frontend, Node.js backend
- **Advanced Excel Processing:** Bulk upload with validation
- **Real-time Dashboard:** Analytics and reporting
- **Secure Authentication:** JWT-based security
- **Responsive Design:** Desktop and mobile optimization
- **OpenProject Integration:** Project management and tracking

## 👥 Team Structure
- **Product Owner:** Stakeholder representative
- **Scrum Master:** Agile process facilitator  
- **Development Team:** Full-stack developers
- **QA Engineer:** Testing and quality assurance

## 📈 Success Metrics
- **Timeline:** 30-day delivery
- **Quality:** 95%+ test coverage
- **Performance:** <2s page load times
- **User Satisfaction:** >90% UAT approval

---
*Project managed using hybrid Agile-Waterfall methodology with OpenProject integration*
        `;

        const updateData = {
            description: {
                format: 'markdown',
                raw: updatedDescription
            }
        };

        await axios.patch(`${OPENPROJECT_URL}/api/v3/projects/${projectId}`, updateData, { headers });
        console.log('✅ Updated project description with SDLC milestones');
    } catch (error) {
        console.error('❌ Error updating project description:', error.response?.data || error.message);
        throw error;
    }
}

export async function main() {
    try {
        console.log('🚀 Starting SDLC Milestone Enhancement...');
        console.log('============================================================');
        
        // Get project ID
        const projectId = await getProjectId();
        console.log(`📋 Project ID: ${projectId}`);
        
        // Update project description
        await updateProjectDescription(projectId);
        
        // Create SDLC milestones
        console.log('\n📊 Creating SDLC Milestones...');
        const milestoneMap = new Map();
        
        for (const milestone of SDLC_MILESTONES) {
            const createdMilestone = await createMilestone(projectId, milestone);
            milestoneMap.set(milestone.subject, createdMilestone.id);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
        
        // Create milestone-related work packages
        console.log('\n📋 Creating Milestone Work Packages...');
        for (const workPackage of MILESTONE_WORK_PACKAGES) {
            const milestoneId = milestoneMap.get(workPackage.milestone);
            await createWorkPackage(projectId, workPackage, milestoneId);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
        
        console.log('\n🎉 SDLC Milestone Enhancement completed successfully!');
        console.log('============================================================');
        console.log(`📊 Project: MTI Employee Management System Enhancement`);
        console.log(`🔗 URL: ${OPENPROJECT_URL}/projects/${PROJECT_IDENTIFIER}`);
        console.log(`📋 SDLC Milestones: ${SDLC_MILESTONES.length}`);
        console.log(`📋 Milestone Work Packages: ${MILESTONE_WORK_PACKAGES.length}`);
        console.log('');
        console.log('📝 SDLC Structure Implemented:');
        console.log('✅ Traditional milestone governance');
        console.log('✅ Agile sprint flexibility');
        console.log('✅ Stakeholder visibility');
        console.log('✅ Risk management checkpoints');
        console.log('✅ Quality gates and reviews');
        console.log('✅ Continuous delivery pipeline');
        console.log('');
        console.log('🎯 Next Steps:');
        console.log('1. Review milestone dependencies');
        console.log('2. Assign milestone owners');
        console.log('3. Schedule milestone review meetings');
        console.log('4. Configure milestone reporting');
        console.log('5. Begin Phase 1: Project Initiation');
        
    } catch (error) {
        console.error('❌ SDLC Milestone Enhancement failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}