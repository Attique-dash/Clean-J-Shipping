import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/constants';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ');
    error = {
      ...error,
      statusCode: 400,
      message: message || ERROR_MESSAGES.VALIDATION_FAILED
    };
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    const value = (err as any).keyValue[field];
    error = {
      ...error,
      statusCode: 400,
      message: `${field} '${value}' already exists`
    };
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = {
      ...error,
      statusCode: 400,
      message: ERROR_MESSAGES.NOT_FOUND
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      ...error,
      statusCode: 401,
      message: ERROR_MESSAGES.INVALID_TOKEN
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      ...error,
      statusCode: 401,
      message: ERROR_MESSAGES.TOKEN_EXPIRED
    };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || ERROR_MESSAGES.INTERNAL_ERROR;

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: error
    }),
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not found - ${req.originalUrl}`) as CustomError;
  error.statusCode = 404;
  next(error);
};
