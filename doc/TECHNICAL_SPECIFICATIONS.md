# MTI Employee Management System - Technical Specifications

## Document Overview
This document provides detailed technical specifications for implementing the enhancements outlined in the PROJECT_ENHANCEMENT_PLAN.md.

---

## Phase 1: Security & Infrastructure Implementation

### 1.1 Password Hashing Implementation

#### Current State
```javascript
// Current login route (route.js)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // Direct password comparison - SECURITY RISK
  const query = `SELECT * FROM dbo.login WHERE username = @username AND password = @password`;
});
```

#### Target Implementation
```javascript
// Enhanced login with bcrypt
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Get user with hashed password
    const query = `SELECT * FROM dbo.login WHERE username = @username`;
    const request = new sql.Request();
    request.input('username', sql.VarChar, username);
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.recordset[0];
    
    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Database Migration Script
```sql
-- Migration: Add password_hash column and migrate existing passwords
USE MTIMasterEmployeeDB;

-- Step 1: Add new column
ALTER TABLE dbo.login ADD password_hash NVARCHAR(255);

-- Step 2: Create migration procedure (to be run with Node.js script)
-- This will be handled by a Node.js migration script that:
-- 1. Reads existing passwords
-- 2. Hashes them with bcrypt
-- 3. Updates password_hash column
-- 4. Drops old password column

-- Step 3: After migration, drop old password column
-- ALTER TABLE dbo.login DROP COLUMN password;
```

#### Migration Script (Node.js)
```javascript
// scripts/migrate-passwords.js
const bcrypt = require('bcrypt');
const sql = require('mssql');
require('dotenv').config();

async function migratePasswords() {
  try {
    await sql.connect({
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    });
    
    // Get all users with plain text passwords
    const users = await sql.query`SELECT id, username, password FROM dbo.login WHERE password_hash IS NULL`;
    
    for (const user of users.recordset) {
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      
      // Update the user record
      await sql.query`
        UPDATE dbo.login 
        SET password_hash = ${hashedPassword} 
        WHERE id = ${user.id}
      `;
      
      console.log(`Migrated password for user: ${user.username}`);
    }
    
    console.log('Password migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.close();
  }
}

migratePasswords();
```

### 1.2 Environment Configuration

#### .env Template
```env
# Database Configuration
DB_SERVER=10.60.10.47
DB_NAME=MTIMasterEmployeeDB
DB_USER=mti.hr
DB_PASSWORD=Merdeka@2025!
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=8080
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

#### Updated Database Configuration
```javascript
// config/database.js
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      if (!this.pool) {
        this.pool = await sql.connect(dbConfig);
        console.log('Database connected successfully');
      }
      return this.pool;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        console.log('Database disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  getPool() {
    return this.pool;
  }
}

module.exports = new DatabaseConnection();
```

### 1.3 Input Validation Middleware

```javascript
// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, underscores, and hyphens'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Employee validation
const validateEmployee = [
  body('employee_id')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Employee ID is required and must be less than 20 characters'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .matches(/^[+]?[0-9\s-()]+$/)
    .withMessage('Invalid phone number format'),
  body('department')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Department is required'),
  body('position')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Position is required'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateEmployee,
  handleValidationErrors
};
```

### 1.4 JWT Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const pool = await db.connect();
    const request = pool.request();
    request.input('userId', sql.Int, decoded.userId);
    
    const result = await request.query(`
      SELECT id, username, role, is_active 
      FROM dbo.login 
      WHERE id = @userId AND is_active = 1
    `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
```

---

## Phase 2: Architecture Modernization

### 2.1 Backend Separation Structure

```
mti-employee/
├── frontend/                 # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.js
│   ├── config/
│   ├── migrations/
│   ├── tests/
│   └── package.json
├── shared/                   # Shared types and utilities
│   ├── types/
│   └── constants/
├── docs/
├── docker-compose.yml
└── README.md
```

### 2.2 API Documentation with OpenAPI

```yaml
# backend/docs/openapi.yml
openapi: 3.0.3
info:
  title: MTI Employee Management API
  description: API for managing employee data and authentication
  version: 1.0.0
  contact:
    name: Development Team
    email: dev@mti.com

servers:
  - url: http://localhost:8080/api
    description: Development server
  - url: https://api.mti-employee.com/api
    description: Production server

paths:
  /auth/login:
    post:
      summary: User login
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  minLength: 3
                  maxLength: 50
                password:
                  type: string
                  minLength: 6
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        '401':
          description: Invalid credentials
        '400':
          description: Validation error

  /employees:
    get:
      summary: Get all employees
      tags:
        - Employees
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
        - name: search
          in: query
          schema:
            type: string
        - name: department
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of employees
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Employee'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        username:
          type: string
        role:
          type: string
          enum: [admin, hr_general, finance, dep_rep]
    
    Employee:
      type: object
      properties:
        id:
          type: integer
        employee_id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
        phone:
          type: string
        department:
          type: string
        position:
          type: string
        hire_date:
          type: string
          format: date
        salary:
          type: number
        status:
          type: string
          enum: [active, inactive, terminated]
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 2.3 Error Handling Middleware

```javascript
// backend/src/middleware/errorHandler.js
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDatabaseError = (error) => {
  if (error.code === 'EREQUEST') {
    return new AppError('Database query error', 400);
  }
  if (error.code === 'ELOGIN') {
    return new AppError('Database connection failed', 500);
  }
  return new AppError('Database error', 500);
};

const handleValidationError = (error) => {
  const message = Object.values(error.errors).map(val => val.message).join(', ');
  return new AppError(`Validation Error: ${message}`, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.code === 'EREQUEST' || error.code === 'ELOGIN') {
      error = handleDatabaseError(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationError(error);
    }

    sendErrorProd(error, res);
  }
};

module.exports = {
  AppError,
  globalErrorHandler
};
```

---

## Phase 3: Material UI Migration

### 3.1 Material UI Theme Configuration

```typescript
// frontend/src/theme/theme.ts
import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode colors
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#fff',
          },
          secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036',
            contrastText: '#fff',
          },
          background: {
            default: '#fafafa',
            paper: '#fff',
          },
          text: {
            primary: '#212121',
            secondary: '#757575',
          },
          // Custom role-based colors
          admin: {
            main: '#f44336',
            light: '#ff7961',
            dark: '#ba000d',
            contrastText: '#fff',
          },
          viewer: {
            main: '#4caf50',
            light: '#80e27e',
            dark: '#087f23',
            contrastText: '#fff',
          },
        }
      : {
          // Dark mode colors
          primary: {
            main: '#90caf9',
            light: '#e3f2fd',
            dark: '#42a5f5',
            contrastText: '#000',
          },
          secondary: {
            main: '#f48fb1',
            light: '#ffc1e3',
            dark: '#bf5f82',
            contrastText: '#000',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#fff',
            secondary: '#aaa',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export const createAppTheme = (mode: PaletteMode) => {
  return createTheme(getDesignTokens(mode));
};

// Extend the theme interface for custom colors
declare module '@mui/material/styles' {
  interface Palette {
    admin: Palette['primary'];
    viewer: Palette['primary'];
  }

  interface PaletteOptions {
    admin?: PaletteOptions['primary'];
    viewer?: PaletteOptions['primary'];
  }
}
```

### 3.2 Material UI Component Examples

```typescript
// frontend/src/components/ui/EmployeeCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/employee';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              mr: 2,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
            }}
          >
            {employee.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {employee.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {employee.employee_id}
            </Typography>
          </Box>
          {(canEdit || canDelete) && (
            <IconButton
              aria-label="more"
              onClick={handleMenuClick}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        <Box mb={2}>
          <Typography variant="body1" gutterBottom>
            {employee.position}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {employee.department}
          </Typography>
          <Chip
            label={employee.status}
            color={getStatusColor(employee.status) as any}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        {(employee.email || employee.phone) && (
          <Box>
            {employee.email && (
              <Box display="flex" alignItems="center" mb={1}>
                <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {employee.email}
                </Typography>
              </Box>
            )}
            {employee.phone && (
              <Box display="flex" alignItems="center">
                <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {employee.phone}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Hired: {new Date(employee.hire_date).toLocaleDateString()}
        </Typography>
      </CardActions>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {canEdit && (
          <MenuItem
            onClick={() => {
              onEdit(employee);
              handleMenuClose();
            }}
          >
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Edit
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => {
              onDelete(employee.id);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};
```

---

## Implementation Guidelines

### Code Quality Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for linting and testing

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Playwright for critical user flows
- **Coverage**: Minimum 80% code coverage

### Performance Considerations
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Defer loading of non-critical components
- **Memoization**: React.memo and useMemo for expensive operations
- **Bundle Analysis**: Regular bundle size monitoring

### Security Best Practices
- **Input Sanitization**: All user inputs sanitized
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: CSRF tokens for state-changing operations

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*  
*Author: Development Team*