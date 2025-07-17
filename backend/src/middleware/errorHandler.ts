import { Request, Response, NextFunction } from 'express';

// Error interface
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Central error handler middleware
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Database error handling
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      status: 'error',
      message: 'A record with this data already exists',
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      status: 'error',
      message: 'Referenced record does not exist',
    });
  }

  // Send response
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};