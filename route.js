const router = express.Router();
import express from 'express';
import { sql, poolPromise } from './db.js';

// POST /api/login
router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM dbo.login WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.recordset[0];

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    return res.json({
      success: true,
      user: {
        id: user.Id,
        username: user.username,
        name: user.name,
        role: user.Role}
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from login router' });
});

export default router;