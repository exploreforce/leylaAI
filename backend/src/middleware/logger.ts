import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`🔵 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = ((...args: any[]) => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    
    console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    return originalEnd(...args);
  }) as any;
  
  next();
}; 