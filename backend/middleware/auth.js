import jwt from 'jsonwebtoken';
import config from '../config/app.js';
import { executeProcedure } from '../config/database.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user info to request object
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, config.jwt.secret, { algorithms: [config.jwt.algorithm] }, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role(s)
 */
export const authorizeRoles = (...allowedRoles) => {
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
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

/**
 * Role requirement middleware (alias for authorizeRoles)
 */
export const requireRole = (allowedRoles) => {
  return authorizeRoles(...allowedRoles);
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  next();
};

/**
 * Permission-based Authorization Middleware
 * Checks if the authenticated user has the specified permission key
 * Uses SQL stored procedure dbo.sp_check_user_permission (@username, @permission_key)
 */
export const authorizePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Superadmin bypass: full access without DB check
      if (req.user.role === 'superadmin') {
        return next();
      }

      const username = req.user.username || req.user.user?.username;
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username missing from token payload'
        });
      }

      const result = await executeProcedure('sp_check_user_permission', {
        username,
        permission_key: permissionKey
      });

      const has = Array.isArray(result?.recordset) && result.recordset[0]?.has_permission === 1;
      if (!has) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permission: ${permissionKey}`
        });
      }

      return next();
    } catch (error) {
      console.error('authorizePermission error:', error?.message || error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error?.message || String(error)
      });
    }
  };
};

/**
 * Optional Authentication Middleware
 * Adds user info if token is present, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

/**
 * Refresh Token Middleware
 * Generates a new token if the current one is close to expiry
 */
export const refreshTokenIfNeeded = (req, res, next) => {
  if (req.user) {
    const now = Math.floor(Date.now() / 1000);
    const tokenExp = req.user.exp;
    const timeUntilExpiry = tokenExp - now;
    
    // If token expires in less than 1 hour, generate a new one
    if (timeUntilExpiry < 3600) {
      const newToken = jwt.sign(
        { 
          id: req.user.id, 
          username: req.user.username, 
          role: req.user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      res.setHeader('X-New-Token', newToken);
    }
  }
  
  next();
};