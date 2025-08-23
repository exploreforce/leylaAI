import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  accountId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    req.userId = payload.userId;
    req.accountId = payload.accountId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}


