import { Response, NextFunction } from 'express';
import { AuthRequest, requireAuth } from './auth';
import { db } from '../models/database';

/**
 * Middleware to check if authenticated user has admin role
 * Must be used after requireAuth middleware
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // First check if user is authenticated
    requireAuth(req, res, async () => {
      try {
        // Check if user has admin role
        const user = await db('users')
          .select('role')
          .where('id', req.userId)
          .first();
        
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }
        
        if (user.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden: Admin access required' });
          return;
        }
        
        // User is admin, proceed
        next();
      } catch (error) {
        console.error('Admin auth check failed:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
    });
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}

