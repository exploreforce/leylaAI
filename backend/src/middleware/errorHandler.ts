import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = err;
  
  console.error('Error:', {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const response = {
    error: {
      message: message || 'Internal Server Error',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  };

  res.status(statusCode).json(response);
};

export const createError = (statusCode: number, message: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 