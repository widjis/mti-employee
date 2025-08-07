# OpenProject Integration Documentation

## Overview
This document provides comprehensive guidance for integrating the MTI Employee Management System with OpenProject API for enhanced project management capabilities.

**Last Updated**: 2025-01-27  
**Phase 2 Status**: ✅ COMPLETED - RBAC System and UI Enhancement  
**Current Phase**: Phase 3 Planning

## Table of Contents
1. [OpenProject API Overview](#openproject-api-overview)
2. [Authentication Setup](#authentication-setup)
3. [Integration Architecture](#integration-architecture)
4. [API Endpoints](#api-endpoints)
5. [Implementation Guide](#implementation-guide)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## OpenProject API Overview

### What is OpenProject?
OpenProject is an open-source project management software that provides:
- Project planning and scheduling
- Task management and tracking
- Time tracking and reporting
- Team collaboration tools
- Gantt charts and roadmaps
- Agile/Scrum boards

### API Capabilities
The OpenProject API v3 provides RESTful endpoints for:
- **Projects**: Create, read, update, delete projects
- **Work Packages**: Manage tasks, bugs, features
- **Users**: User management and authentication
- **Time Entries**: Track time spent on tasks
- **Categories**: Organize work packages
- **Versions**: Manage project versions/milestones

### API Documentation
- **Official API Docs**: `https://your-openproject-instance.com/api/docs`
- **API Version**: v3 (current stable)
- **Format**: JSON
- **Authentication**: API Key or OAuth2

---

## Authentication Setup

### 1. API Key Authentication (Recommended)

#### Step 1: Generate API Key
1. Log into your OpenProject instance
2. Go to **My Account** → **Access Tokens**
3. Click **+ API Token**
4. Enter a description (e.g., "MTI Employee System Integration")
5. Copy the generated API key

#### Step 2: Environment Configuration
Add to your `.env` file:
```env
# OpenProject Configuration
OPENPROJECT_URL=https://your-openproject-instance.com
OPENPROJECT_API_KEY=your_api_key_here
OPENPROJECT_API_VERSION=v3
```

### 2. OAuth2 Authentication (Advanced)

#### Application Registration
1. Go to **Administration** → **OAuth Applications**
2. Click **New Application**
3. Configure:
   - **Name**: MTI Employee Management
   - **Redirect URI**: `http://localhost:8080/auth/openproject/callback`
   - **Scopes**: `api_v3`

#### Environment Variables
```env
# OAuth2 Configuration
OPENPROJECT_CLIENT_ID=your_client_id
OPENPROJECT_CLIENT_SECRET=your_client_secret
OPENPROJECT_REDIRECT_URI=http://localhost:8080/auth/openproject/callback
```

---

## Integration Architecture

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MTI Employee  │    │   Integration    │    │   OpenProject   │
│   Management    │◄──►│   Middleware     │◄──►│   API v3        │
│   System        │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Integration Points
1. **Employee → User Sync**: Sync employee data with OpenProject users
2. **Department → Project Mapping**: Map departments to OpenProject projects
3. **Task Assignment**: Assign work packages to employees
4. **Time Tracking**: Sync time entries between systems
5. **Reporting**: Generate cross-system reports

### Data Flow
```
Employee Data → Validation → API Call → OpenProject → Response → Update Local DB
```

---

## API Endpoints

### Core Endpoints

#### Projects
```http
GET    /api/v3/projects
POST   /api/v3/projects
GET    /api/v3/projects/{id}
PATCH  /api/v3/projects/{id}
DELETE /api/v3/projects/{id}
```

#### Users
```http
GET    /api/v3/users
POST   /api/v3/users
GET    /api/v3/users/{id}
PATCH  /api/v3/users/{id}
DELETE /api/v3/users/{id}
```

#### Work Packages
```http
GET    /api/v3/work_packages
POST   /api/v3/work_packages
GET    /api/v3/work_packages/{id}
PATCH  /api/v3/work_packages/{id}
DELETE /api/v3/work_packages/{id}
```

#### Time Entries
```http
GET    /api/v3/time_entries
POST   /api/v3/time_entries
GET    /api/v3/time_entries/{id}
PATCH  /api/v3/time_entries/{id}
DELETE /api/v3/time_entries/{id}
```

### Request Headers
```http
Authorization: apikey your_api_key_here
Content-Type: application/json
Accept: application/json
```

---

## Implementation Guide

### Step 1: Install Dependencies
```bash
cd backend
npm install axios dotenv
```

### Step 2: Create OpenProject Service
Create `backend/services/openproject.js`:

```javascript
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class OpenProjectService {
  constructor() {
    this.baseURL = process.env.OPENPROJECT_URL;
    this.apiKey = process.env.OPENPROJECT_API_KEY;
    this.apiVersion = process.env.OPENPROJECT_API_VERSION || 'v3';
    
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/${this.apiVersion}`,
      headers: {
        'Authorization': `apikey ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
  }

  // Projects
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProject(projectData) {
    try {
      const response = await this.client.post('/projects', projectData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Users
  async getUsers() {
    try {
      const response = await this.client.get('/users');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(userData) {
    try {
      const response = await this.client.post('/users', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async syncEmployee(employee) {
    try {
      const userData = {
        login: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        status: 'active'
      };
      
      return await this.createUser(userData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Work Packages
  async getWorkPackages(projectId = null) {
    try {
      const url = projectId ? `/projects/${projectId}/work_packages` : '/work_packages';
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createWorkPackage(workPackageData) {
    try {
      const response = await this.client.post('/work_packages', workPackageData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Time Entries
  async getTimeEntries(userId = null) {
    try {
      const params = userId ? { 'filters[user_id][operator]': '=', 'filters[user_id][values][]': userId } : {};
      const response = await this.client.get('/time_entries', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTimeEntry(timeEntryData) {
    try {
      const response = await this.client.post('/time_entries', timeEntryData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // API responded with error status
      const { status, data } = error.response;
      return new Error(`OpenProject API Error ${status}: ${data.message || data.error || 'Unknown error'}`);
    } else if (error.request) {
      // Request made but no response
      return new Error('OpenProject API: No response received');
    } else {
      // Something else happened
      return new Error(`OpenProject API: ${error.message}`);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/projects?pageSize=1');
      return { status: 'connected', data: response.data };
    } catch (error) {
      return { status: 'error', error: this.handleError(error).message };
    }
  }
}

export default new OpenProjectService();
```

### Step 3: Create Integration Routes
Create `backend/routes/openproject.js`:

```javascript
import express from 'express';
import OpenProjectService from '../services/openproject.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Health check
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = await OpenProjectService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Projects
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await OpenProjectService.getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const project = await OpenProjectService.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Users sync
router.post('/sync/employee/:id', authenticateToken, authorizeRoles('admin', 'hr_general'), async (req, res) => {
  try {
    // Get employee from database
    const employeeQuery = 'SELECT * FROM dbo.employees WHERE employee_id = @id';
    const request = req.db.request();
    request.input('id', req.params.id);
    const result = await request.query(employeeQuery);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = result.recordset[0];
    const openProjectUser = await OpenProjectService.syncEmployee(employee);
    
    res.json({
      message: 'Employee synced successfully',
      employee: employee,
      openProjectUser: openProjectUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Work packages
router.get('/work-packages', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const workPackages = await OpenProjectService.getWorkPackages(projectId);
    res.json(workPackages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work-packages', authenticateToken, authorizeRoles('admin', 'hr_general'), async (req, res) => {
  try {
    const workPackage = await OpenProjectService.createWorkPackage(req.body);
    res.status(201).json(workPackage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Time entries
router.get('/time-entries', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const timeEntries = await OpenProjectService.getTimeEntries(userId);
    res.json(timeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/time-entries', authenticateToken, async (req, res) => {
  try {
    const timeEntry = await OpenProjectService.createTimeEntry(req.body);
    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Step 4: Update Main App
Update `backend/app.js` to include OpenProject routes:

```javascript
// Add this import
import openProjectRoutes from './routes/openproject.js';

// Add this route
app.use('/api/openproject', openProjectRoutes);
```

---

## Configuration

### Environment Variables
Update your `.env` file:

```env
# OpenProject Integration
OPENPROJECT_URL=https://your-openproject-instance.com
OPENPROJECT_API_KEY=your_api_key_here
OPENPROJECT_API_VERSION=v3

# Optional: OAuth2 Configuration
OPENPROJECT_CLIENT_ID=your_client_id
OPENPROJECT_CLIENT_SECRET=your_client_secret
OPENPROJECT_REDIRECT_URI=http://localhost:8080/auth/openproject/callback

# Integration Settings
OPENPROJECT_SYNC_ENABLED=true
OPENPROJECT_AUTO_SYNC_INTERVAL=3600000  # 1 hour in milliseconds
```

### Package.json Dependencies
Add to `backend/package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

---

## Error Handling

### Common Error Scenarios

1. **Authentication Errors**
   - Invalid API key
   - Expired tokens
   - Insufficient permissions

2. **Network Errors**
   - Connection timeout
   - OpenProject instance unavailable
   - DNS resolution issues

3. **Data Validation Errors**
   - Invalid user data format
   - Missing required fields
   - Duplicate entries

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  },
  "timestamp": "2024-12-XX T00:00:00Z"
}
```

---

## Testing

### Unit Tests
Create `backend/tests/openproject.test.js`:

```javascript
import { jest } from '@jest/globals';
import OpenProjectService from '../services/openproject.js';

describe('OpenProject Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should get projects successfully', async () => {
    const mockProjects = { _embedded: { elements: [] } };
    jest.spyOn(OpenProjectService.client, 'get').mockResolvedValue({ data: mockProjects });

    const result = await OpenProjectService.getProjects();
    expect(result).toEqual(mockProjects);
  });

  test('should handle API errors', async () => {
    const mockError = { response: { status: 401, data: { message: 'Unauthorized' } } };
    jest.spyOn(OpenProjectService.client, 'get').mockRejectedValue(mockError);

    await expect(OpenProjectService.getProjects()).rejects.toThrow('OpenProject API Error 401: Unauthorized');
  });
});
```

### Integration Tests
```bash
# Test API connectivity
curl -H "Authorization: apikey YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://your-openproject-instance.com/api/v3/projects
```

---

## Deployment

### Production Considerations

1. **Security**
   - Use environment variables for sensitive data
   - Implement rate limiting
   - Use HTTPS for all communications
   - Validate all input data

2. **Performance**
   - Implement caching for frequently accessed data
   - Use connection pooling
   - Monitor API rate limits

3. **Monitoring**
   - Log all API calls
   - Monitor response times
   - Set up alerts for failures

### Docker Configuration
Add to `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - OPENPROJECT_URL=${OPENPROJECT_URL}
      - OPENPROJECT_API_KEY=${OPENPROJECT_API_KEY}
```

---

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Check API key validity
   - Verify user permissions in OpenProject
   - Ensure correct API endpoint

2. **"Connection Timeout"**
   - Check OpenProject instance availability
   - Verify network connectivity
   - Increase timeout settings

3. **"Invalid Data Format"**
   - Validate request payload structure
   - Check required fields
   - Verify data types

### Debug Mode
Enable debug logging:

```env
LOG_LEVEL=debug
OPENPROJECT_DEBUG=true
```

### Health Check Endpoint
Test integration health:

```bash
curl http://localhost:8080/api/openproject/health
```

---

## Next Steps

1. **Setup OpenProject Instance**
   - Install OpenProject or use cloud version
   - Configure API access
   - Generate API keys

2. **Implement Integration**
   - Follow implementation guide
   - Test API connectivity
   - Implement error handling

3. **Frontend Integration**
   - Create OpenProject dashboard components
   - Implement project management UI
   - Add time tracking features

4. **Advanced Features**
   - Real-time synchronization
   - Webhook integration
   - Advanced reporting

---

*Documentation maintained by: Development Team*  
*Last updated: [Current Date]*  
*Version: 1.0*