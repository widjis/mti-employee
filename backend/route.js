import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { executeQuery, sql } from './config/database.js';
import config from './config/app.js';
import { loginValidation, handleValidationErrors, preventSQLInjection } from './middleware/validation.js';
import ldapService from './services/ldapService.js';
import User from './models/User.js';

const router = express.Router();

// POST /login (mounted at /api, so becomes /api/login)
router.post('/login', 
    preventSQLInjection,
    loginValidation,
    handleValidationErrors,
    async (req, res) => {

  const { username, password, authType = 'auto' } = req.body;

  try {
    let user = null;
    let authMethod = 'local';

    // Check if user exists locally first
    const localUser = await User.findByUsername(username);
    
    if (localUser && localUser.auth_type === 'domain') {
      // User is configured for domain authentication
      authMethod = 'domain';
    } else if (localUser && localUser.auth_type === 'local') {
      // User is configured for local authentication
      authMethod = 'local';
    } else if (!localUser && authType !== 'local') {
      // User doesn't exist locally, try domain authentication
      authMethod = 'domain';
    }

    // Attempt authentication based on determined method
    if (authMethod === 'domain') {
      console.log(`Attempting domain authentication for user: ${username}`);
      
      // Try LDAP authentication
      const ldapResult = await ldapService.authenticateUser(username, password);
      
      if (ldapResult.success) {
        // Sync user with local database
        user = await ldapService.syncDomainUser(ldapResult.user);
        console.log(`Domain authentication successful for user: ${username}`);
      } else {
        console.log(`Domain authentication failed for user: ${username} - ${ldapResult.error}`);
        
        // If domain auth fails and user exists locally, try local auth as fallback
        if (localUser && localUser.password) {
          console.log(`Falling back to local authentication for user: ${username}`);
          authMethod = 'local';
        } else {
          return res.status(401).json({ 
            success: false, 
            message: 'Domain authentication failed',
            details: ldapResult.error
          });
        }
      }
    }
    
    if (authMethod === 'local') {
      console.log(`Attempting local authentication for user: ${username}`);
      
      if (!localUser) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!localUser.password) {
        return res.status(401).json({ 
          success: false, 
          message: 'Local authentication not available for domain users' 
        });
      }

      // Use bcrypt to compare passwords
      const isPasswordValid = await bcrypt.compare(password, localUser.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      user = localUser;
      console.log(`Local authentication successful for user: ${username}`);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }

    // Update last login
    await User.updateLastLogin(username);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.Id || user.id, 
        username: user.username, 
        role: user.Role || user.role,
        authType: user.auth_type || 'local'
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        algorithm: config.jwt.algorithm
      }
    );

    return res.json({
      success: true,
      token,
      authMethod,
      user: {
        id: user.Id || user.id,
        username: user.username,
        name: user.name,
        role: user.Role || user.role,
        department: user.department,
        authType: user.auth_type || 'local'
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from login router' });
});

export default router;