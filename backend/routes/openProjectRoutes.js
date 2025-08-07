/**
 * OpenProject API Routes
 * Provides REST endpoints for OpenProject integration
 */

import express from 'express';
import OpenProjectService from '../services/openProjectService.js';

const router = express.Router();
const openProjectService = new OpenProjectService();

/**
 * Test OpenProject connection
 * GET /api/openproject/test
 */
router.get('/test', async (req, res) => {
  try {
    const result = await openProjectService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'OpenProject connection successful',
        data: {
          version: result.version,
          url: process.env.OPENPROJECT_URL,
          syncEnabled: process.env.OPENPROJECT_SYNC_ENABLED === 'true'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'OpenProject connection failed',
        error: result.error,
        status: result.status
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test OpenProject connection',
      error: error.message
    });
  }
});

/**
 * Get all projects
 * GET /api/openproject/projects
 */
router.get('/projects', async (req, res) => {
  try {
    const result = await openProjectService.getProjects();
    res.json({
      success: true,
      data: result.data,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

/**
 * Get project by ID
 * GET /api/openproject/projects/:id
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const result = await openProjectService.getProject(req.params.id);
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch project ${req.params.id}`,
      error: error.message
    });
  }
});

/**
 * Create new project
 * POST /api/openproject/projects
 */
router.post('/projects', async (req, res) => {
  try {
    const result = await openProjectService.createProject(req.body);
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
});

/**
 * Get all users
 * GET /api/openproject/users
 */
router.get('/users', async (req, res) => {
  try {
    const result = await openProjectService.getUsers();
    res.json({
      success: true,
      data: result.data,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * Get user by ID
 * GET /api/openproject/users/:id
 */
router.get('/users/:id', async (req, res) => {
  try {
    const result = await openProjectService.getUser(req.params.id);
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch user ${req.params.id}`,
      error: error.message
    });
  }
});

/**
 * Create new user
 * POST /api/openproject/users
 */
router.post('/users', async (req, res) => {
  try {
    const result = await openProjectService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/**
 * Sync MTI employee with OpenProject
 * POST /api/openproject/sync/employee/:id
 */
router.post('/sync/employee/:id', async (req, res) => {
  try {
    // This would typically fetch the employee from your database
    // For now, we'll expect the employee data in the request body
    const employee = req.body;
    
    if (!employee.email || !employee.first_name || !employee.last_name) {
      return res.status(400).json({
        success: false,
        message: 'Employee data must include email, first_name, and last_name'
      });
    }
    
    const result = await openProjectService.syncEmployee(employee);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        action: result.action,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to sync employee',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync employee',
      error: error.message
    });
  }
});

/**
 * Get work packages
 * GET /api/openproject/work-packages
 */
router.get('/work-packages', async (req, res) => {
  try {
    const filters = {
      projectId: req.query.projectId,
      assigneeId: req.query.assigneeId,
      pageSize: req.query.pageSize || 20
    };
    
    const result = await openProjectService.getWorkPackages(filters);
    res.json({
      success: true,
      data: result.data,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work packages',
      error: error.message
    });
  }
});

/**
 * Create work package
 * POST /api/openproject/work-packages
 */
router.post('/work-packages', async (req, res) => {
  try {
    const result = await openProjectService.createWorkPackage(req.body);
    res.status(201).json({
      success: true,
      message: 'Work package created successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create work package',
      error: error.message
    });
  }
});

/**
 * Get time entries
 * GET /api/openproject/time-entries
 */
router.get('/time-entries', async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      projectId: req.query.projectId,
      pageSize: req.query.pageSize || 20
    };
    
    const result = await openProjectService.getTimeEntries(filters);
    res.json({
      success: true,
      data: result.data,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries',
      error: error.message
    });
  }
});

/**
 * Create time entry
 * POST /api/openproject/time-entries
 */
router.post('/time-entries', async (req, res) => {
  try {
    const result = await openProjectService.createTimeEntry(req.body);
    res.status(201).json({
      success: true,
      message: 'Time entry created successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create time entry',
      error: error.message
    });
  }
});

export default router;