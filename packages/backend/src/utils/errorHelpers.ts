import { AppError, ExternalServiceError, RateLimitError } from '../errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  shouldRetry: (error: any) => {
    const statusCode = error?.response?.status || error?.statusCode;
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const isRetryableStatus = retryableStatusCodes.includes(statusCode);
    const isNetworkError = error?.code === 'ECONNABORTED' || 
                          error?.code === 'ECONNRESET' ||
                          error?.code === 'ETIMEDOUT' ||
                          error?.code === 'ENOTFOUND';
    const isRateLimit = statusCode === 429;
    
    return isRetryableStatus || isNetworkError || isRateLimit;
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs || 1000;

  for (let attempt = 1; attempt <= (opts.maxAttempts || 3); attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      const shouldRetry = opts.shouldRetry ? opts.shouldRetry(error) : false;
      
      if (!shouldRetry || attempt >= (opts.maxAttempts || 3)) {
        throw error;
      }

      const isRateLimit = error?.response?.status === 429 || error?.statusCode === 429;
      const rateLimitDelay = isRateLimit 
        ? (error?.response?.headers?.['retry-after'] * 1000) || delay
        : delay;

      const waitTime = Math.min(rateLimitDelay, opts.maxDelayMs || 30000);
      
      console.warn(`Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${waitTime}ms...`, {
        error: error.message,
        statusCode: error?.response?.status || error?.statusCode,
      });

      await sleep(waitTime);
      delay *= (opts.backoffMultiplier || 2);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeError(error: any): any {
  if (!error) return null;

  const sanitized: any = {
    message: error.message,
    name: error.name,
    statusCode: error.statusCode || error.status,
    timestamp: error.timestamp || new Date().toISOString(),
  };

  if (error.context) {
    sanitized.context = {};
    for (const [key, value] of Object.entries(error.context)) {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('auth')) {
        sanitized.context[key] = '[REDACTED]';
      } else {
        sanitized.context[key] = value;
      }
    }
  }

  return sanitized;
}

export function handleAxiosError(error: any, serviceName: string): never {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.error?.message || data?.message || `${serviceName} API error`;

    if (status === 401 || status === 403) {
      throw new AppError(`${serviceName} authentication failed: ${message}`, status, true, { service: serviceName });
    }

    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new RateLimitError(
        `${serviceName} rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter}s.` : 'Please try again later.'}`,
        { service: serviceName, retryAfter }
      );
    }

    throw new ExternalServiceError(`${serviceName} returned error ${status}: ${message}`, { service: serviceName, status });
  }

  if (error.request) {
    throw new ExternalServiceError(`${serviceName} service unavailable: No response received`, { service: serviceName });
  }

  throw new ExternalServiceError(`${serviceName} request failed: ${error.message}`, { service: serviceName });
}

export function handleSequelizeError(error: any): never {
  if (error.name === 'SequelizeUniqueConstraintError') {
    const fields = Object.keys(error.fields || {});
    const message = fields.length > 0 
      ? `Duplicate entry for: ${fields.join(', ')}`
      : 'Duplicate entry found';
    throw new ConflictError(message, { fields });
  }

  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors?.map((e: any) => e.message).join(', ') || 'Validation failed';
    throw new ValidationError(errors, { originalError: error.name });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    throw new ValidationError('Related resource not found', { constraint: error.constraint });
  }

  if (error.name === 'SequelizeConnectionError') {
    throw new DatabaseError('Database connection failed', { originalError: error.message });
  }

  if (error.name === 'SequelizeConnectionRefusedError' || 
      error.name === 'SequelizeHostNotFoundError' ||
      error.name === 'SequelizeHostNotReachableError') {
    throw new DatabaseError('Database server unavailable', { originalError: error.name });
  }

  throw new DatabaseError('Database operation failed', { originalError: error.name, message: error.message });
}

export function isOpenAIError(error: any): error is { response?: { status: number; headers?: any } } {
  return error && typeof error === 'object';
}

export function handleOpenAIError(error: any): never {
  if (error.response) {
    const status = error.response.status;
    
    if (status === 401) {
      throw new AppError('OpenAI API key invalid or expired', 401, true, { service: 'OpenAI' });
    }

    if (status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const message = retryAfter 
        ? `OpenAI rate limit exceeded. Retry after ${retryAfter}s.`
        : 'OpenAI rate limit exceeded. Please try again later.';
      throw new RateLimitError(message, { service: 'OpenAI', retryAfter });
    }

    if (status === 500 || status === 502 || status === 503 || status === 504) {
      throw new ExternalServiceError(`OpenAI service error (${status}). Please try again later.`, { service: 'OpenAI', status });
    }
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    throw new ExternalServiceError('OpenAI API timeout. Please try again later.', { service: 'OpenAI' });
  }

  throw new ExternalServiceError(`OpenAI API error: ${error.message}`, { service: 'OpenAI' });
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function shouldLogErrorDetails(error: any): boolean {
  return !isProduction() || error.isOperational === false;
}
