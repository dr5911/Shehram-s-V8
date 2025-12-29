export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly errorCode?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.errorCode = errorCode;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    (this as any).details = details;
  }
}

export class AuthError extends BaseError {
  constructor(message: string = 'Authentication failed', errorCode?: string) {
    super(message, 401, true, errorCode || 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(message, 500, true, 'DATABASE_ERROR');
    if (originalError) {
      console.error('Original database error:', originalError);
    }
  }
}

export class ExternalServiceError extends BaseError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message: string = 'External service error',
    statusCode: number = 502,
    originalError?: Error
  ) {
    super(message, statusCode, true, `${service.toUpperCase()}_ERROR`);
    this.service = service;
    this.originalError = originalError;
  }
}

export class OpenAIError extends ExternalServiceError {
  constructor(message: string = 'OpenAI API error', originalError?: Error) {
    super('OpenAI', message, originalError?.message?.includes('429') ? 429 : 502, originalError);
  }
}

export class FacebookAPIError extends ExternalServiceError {
  constructor(message: string = 'Facebook API error', statusCode?: number, originalError?: Error) {
    super('Facebook', message, 502, originalError);
    if (statusCode) {
      this.statusCode = statusCode;
    }
    
    // Map Facebook error codes to appropriate status codes
    if (statusCode === 401 || message.includes('token')) {
      this.statusCode = 401;
    } else if (statusCode === 403) {
      this.statusCode = 403;
    } else if (statusCode === 429) {
      this.statusCode = 429;
    }
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string = 'Service configuration error') {
    super(message, 500, true, 'CONFIGURATION_ERROR');
  }
}

export class ScheduledPostError extends BaseError {
  public readonly postId?: string;
  public readonly retryCount?: number;

  constructor(
    message: string,
    postId?: string,
    retryCount?: number,
    originalError?: Error
  ) {
    super(message, 500, true, 'SCHEDULED_POST_ERROR');
    this.postId = postId;
    this.retryCount = retryCount;
    
    if (originalError) {
      console.error('Original scheduled post error:', originalError);
    }
  }
}