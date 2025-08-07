import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
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