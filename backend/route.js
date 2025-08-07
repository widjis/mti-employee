import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { executeQuery, sql } from './config/database.js';
import config from './config/app.js';
import { loginValidation, handleValidationErrors, preventSQLInjection } from './middleware/validation.js';

const router = express.Router();

// POST /login (mounted at /api, so becomes /api/login)
router.post('/login', 
    preventSQLInjection,
    loginValidation,
    handleValidationErrors,
    async (req, res) => {

  const { username, password } = req.body;

  try {
    const result = await executeQuery(
      'SELECT * FROM dbo.login WHERE username = @username',
      { username }
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    // Use bcrypt to compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.Id, 
        username: user.username, 
        role: user.Role 
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
      user: {
        id: user.Id,
        username: user.username,
        name: user.name,
        role: user.Role
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