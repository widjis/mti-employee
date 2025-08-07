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

// Project start date: August 7, 2025
const PROJECT_START_DATE = '2025-08-07';

// Calculate dates based on project start
function calculateDate(startDate, daysToAdd) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
}

// Updated milestone timeline starting August 7, 2025
const UPDATED_MILESTONES = [
    {
        subject: '🚀 Project Initiation Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 0), // Aug 7
        dueDate: calculateDate(PROJECT_START_DATE, 2)     // Aug 9
    },
    {
        subject: '📋 Planning & Analysis Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 3),  // Aug 10
        dueDate: calculateDate(PROJECT_START_DATE, 6)     // Aug 13
    },
    {
        subject: '🎨 Design & Architecture Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 7),  // Aug 14
        dueDate: calculateDate(PROJECT_START_DATE, 9)     // Aug 16
    },
    {
        subject: '⚡ Development Phase Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 10), // Aug 17
        dueDate: calculateDate(PROJECT_START_DATE, 23)    // Aug 30
    },
    {
        subject: '🧪 Testing & UAT Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 24), // Aug 31
        dueDate: calculateDate(PROJECT_START_DATE, 27)    // Sep 3
    },
    {
        subject: '🌟 Go Live & Production Milestone',
        startDate: calculateDate(PROJECT_START_DATE, 28), // Sep 4
        dueDate: calculateDate(PROJECT_START_DATE, 29)    // Sep 5
    }
];

// Updated sprint timeline
const UPDATED_SPRINTS = [
    {
        subject: 'Sprint 0: Project Initiation & Setup',
        startDate: calculateDate(PROJECT_START_DATE, 0),  // Aug 7
        dueDate: calculateDate(PROJECT_START_DATE, 2)     // Aug 9
    },
    {
        subject: 'Sprint 1: Core Backend Infrastructure',
        startDate: calculateDate(PROJECT_START_DATE, 3),  // Aug 10
        dueDate: calculateDate(PROJECT_START_DATE, 9)     // Aug 16
    },
    {
        subject: 'Sprint 2: Advanced Features & File Processing',
        startDate: calculateDate(PROJECT_START_DATE, 10), // Aug 17
        dueDate: calculateDate(PROJECT_START_DATE, 16)    // Aug 23
    },
    {
        subject: 'Sprint 3: Frontend Development & UI/UX',
        startDate: calculateDate(PROJECT_START_DATE, 17), // Aug 24
        dueDate: calculateDate(PROJECT_START_DATE, 23)    // Aug 30
    },
    {
        subject: 'Sprint 4: Testing, Integration & Deployment',
        startDate: calculateDate(PROJECT_START_DATE, 24), // Aug 31
        dueDate: calculateDate(PROJECT_START_DATE, 29)    // Sep 5
    }
];

// Updated milestone work packages
const UPDATED_MILESTONE_PACKAGES = [
    // Project Initiation Phase (Aug 7-9)
    {
        subject: '📊 Stakeholder Analysis & Communication Plan',
        startDate: calculateDate(PROJECT_START_DATE, 0),
        dueDate: calculateDate(PROJECT_START_DATE, 1)
    },
    {
        subject: '🔧 Development Environment Setup',
        startDate: calculateDate(PROJECT_START_DATE, 1),
        dueDate: calculateDate(PROJECT_START_DATE, 2)
    },
    {
        subject: '👥 Team Onboarding & Role Assignment',
        startDate: calculateDate(PROJECT_START_DATE, 0),
        dueDate: calculateDate(PROJECT_START_DATE, 2)
    },
    
    // Planning & Analysis Phase (Aug 10-13)
    {
        subject: '📝 Business Requirements Documentation',
        startDate: calculateDate(PROJECT_START_DATE, 3),
        dueDate: calculateDate(PROJECT_START_DATE, 4)
    },
    {
        subject: '🔍 Technical Feasibility Analysis',
        startDate: calculateDate(PROJECT_START_DATE, 4),
        dueDate: calculateDate(PROJECT_START_DATE, 5)
    },
    {
        subject: '📅 Sprint Planning & Backlog Creation',
        startDate: calculateDate(PROJECT_START_DATE, 5),
        dueDate: calculateDate(PROJECT_START_DATE, 6)
    },
    
    // Design & Architecture Phase (Aug 14-16)
    {
        subject: '🏗️ System Architecture Design',
        startDate: calculateDate(PROJECT_START_DATE, 7),
        dueDate: calculateDate(PROJECT_START_DATE, 8)
    },
    {
        subject: '🎨 UI/UX Design & Prototyping',
        startDate: calculateDate(PROJECT_START_DATE, 7),
        dueDate: calculateDate(PROJECT_START_DATE, 9)
    },
    
    // Testing & UAT Phase (Aug 31 - Sep 3)
    {
        subject: '🧪 Test Plan & Test Cases Creation',
        startDate: calculateDate(PROJECT_START_DATE, 24),
        dueDate: calculateDate(PROJECT_START_DATE, 25)
    },
    {
        subject: '👥 User Acceptance Testing Execution',
        startDate: calculateDate(PROJECT_START_DATE, 25),
        dueDate: calculateDate(PROJECT_START_DATE, 26)
    },
    {
        subject: '🐛 Bug Fixes & Performance Optimization',
        startDate: calculateDate(PROJECT_START_DATE, 26),
        dueDate: calculateDate(PROJECT_START_DATE, 27)
    },
    
    // Go Live & Production Phase (Sep 4-5)
    {
        subject: '🚀 Production Deployment',
        startDate: calculateDate(PROJECT_START_DATE, 28),
        dueDate: calculateDate(PROJECT_START_DATE, 28)
    },
    {
        subject: '📚 User Training & Documentation',
        startDate: calculateDate(PROJECT_START_DATE, 28),
        dueDate: calculateDate(PROJECT_START_DATE, 29)
    },
    {
        subject: '🎯 Project Closure & Handover',
        startDate: calculateDate(PROJECT_START_DATE, 29),
        dueDate: calculateDate(PROJECT_START_DATE, 29)
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

async function getAllWorkPackages(projectId) {
    try {
        const response = await axios.get(`${OPENPROJECT_URL}/api/v3/projects/${projectId}/work_packages?pageSize=100`, { headers });
        return response.data._embedded.elements;
    } catch (error) {
        console.error('❌ Error getting work packages:', error.response?.data || error.message);
        throw error;
    }
}

async function updateWorkPackage(workPackageId, updateData) {
    try {
        // First, get the current work package to get the latest version
        const currentResponse = await axios.get(`${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`, { headers });
        const currentWorkPackage = currentResponse.data;
        
        // Include the lockVersion to prevent conflicts
        const updatePayload = {
            ...updateData,
            lockVersion: currentWorkPackage.lockVersion
        };
        
        const response = await axios.patch(`${OPENPROJECT_URL}/api/v3/work_packages/${workPackageId}`, updatePayload, { headers });
        return response.data;
    } catch (error) {
        console.error(`❌ Error updating work package ${workPackageId}:`, error.response?.data || error.message);
        throw error;
    }
}

async function updateProjectDescription(projectId) {
    try {
        const updatedDescription = `
# MTI Employee Management System Enhancement

## 🎯 Project Overview
Comprehensive enhancement of the MTI Employee Management System with modern web technologies, advanced features, and improved user experience.

**🗓️ Project Timeline: August 7 - September 5, 2025 (30 days)**

## 📊 Project Methodology
**Hybrid Agile-Waterfall Approach:**
- **Traditional SDLC Milestones** for governance and stakeholder visibility
- **Agile Sprint Structure** for iterative development and flexibility
- **Continuous Integration** and delivery practices

## 🏗️ SDLC Milestones Structure

### Phase 1: 🚀 Project Initiation (Aug 7-9, 2025)
- Stakeholder analysis and communication planning
- Development environment setup
- Team onboarding and role assignment

### Phase 2: 📋 Planning & Analysis (Aug 10-13, 2025)
- Business requirements documentation
- Technical feasibility analysis
- Sprint planning and backlog creation

### Phase 3: 🎨 Design & Architecture (Aug 14-16, 2025)
- System architecture design
- UI/UX design and prototyping
- Technical specifications finalization

### Phase 4: ⚡ Development (Aug 17-30, 2025)
- **Sprint 1:** Core Backend Infrastructure (Aug 10-16)
- **Sprint 2:** Advanced Features & File Processing (Aug 17-23)
- **Sprint 3:** Frontend Development & UI/UX (Aug 24-30)
- Continuous testing and code reviews

### Phase 5: 🧪 Testing & UAT (Aug 31 - Sep 3, 2025)
- Test plan and test cases creation
- User acceptance testing execution
- Bug fixes and performance optimization

### Phase 6: 🌟 Go Live & Production (Sep 4-5, 2025)
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
- **Timeline:** 30-day delivery (Aug 7 - Sep 5, 2025)
- **Quality:** 95%+ test coverage
- **Performance:** <2s page load times
- **User Satisfaction:** >90% UAT approval

---
*Project managed using hybrid Agile-Waterfall methodology with OpenProject integration*
*Start Date: August 7, 2025 | End Date: September 5, 2025*
        `;

        const updateData = {
            description: {
                format: 'markdown',
                raw: updatedDescription
            }
        };

        await axios.patch(`${OPENPROJECT_URL}/api/v3/projects/${projectId}`, updateData, { headers });
        console.log('✅ Updated project description with new timeline');
    } catch (error) {
        console.error('❌ Error updating project description:', error.response?.data || error.message);
        throw error;
    }
}

export async function main() {
    try {
        console.log('🗓️ Starting Project Timeline Update...');
        console.log('============================================================');
        console.log(`📅 New Project Start Date: ${PROJECT_START_DATE} (August 7, 2025)`);
        console.log(`📅 Project End Date: ${calculateDate(PROJECT_START_DATE, 29)} (September 5, 2025)`);
        console.log('');
        
        // Get project ID
        const projectId = await getProjectId();
        console.log(`📋 Project ID: ${projectId}`);
        
        // Update project description
        await updateProjectDescription(projectId);
        
        // Get all work packages
        console.log('\n📦 Retrieving all work packages...');
        const workPackages = await getAllWorkPackages(projectId);
        console.log(`📦 Found ${workPackages.length} work packages to update`);
        
        let updatedCount = 0;
        
        // Update milestones
        console.log('\n🎯 Updating SDLC Milestones...');
        for (const milestone of UPDATED_MILESTONES) {
            const workPackage = workPackages.find(wp => wp.subject === milestone.subject);
            if (workPackage) {
                const updateData = {
                    startDate: milestone.startDate,
                    dueDate: milestone.dueDate
                };
                await updateWorkPackage(workPackage.id, updateData);
                console.log(`✅ Updated: ${milestone.subject} (${milestone.startDate} - ${milestone.dueDate})`);
                updatedCount++;
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            }
        }
        
        // Update sprints
        console.log('\n🏃‍♂️ Updating Sprint Timeline...');
        for (const sprint of UPDATED_SPRINTS) {
            const workPackage = workPackages.find(wp => wp.subject === sprint.subject);
            if (workPackage) {
                const updateData = {
                    startDate: sprint.startDate,
                    dueDate: sprint.dueDate
                };
                await updateWorkPackage(workPackage.id, updateData);
                console.log(`✅ Updated: ${sprint.subject} (${sprint.startDate} - ${sprint.dueDate})`);
                updatedCount++;
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            }
        }
        
        // Update milestone work packages
        console.log('\n📋 Updating Milestone Work Packages...');
        for (const milestonePackage of UPDATED_MILESTONE_PACKAGES) {
            const workPackage = workPackages.find(wp => wp.subject === milestonePackage.subject);
            if (workPackage) {
                const updateData = {
                    startDate: milestonePackage.startDate,
                    dueDate: milestonePackage.dueDate
                };
                await updateWorkPackage(workPackage.id, updateData);
                console.log(`✅ Updated: ${milestonePackage.subject} (${milestonePackage.startDate} - ${milestonePackage.dueDate})`);
                updatedCount++;
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            }
        }
        
        console.log('\n🎉 Project Timeline Update completed successfully!');
        console.log('============================================================');
        console.log(`📊 Project: MTI Employee Management System Enhancement`);
        console.log(`🔗 URL: ${OPENPROJECT_URL}/projects/${PROJECT_IDENTIFIER}`);
        console.log(`📅 New Timeline: August 7 - September 5, 2025`);
        console.log(`📦 Work Packages Updated: ${updatedCount}`);
        console.log('');
        console.log('📝 Timeline Features Updated:');
        console.log('✅ SDLC milestones aligned to new dates');
        console.log('✅ Sprint timeline adjusted');
        console.log('✅ Milestone work packages rescheduled');
        console.log('✅ Project description updated');
        console.log('✅ Gantt chart timeline refreshed');
        console.log('');
        console.log('🎯 Project Schedule:');
        console.log(`📅 Project Initiation: Aug 7-9, 2025`);
        console.log(`📅 Planning & Analysis: Aug 10-13, 2025`);
        console.log(`📅 Design & Architecture: Aug 14-16, 2025`);
        console.log(`📅 Development Phase: Aug 17-30, 2025`);
        console.log(`📅 Testing & UAT: Aug 31 - Sep 3, 2025`);
        console.log(`📅 Go Live & Production: Sep 4-5, 2025`);
        
    } catch (error) {
        console.error('❌ Project Timeline Update failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}