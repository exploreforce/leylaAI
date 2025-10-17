import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { db } from '../models/database';

const router = Router();

// GET /api/admin/accounts - List all accounts with users and stats
router.get('/accounts', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  console.log('📊 Admin: Fetching all accounts with users and stats');
  
  try {
    // Fetch all accounts
    const accounts = await db('accounts')
      .select('id', 'name', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');
    
    // For each account, fetch users and stats
    const accountsWithData = await Promise.all(accounts.map(async (account) => {
      // Fetch all users for this account
      const users = await db('users')
        .select('id', 'email', 'role', 'last_login', 'created_at')
        .where('account_id', account.id)
        .orderBy('created_at', 'asc');
      
      // For each user, count appointments they created
      const usersWithStats = await Promise.all(users.map(async (user) => {
        // Count appointments for this account (we can't track who created them currently)
        // So we'll just show 0 for now - this would need a created_by field in appointments
        const appointmentsCreated = 0; // TODO: Add created_by field to appointments table
        
        return {
          userId: user.id,
          email: user.email,
          role: user.role || 'user',
          lastLogin: user.last_login,
          createdAt: user.created_at,
          appointmentsCreated
        };
      }));
      
      // Get total appointments for this account
      const appointmentCount = await db('appointments')
        .where('account_id', account.id)
        .count('* as count')
        .first();
      
      return {
        accountId: account.id,
        accountName: account.name,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        users: usersWithStats,
        stats: {
          totalAppointments: parseInt(appointmentCount?.count as string || '0', 10),
          totalUsers: usersWithStats.length
        }
      };
    }));
    
    console.log(`📊 Admin: Returning ${accountsWithData.length} accounts`);
    
    return res.json({
      success: true,
      data: {
        accounts: accountsWithData
      }
    });
  } catch (error: any) {
    console.error('❌ Admin: Failed to fetch accounts:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch accounts'
    });
  }
}));

// PUT /api/admin/users/:userId/role - Change user's app-wide role
router.put('/users/:userId/role', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  console.log(`🔧 Admin: Changing role for user ${userId} to ${role}`);
  
  // Validate role
  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role. Must be "admin" or "user"'
    });
  }
  
  try {
    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update role
    await db('users')
      .where('id', userId)
      .update({ 
        role,
        updated_at: new Date()
      });
    
    console.log(`✅ Admin: Role updated for user ${userId}`);
    
    return res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        userId,
        role
      }
    });
  } catch (error: any) {
    console.error('❌ Admin: Failed to update user role:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user role'
    });
  }
}));

// DELETE /api/admin/users/:userId - Delete user
router.delete('/users/:userId', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  
  console.log(`🗑️ Admin: Deleting user ${userId}`);
  
  try {
    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if this is the last admin user
    if (user.role === 'admin') {
      const adminCount = await db('users')
        .where('role', 'admin')
        .count('* as count')
        .first();
      
      const count = parseInt(adminCount?.count as string || '0', 10);
      if (count <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user'
        });
      }
    }
    
    // Delete user (cascade will handle account_members)
    await db('users').where('id', userId).delete();
    
    console.log(`✅ Admin: User ${userId} deleted successfully`);
    
    return res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId
      }
    });
  } catch (error: any) {
    console.error('❌ Admin: Failed to delete user:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
}));

// PUT /api/admin/users/:userId/move - Move user to different account
router.put('/users/:userId/move', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { newAccountId } = req.body;
  
  console.log(`🔄 Admin: Moving user ${userId} to account ${newAccountId}`);
  
  if (!newAccountId) {
    return res.status(400).json({
      success: false,
      error: 'newAccountId is required'
    });
  }
  
  try {
    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if new account exists
    const newAccount = await db('accounts').where('id', newAccountId).first();
    if (!newAccount) {
      return res.status(404).json({
        success: false,
        error: 'Target account not found'
      });
    }
    
    // Check if user is already in the target account
    if (user.account_id === newAccountId) {
      return res.status(400).json({
        success: false,
        error: 'User is already in this account'
      });
    }
    
    const oldAccountId = user.account_id;
    
    // Update user's account
    await db('users')
      .where('id', userId)
      .update({ 
        account_id: newAccountId,
        updated_at: new Date()
      });
    
    // Update account_members entry
    // First, delete old entry
    await db('account_members')
      .where('user_id', userId)
      .where('account_id', oldAccountId)
      .delete();
    
    // Then, create new entry (or update if exists)
    const existingMember = await db('account_members')
      .where('user_id', userId)
      .where('account_id', newAccountId)
      .first();
    
    if (!existingMember) {
      const { v4: uuidv4 } = require('uuid');
      await db('account_members').insert({
        id: uuidv4(),
        account_id: newAccountId,
        user_id: userId,
        role: 'owner', // Default role when moved
        created_at: new Date()
      });
    }
    
    console.log(`✅ Admin: User ${userId} moved from account ${oldAccountId} to ${newAccountId}`);
    
    return res.json({
      success: true,
      message: 'User moved to new account successfully',
      data: {
        userId,
        oldAccountId,
        newAccountId
      }
    });
  } catch (error: any) {
    console.error('❌ Admin: Failed to move user:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to move user'
    });
  }
}));

export default router;

