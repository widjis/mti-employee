/**
 * OpenProject API Service
 * Handles all interactions with OpenProject API
 */

import axios from 'axios';
import https from 'https';

class OpenProjectService {
  constructor() {
    this.baseURL = process.env.OPENPROJECT_URL;
    this.apiKey = process.env.OPENPROJECT_API_KEY;
    this.apiVersion = process.env.OPENPROJECT_API_VERSION || 'v3';
    this.syncEnabled = process.env.OPENPROJECT_SYNC_ENABLED === 'true';
    
    // Create axios instance
    this.api = axios.create({
      baseURL: `${this.baseURL}/api/${this.apiVersion}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`apikey:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      // For development/testing - bypass SSL verification
      // Remove this in production with proper SSL certificates
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.api.get('/');
      return {
        success: true,
        version: response.data._type,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Get all projects
   */
  async getProjects() {
    try {
      const response = await this.api.get('/projects');
      return {
        success: true,
        data: response.data._embedded?.elements || [],
        total: response.data.total
      };
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId) {
    try {
      const response = await this.api.get(`/projects/${projectId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to fetch project ${projectId}: ${error.message}`);
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData) {
    try {
      const response = await this.api.post('/projects', projectData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get all users
   */
  async getUsers() {
    try {
      const response = await this.api.get('/users');
      return {
        success: true,
        data: response.data._embedded?.elements || [],
        total: response.data.total
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to fetch user ${userId}: ${error.message}`);
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      const response = await this.api.post('/users', userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get work packages
   */
  async getWorkPackages(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filters
      if (filters.projectId) {
        params.append('filters', `[{"project":{"operator":"=","values":["${filters.projectId}"]}}]`);
      }
      if (filters.assigneeId) {
        params.append('filters', `[{"assignee":{"operator":"=","values":["${filters.assigneeId}"]}}]`);
      }
      if (filters.pageSize) {
        params.append('pageSize', filters.pageSize);
      }
      
      const response = await this.api.get(`/work_packages?${params.toString()}`);
      return {
        success: true,
        data: response.data._embedded?.elements || [],
        total: response.data.total
      };
    } catch (error) {
      throw new Error(`Failed to fetch work packages: ${error.message}`);
    }
  }

  /**
   * Create a work package
   */
  async createWorkPackage(workPackageData) {
    try {
      const response = await this.api.post('/work_packages', workPackageData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to create work package: ${error.message}`);
    }
  }

  /**
   * Sync MTI employee with OpenProject user
   */
  async syncEmployee(employee) {
    if (!this.syncEnabled) {
      return { success: false, message: 'Sync is disabled' };
    }

    try {
      // Check if user already exists by email
      const users = await this.getUsers();
      const existingUser = users.data.find(user => user.email === employee.email);
      
      if (existingUser) {
        return {
          success: true,
          action: 'found',
          data: existingUser,
          message: 'User already exists in OpenProject'
        };
      }

      // Create new user
      const userData = {
        login: employee.email.split('@')[0], // Use email prefix as login
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        status: 'active'
      };

      const result = await this.createUser(userData);
      return {
        success: true,
        action: 'created',
        data: result.data,
        message: 'User created in OpenProject'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get time entries
   */
  async getTimeEntries(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.userId) {
        params.append('filters', `[{"user":{"operator":"=","values":["${filters.userId}"]}}]`);
      }
      if (filters.projectId) {
        params.append('filters', `[{"project":{"operator":"=","values":["${filters.projectId}"]}}]`);
      }
      if (filters.pageSize) {
        params.append('pageSize', filters.pageSize);
      }
      
      const response = await this.api.get(`/time_entries?${params.toString()}`);
      return {
        success: true,
        data: response.data._embedded?.elements || [],
        total: response.data.total
      };
    } catch (error) {
      throw new Error(`Failed to fetch time entries: ${error.message}`);
    }
  }

  /**
   * Create time entry
   */
  async createTimeEntry(timeEntryData) {
    try {
      const response = await this.api.post('/time_entries', timeEntryData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Failed to create time entry: ${error.message}`);
    }
  }
}

export default OpenProjectService;