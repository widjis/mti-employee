import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
const router = express.Router();

// Get all users (superadmin and admin only)
router.get('/', authenticateToken, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const users = await User.findAll();
    const requestingUser = req.user;
    
    // Filter out superadmin users if requesting user is not superadmin
    const filteredUsers = users.filter(user => {
      // If requesting user is superadmin, show all users
      if (requestingUser.role === 'superadmin') {
        return true;
      }
      // Otherwise, hide superadmin users from non-superadmin users
      // Check both Role and role fields for compatibility
      const userRole = user.Role || user.role;
      console.log(`Filtering user: ${user.username}, role: ${userRole}, requesting user role: ${requestingUser.role}`);
      return userRole !== 'superadmin';
    });
    
    // Remove password from response and map column names
    const sanitizedUsers = filteredUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      // Map database column names to frontend expected names
      return {
        ...userWithoutPassword,
        id: userWithoutPassword.Id,
        role: userWithoutPassword.Role,
        status: userWithoutPassword.account_locked ? 'inactive' : 'active'
      };
    });
    
    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Users can only view their own profile unless they're admin/superadmin
    if (id !== requestingUser.id && !['superadmin', 'admin'].includes(requestingUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hide superadmin users from non-superadmin users
    if (user.Role === 'superadmin' && requestingUser.role !== 'superadmin') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password from response and map column names
    const { password, ...userWithoutPassword } = user;
    // Map database column names to frontend expected names
    const mappedUser = {
      ...userWithoutPassword,
      id: userWithoutPassword.Id,
      role: userWithoutPassword.Role,
      status: userWithoutPassword.account_locked ? 'inactive' : 'active'
    };
    res.json({ user: mappedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create new user (superadmin only)
router.post('/', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  try {
    const { username, name, role, department, password } = req.body;
    
    // Validate required fields
    if (!username || !name || !role || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Validate role
    const validRoles = ['superadmin', 'admin', 'hr_general', 'finance', 'dep_rep', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Only superadmin can create other superadmins
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can create superadmin users' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await User.create({
      username,
      name,
      role,
      department,
      password: hashedPassword,
      status: 'active'
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user (superadmin and admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, department, status } = req.body;
    const requestingUser = req.user;
    
    // Check permissions
    if (!['superadmin', 'admin'].includes(requestingUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only superadmin can modify superadmin users
    if (user.role === 'superadmin' && requestingUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can modify superadmin users' });
    }
    
    // Only superadmin can assign superadmin role
    if (role === 'superadmin' && requestingUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
    }
    
    // Update user
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.Role = role; // Map to database column
    if (department !== undefined) updateData.department = department;
    if (status !== undefined) updateData.account_locked = status === 'inactive'; // Map status to account_locked
    
    const updatedUser = await User.update(id, updateData);
    
    // Return updated user without password and map column names
    const { password, ...userWithoutPassword } = updatedUser;
    const mappedUser = {
      ...userWithoutPassword,
      id: userWithoutPassword.Id,
      role: userWithoutPassword.Role,
      status: userWithoutPassword.account_locked ? 'inactive' : 'active'
    };
    
    res.json({ 
      message: 'User updated successfully',
      user: mappedUser 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (superadmin only)
router.delete('/:id', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Prevent self-deletion
    if (id === requestingUser.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.delete(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Update user column permissions (superadmin and admin)
router.put('/:id/permissions', authenticateToken, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedColumns } = req.body;
    
    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({ message: 'allowedColumns must be an array' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Note: customColumns functionality removed as column doesn't exist in current schema
    // TODO: Implement proper column permissions system
    
    res.json({ 
      message: 'Permissions updated successfully',
      allowedColumns 
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ message: 'Failed to update permissions' });
  }
});

// Get user's column permissions
router.get('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Users can only view their own permissions unless they're admin/superadmin
    if (id !== requestingUser.id && !['superadmin', 'admin'].includes(requestingUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Note: customColumns functionality removed as column doesn't exist in current schema
    // Return empty array for now, TODO: Implement proper column permissions system
    const allowedColumns = [];
    
    res.json({ 
      allowedColumns,
      role: user.Role || user.role 
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Failed to fetch permissions' });
  }
});

// Change password
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const requestingUser = req.user;
    
    // Check if user is trying to reset someone else's password
    if (id !== requestingUser.id) {
      // Only superadmin and admin can reset other users' passwords
      if (!['superadmin', 'admin'].includes(requestingUser.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get the target user to check their role
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const targetUserRole = targetUser.Role || targetUser.role;
      
      // Admin users cannot reset passwords for admin or superadmin users
      if (requestingUser.role === 'admin' && ['admin', 'superadmin'].includes(targetUserRole)) {
        return res.status(403).json({ message: 'Admin users cannot reset passwords for other admin or superadmin users' });
      }
      
      // Superadmin users can reset anyone's password (existing behavior)
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user is changing their own password, verify current password
    if (id === requestingUser.id) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }
    
    // Update password using User model method
    await User.updatePassword(id, newPassword);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

export default router;