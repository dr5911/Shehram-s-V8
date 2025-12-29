import { Request, Response, NextFunction } from 'express';
import { BaseError, ValidationError, AuthError, AuthorizationError, NotFoundError, RateLimitError, DatabaseError, ExternalServiceError } from '../utils/customErrors';
import { Logger } from '../utils/logger';
import { ValidationError as SequelizeValidationError, UniqueConstraintError } from 'sequelize';

const logger = Logger.getInstance();

/**
 * Global error handler middleware
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error with context
  const errorContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  let handledError: BaseError;

  // Convert Sequelize errors to custom errors
  if (error instanceof SequelizeValidationError || error instanceof UniqueConstraintError) {
    const fieldErrors = error.errors?.map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    
    handledError = new ValidationError('Database validation error', fieldErrors);
    logger.warn('Database validation error', { 
      ...errorContext, 
      errors: fieldErrors 
    });
  }
  // Custom errors
  else if (error instanceof BaseError) {
    handledError = error;
    
    // Log based on error type
    if (error instanceof ValidationError) {
      logger.warn('Validation error', { ...errorContext, error: error.message });
    } else if (error instanceof AuthError || error instanceof AuthorizationError) {
      logger.warn('Authentication/Authorization error', { 
        ...errorContext, 
        error: error.message,
        errorCode: error.errorCode 
      });
    } else if (error instanceof DatabaseError) {
      logger.error('Database error', { 
        ...errorContext, 
        error: error.message,
        errorCode: error.errorCode 
      });
    } else if (error instanceof ExternalServiceError) {
      logger.error('External service error', { 
        ...errorContext, 
        service: error.service,
        error: error.message,
        errorCode: error.errorCode 
      });
    } else {
      logger.error('Application error', { 
        ...errorContext, 
        error: error.message,
        errorCode: error.errorCode 
      });
    }
  }
  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    handledError = new AuthError('Invalid token', 'INVALID_TOKEN');
    logger.warn('JWT validation error', errorContext);
  } else if (error.name === 'TokenExpiredError') {
    handledError = new AuthError('Token expired', 'TOKEN_EXPIRED');
    logger.warn('JWT expired', errorContext);
  }
  // Express rate limit errors
  else if (error.statusCode === 429 || error.message?.includes('Too many requests')) {
    handledError = new RateLimitError();
    logger.warn('Rate limit exceeded', { ...errorContext, ip: req.ip });
  }
  // Syntax errors (JSON parsing)
  else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    handledError = new ValidationError('Invalid JSON payload');
    logger.warn('Invalid JSON payload', errorContext);
  }
  // Default to Server Error
  else {
    handledError = new BaseError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error',
      500,
      false,
      'SERVER_ERROR'
    );
    
    logger.error('Unhandled error', { 
      ...errorContext, 
      error: error.message || error,
      stack: error.stack 
    });
  }

  // Sanitize error for production
  const errorResponse = {
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' && !handledError.isOperational
        ? 'Internal server error'
        : handledError.message,
      code: handledError.errorCode,
      status: handledError.statusCode
    },
    ...(process.env.NODE_ENV === 'development' && {
      stack: handledError.stack,
      originalError: error.message
    })
  };

  // Remove undefined fields
  Object.keys(errorResponse.error).forEach(key => 
    (errorResponse.error as any)[key] === undefined && delete (errorResponse.error as any)[key]
  );

  res.status(handledError.statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error tracking for monitoring/alerts
 */
export const trackError = (error: BaseError, context: any = {}) => {
  // Integrate with monitoring service (e.g., Sentry, DataDog)
  logger.error('Error tracked', {
    error: error.message,
    errorCode: error.errorCode,
    statusCode: error.statusCode,
    ...context
  });
  
  // Alert on critical errors
  if (error.statusCode >= 500) {
    logger.error('CRITICAL_ERROR_ALERT', {
      error: error.message,
      errorCode: error.errorCode,
      ...context
    });
  }
};