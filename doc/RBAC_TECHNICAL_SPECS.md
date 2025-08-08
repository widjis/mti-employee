# RBAC Technical Specifications
**MTI Employee Management System**

*Created: 2025-01-27*
*Version: 1.0*

---

## 🏗️ **System Architecture**

### **Three-Tier RBAC Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   React UI      │  │  Role-Based     │  │  Permission │ │
│  │   Components    │  │  Navigation     │  │  Checking   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Express.js    │  │  JWT Auth       │  │  Permission │ │
│  │   Middleware    │  │  Middleware     │  │  Service    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   SQL Server    │  │  RBAC Schema    │  │  Audit      │ │
│  │   Database      │  │  Tables         │  │  Trail      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **Database Schema Specifications**

### **Core RBAC Tables**

```sql
-- =====================================================
-- RBAC Core Schema
-- =====================================================

-- Roles Table
CREATE TABLE dbo.roles (
    role_id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    role_display_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    
    -- Indexes for performance
    INDEX IX_roles_name (role_name),
    INDEX IX_roles_active (is_active)
);

-- Permissions Table
CREATE TABLE dbo.permissions (
    permission_id INT IDENTITY(1,1) PRIMARY KEY,
    module_name NVARCHAR(50) NOT NULL,
    action_name NVARCHAR(50) NOT NULL,
    permission_key NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    
    -- Composite index for module.action lookups
    INDEX IX_permissions_module_action (module_name, action_name),
    INDEX IX_permissions_key (permission_key),
    INDEX IX_permissions_active (is_active)
);

-- Role-Permission Junction Table
CREATE TABLE dbo.role_permissions (
    role_permission_id INT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by NVARCHAR(50) NULL,
    granted_at DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    
    -- Foreign key constraints
    FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES dbo.permissions(permission_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE (role_id, permission_id),
    
    -- Indexes for join performance
    INDEX IX_role_permissions_role (role_id),
    INDEX IX_role_permissions_permission (permission_id)
);

-- User Roles (extends existing login table)
ALTER TABLE dbo.login ADD CONSTRAINT FK_login_roles 
    FOREIGN KEY (Role) REFERENCES dbo.roles(role_name);
```

### **Enhanced Audit Trail**

```sql
-- RBAC-specific audit trail
CREATE TABLE dbo.rbac_audit_trail (
    audit_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    target_user_id INT NULL,
    action_type NVARCHAR(50) NOT NULL,
    resource_type NVARCHAR(50) NOT NULL, -- 'ROLE', 'PERMISSION', 'USER'
    resource_id NVARCHAR(50) NULL,
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    performed_by NVARCHAR(50) NOT NULL,
    timestamp DATETIME2(3) NOT NULL DEFAULT GETDATE(),
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    session_id NVARCHAR(100) NULL,
    
    -- Indexes for audit queries
    INDEX IX_rbac_audit_user (user_id),
    INDEX IX_rbac_audit_timestamp (timestamp),
    INDEX IX_rbac_audit_action (action_type),
    INDEX IX_rbac_audit_resource (resource_type, resource_id)
);
```

### **Performance Views**

```sql
-- Optimized view for permission checking
CREATE VIEW dbo.vw_user_permissions AS
SELECT 
    l.username,
    l.id as user_id,
    r.role_name,
    r.role_display_name,
    p.module_name,
    p.action_name,
    p.permission_key,
    CONCAT(p.module_name, '.', p.action_name) as full_permission
FROM dbo.login l
INNER JOIN dbo.roles r ON l.Role = r.role_name
INNER JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
WHERE l.is_active = 1 AND r.is_active = 1 AND p.is_active = 1;

-- Role summary view
CREATE VIEW dbo.vw_role_summary AS
SELECT 
    r.role_name,
    r.role_display_name,
    r.description,
    COUNT(rp.permission_id) as permission_count,
    COUNT(l.id) as user_count,
    r.created_at,
    r.updated_at
FROM dbo.roles r
LEFT JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN dbo.login l ON r.role_name = l.Role
WHERE r.is_active = 1
GROUP BY r.role_id, r.role_name, r.role_display_name, r.description, r.created_at, r.updated_at;
```

---

## 🔧 **Backend Implementation**

### **Enhanced Permission Service**

```javascript
// services/permissionService.js
import sql from 'mssql';
import { getDbConnection } from '../config/database.js';
import { createAuditEntry } from './auditService.js';

class PermissionService {
  /**
   * Check if user has specific permission
   * @param {string} username - Username
   * @param {string} permissionKey - Permission key (e.g., 'employees.create')
   * @returns {Promise<boolean>}
   */
  static async checkUserPermission(username, permissionKey) {
    try {
      const pool = await getDbConnection();
      const request = pool.request();
      
      request.input('username', sql.NVarChar(50), username);
      request.input('permissionKey', sql.NVarChar(100), permissionKey);
      
      const result = await request.query(`
        SELECT COUNT(*) as has_permission
        FROM dbo.vw_user_permissions
        WHERE username = @username AND permission_key = @permissionKey
      `);
      
      return result.recordset[0]?.has_permission > 0;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param {string} username - Username
   * @returns {Promise<Array>}
   */
  static async getUserPermissions(username) {
    try {
      const pool = await getDbConnection();
      const request = pool.request();
      
      request.input('username', sql.NVarChar(50), username);
      
      const result = await request.query(`
        SELECT 
          module_name,
          action_name,
          permission_key,
          full_permission
        FROM dbo.vw_user_permissions
        WHERE username = @username
        ORDER BY module_name, action_name
      `);
      
      return result.recordset;
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  /**
   * Assign role to user
   * @param {number} userId - User ID
   * @param {string} roleName - Role name
   * @param {string} assignedBy - Username of assigner
   * @returns {Promise<boolean>}
   */
  static async assignUserRole(userId, roleName, assignedBy) {
    const transaction = new sql.Transaction();
    
    try {
      const pool = await getDbConnection();
      await transaction.begin(pool);
      
      const request = new sql.Request(transaction);
      
      // Get current role for audit
      request.input('userId', sql.Int, userId);
      const currentResult = await request.query(`
        SELECT Role as current_role FROM dbo.login WHERE id = @userId
      `);
      
      const oldRole = currentResult.recordset[0]?.current_role;
      
      // Update user role
      request.input('roleName', sql.NVarChar(50), roleName);
      await request.query(`
        UPDATE dbo.login 
        SET Role = @roleName, updated_at = GETDATE()
        WHERE id = @userId
      `);
      
      // Create audit entry
      await createAuditEntry({
        userId: userId,
        actionType: 'ROLE_ASSIGNED',
        resourceType: 'USER',
        resourceId: userId.toString(),
        oldValue: oldRole,
        newValue: roleName,
        performedBy: assignedBy,
        transaction: transaction
      });
      
      await transaction.commit();
      return true;
      
    } catch (error) {
      await transaction.rollback();
      console.error('Assign user role error:', error);
      return false;
    }
  }

  /**
   * Get role hierarchy with permissions
   * @returns {Promise<Array>}
   */
  static async getRoleHierarchy() {
    try {
      const pool = await getDbConnection();
      const request = pool.request();
      
      const result = await request.query(`
        SELECT 
          r.role_name,
          r.role_display_name,
          r.description,
          p.module_name,
          p.action_name,
          p.permission_key,
          p.description as permission_description
        FROM dbo.roles r
        LEFT JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
        LEFT JOIN dbo.permissions p ON rp.permission_id = p.permission_id
        WHERE r.is_active = 1
        ORDER BY r.role_name, p.module_name, p.action_name
      `);
      
      // Group by role
      const roleMap = new Map();
      
      result.recordset.forEach(row => {
        if (!roleMap.has(row.role_name)) {
          roleMap.set(row.role_name, {
            role_name: row.role_name,
            role_display_name: row.role_display_name,
            description: row.description,
            permissions: []
          });
        }
        
        if (row.permission_key) {
          roleMap.get(row.role_name).permissions.push({
            module_name: row.module_name,
            action_name: row.action_name,
            permission_key: row.permission_key,
            description: row.permission_description
          });
        }
      });
      
      return Array.from(roleMap.values());
      
    } catch (error) {
      console.error('Get role hierarchy error:', error);
      return [];
    }
  }
}

export default PermissionService;
```

### **Advanced Authorization Middleware**

```javascript
// middleware/rbac.js
import PermissionService from '../services/permissionService.js';
import { createAuditEntry } from '../services/auditService.js';

/**
 * Permission-based authorization middleware
 * @param {string} module - Module name (e.g., 'employees')
 * @param {string} action - Action name (e.g., 'create')
 * @returns {Function} Express middleware
 */
export const requirePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const permissionKey = `${module}.${action}`;
      const hasPermission = await PermissionService.checkUserPermission(
        req.user.username,
        permissionKey
      );

      if (!hasPermission) {
        // Log unauthorized access attempt
        await createAuditEntry({
          userId: req.user.id,
          actionType: 'ACCESS_DENIED',
          resourceType: 'PERMISSION',
          resourceId: permissionKey,
          performedBy: req.user.username,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: permissionKey,
          code: 'PERMISSION_DENIED'
        });
      }

      // Add permission info to request for logging
      req.permission = {
        module,
        action,
        key: permissionKey
      };

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Multiple permission check (OR logic)
 * @param {Array} permissions - Array of {module, action} objects
 * @returns {Function} Express middleware
 */
export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const permissionChecks = permissions.map(async (perm) => {
        const permissionKey = `${perm.module}.${perm.action}`;
        return await PermissionService.checkUserPermission(
          req.user.username,
          permissionKey
        );
      });

      const results = await Promise.all(permissionChecks);
      const hasAnyPermission = results.some(result => result === true);

      if (!hasAnyPermission) {
        const requiredPermissions = permissions.map(p => `${p.module}.${p.action}`);
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermissions,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Multiple permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Role-based authorization (legacy support)
 * @param {...string} allowedRoles - Allowed role names
 * @returns {Function} Express middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient role permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};
```

---

## 🎨 **Frontend Implementation**

### **Enhanced Permission Hook**

```typescript
// hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';
import { hasPermission, User, RolePermissions, Permission } from '@/types/user';
import { useMemo } from 'react';

interface UsePermissionsReturn {
  hasPermission: (module: keyof RolePermissions, action: keyof Permission) => boolean;
  hasAnyPermission: (permissions: Array<{module: keyof RolePermissions, action: keyof Permission}>) => boolean;
  hasAllPermissions: (permissions: Array<{module: keyof RolePermissions, action: keyof Permission}>) => boolean;
  canAccess: (requiredPermission: {module: keyof RolePermissions, action: keyof Permission}) => boolean;
  userRole: User['role'];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        canAccess: () => false,
        userRole: 'dep_rep' as User['role'],
        isAdmin: false,
        isSuperAdmin: false
      };
    }

    return {
      hasPermission: (module: keyof RolePermissions, action: keyof Permission) => 
        hasPermission(user.role, module, action),
      
      hasAnyPermission: (perms: Array<{module: keyof RolePermissions, action: keyof Permission}>) => 
        perms.some(perm => hasPermission(user.role, perm.module, perm.action)),
      
      hasAllPermissions: (perms: Array<{module: keyof RolePermissions, action: keyof Permission}>) => 
        perms.every(perm => hasPermission(user.role, perm.module, perm.action)),
      
      canAccess: (requiredPermission: {module: keyof RolePermissions, action: keyof Permission}) => 
        hasPermission(user.role, requiredPermission.module, requiredPermission.action),
      
      userRole: user.role,
      isAdmin: user.role === 'admin' || user.role === 'superadmin',
      isSuperAdmin: user.role === 'superadmin'
    };
  }, [user]);

  return permissions;
};
```

### **Permission-Based Components**

```typescript
// components/rbac/PermissionGate.tsx
import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { RolePermissions, Permission } from '@/types/user';

interface PermissionGateProps {
  children: React.ReactNode;
  module: keyof RolePermissions;
  action: keyof Permission;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

interface MultiplePermissionGateProps {
  children: React.ReactNode;
  permissions: Array<{module: keyof RolePermissions, action: keyof Permission}>;
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

// Single permission gate
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  module,
  action,
  fallback = null
}) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Multiple permissions gate
export const MultiplePermissionGate: React.FC<MultiplePermissionGateProps> = ({
  children,
  permissions,
  requireAll = false,
  fallback = null
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Role-based gate
interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Array<'superadmin' | 'admin' | 'hr_general' | 'finance' | 'dep_rep'>;
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  allowedRoles,
  fallback = null
}) => {
  const { userRole } = usePermissions();
  
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
```

### **User Management Interface**

```typescript
// components/UserManagement/UserTable.tsx
import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Shield } from 'lucide-react';
import { PermissionGate } from '@/components/rbac/PermissionGate';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onRoleChange: (userId: string, newRole: string) => void;
}

const ROLE_COLORS = {
  superadmin: 'bg-red-100 text-red-800',
  admin: 'bg-blue-100 text-blue-800',
  hr_general: 'bg-green-100 text-green-800',
  finance: 'bg-yellow-100 text-yellow-800',
  dep_rep: 'bg-gray-100 text-gray-800'
};

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Administrator',
  hr_general: 'HR General',
  finance: 'Finance',
  dep_rep: 'Dept. Rep'
};

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onRoleChange
}) => {
  const { hasPermission } = usePermissions();
  
  const canEditUsers = hasPermission('users', 'edit');
  const canDeleteUsers = hasPermission('users', 'delete');
  const canManageRoles = hasPermission('users', 'manage_roles');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.username}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}
                >
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                </Badge>
              </TableCell>
              <TableCell>{user.department || '-'}</TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGate module="users" action="edit">
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                    </PermissionGate>
                    
                    <PermissionGate module="users" action="manage_roles">
                      <DropdownMenuItem onClick={() => onRoleChange(user.id, user.role)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Change Role
                      </DropdownMenuItem>
                    </PermissionGate>
                    
                    <PermissionGate module="users" action="delete">
                      <DropdownMenuItem 
                        onClick={() => onDelete(user.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

---

## 🔒 **Security Specifications**

### **JWT Token Structure**

```javascript
// JWT Payload Structure
const jwtPayload = {
  // Standard claims
  iss: 'mti-employee-system',
  sub: userId,
  aud: 'mti-employees',
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  iat: Math.floor(Date.now() / 1000),
  jti: generateUniqueId(),
  
  // Custom claims
  userId: user.id,
  username: user.username,
  role: user.role,
  permissions: userPermissions, // Optional: embed permissions
  sessionId: generateSessionId()
};
```

### **Rate Limiting Configuration**

```javascript
// middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';

// Role-based rate limiting
export const createRoleBasedLimiter = (role) => {
  const limits = {
    superadmin: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
    admin: { windowMs: 15 * 60 * 1000, max: 500 },      // 500 requests per 15 minutes
    hr_general: { windowMs: 15 * 60 * 1000, max: 300 }, // 300 requests per 15 minutes
    finance: { windowMs: 15 * 60 * 1000, max: 200 },    // 200 requests per 15 minutes
    dep_rep: { windowMs: 15 * 60 * 1000, max: 100 }     // 100 requests per 15 minutes
  };
  
  return rateLimit({
    ...limits[role],
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Permission-specific rate limiting
export const permissionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 permission checks per minute
  keyGenerator: (req) => `${req.user?.username || req.ip}:permission-check`,
  message: {
    success: false,
    message: 'Too many permission checks, please slow down.',
    code: 'PERMISSION_RATE_LIMIT'
  }
});
```

---

## 📊 **Performance Specifications**

### **Caching Strategy**

```javascript
// services/cacheService.js
import Redis from 'redis';

class CacheService {
  constructor() {
    this.client = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });
  }

  /**
   * Cache user permissions
   * @param {string} username - Username
   * @param {Array} permissions - User permissions
   * @param {number} ttl - Time to live in seconds (default: 15 minutes)
   */
  async cacheUserPermissions(username, permissions, ttl = 900) {
    const key = `permissions:${username}`;
    await this.client.setex(key, ttl, JSON.stringify(permissions));
  }

  /**
   * Get cached user permissions
   * @param {string} username - Username
   * @returns {Promise<Array|null>}
   */
  async getCachedUserPermissions(username) {
    const key = `permissions:${username}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Invalidate user permissions cache
   * @param {string} username - Username
   */
  async invalidateUserPermissions(username) {
    const key = `permissions:${username}`;
    await this.client.del(key);
  }

  /**
   * Cache role hierarchy
   * @param {Array} hierarchy - Role hierarchy data
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   */
  async cacheRoleHierarchy(hierarchy, ttl = 3600) {
    const key = 'role:hierarchy';
    await this.client.setex(key, ttl, JSON.stringify(hierarchy));
  }

  /**
   * Get cached role hierarchy
   * @returns {Promise<Array|null>}
   */
  async getCachedRoleHierarchy() {
    const key = 'role:hierarchy';
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

export default new CacheService();
```

### **Database Optimization**

```sql
-- Performance indexes for RBAC queries
CREATE NONCLUSTERED INDEX IX_login_username_role 
ON dbo.login (username, Role) 
INCLUDE (id, is_active);

CREATE NONCLUSTERED INDEX IX_permissions_composite 
ON dbo.permissions (module_name, action_name, is_active) 
INCLUDE (permission_id, permission_key);

CREATE NONCLUSTERED INDEX IX_role_permissions_composite 
ON dbo.role_permissions (role_id, permission_id) 
INCLUDE (granted_at, granted_by);

-- Covering index for permission checks
CREATE NONCLUSTERED INDEX IX_permission_check_covering 
ON dbo.vw_user_permissions (username, permission_key) 
INCLUDE (module_name, action_name, role_name);
```

---

## 🧪 **Testing Specifications**

### **Unit Tests**

```javascript
// tests/rbac/permissionService.test.js
import PermissionService from '../../services/permissionService.js';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database.js';

describe('PermissionService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('checkUserPermission', () => {
    test('should return true for valid permission', async () => {
      const result = await PermissionService.checkUserPermission(
        'test-admin',
        'employees.create'
      );
      expect(result).toBe(true);
    });

    test('should return false for invalid permission', async () => {
      const result = await PermissionService.checkUserPermission(
        'test-user',
        'system.backup'
      );
      expect(result).toBe(false);
    });

    test('should handle non-existent user', async () => {
      const result = await PermissionService.checkUserPermission(
        'non-existent',
        'employees.view'
      );
      expect(result).toBe(false);
    });
  });

  describe('assignUserRole', () => {
    test('should successfully assign role', async () => {
      const result = await PermissionService.assignUserRole(
        1,
        'hr_general',
        'test-admin'
      );
      expect(result).toBe(true);
    });

    test('should create audit trail entry', async () => {
      await PermissionService.assignUserRole(1, 'admin', 'test-admin');
      
      // Check audit trail
      const auditEntries = await getAuditEntries('ROLE_ASSIGNED', 1);
      expect(auditEntries.length).toBeGreaterThan(0);
    });
  });
});
```

### **Integration Tests**

```javascript
// tests/rbac/middleware.test.js
import request from 'supertest';
import app from '../../app.js';
import { generateTestToken } from '../helpers/auth.js';

describe('RBAC Middleware', () => {
  describe('requirePermission middleware', () => {
    test('should allow access with correct permission', async () => {
      const token = generateTestToken({ role: 'admin', username: 'test-admin' });
      
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });

    test('should deny access without permission', async () => {
      const token = generateTestToken({ role: 'dep_rep', username: 'test-user' });
      
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Employee' });
      
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
    });

    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/employees');
      
      expect(response.status).toBe(401);
    });
  });
});
```

---

## 📈 **Monitoring & Metrics**

### **Performance Metrics**

```javascript
// middleware/metrics.js
import prometheus from 'prom-client';

// Permission check duration
const permissionCheckDuration = new prometheus.Histogram({
  name: 'rbac_permission_check_duration_seconds',
  help: 'Duration of permission checks',
  labelNames: ['username', 'permission', 'result']
});

// Permission check counter
const permissionCheckCounter = new prometheus.Counter({
  name: 'rbac_permission_checks_total',
  help: 'Total number of permission checks',
  labelNames: ['username', 'permission', 'result']
});

// Role distribution gauge
const roleDistribution = new prometheus.Gauge({
  name: 'rbac_role_distribution',
  help: 'Number of users per role',
  labelNames: ['role']
});

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    if (req.permission) {
      const result = res.statusCode < 400 ? 'success' : 'failure';
      
      permissionCheckDuration
        .labels(req.user.username, req.permission.key, result)
        .observe(duration);
      
      permissionCheckCounter
        .labels(req.user.username, req.permission.key, result)
        .inc();
    }
  });
  
  next();
};
```

---

This technical specification provides the detailed implementation guidelines for the RBAC system, covering database schema, backend services, frontend components, security measures, performance optimizations, and testing strategies.