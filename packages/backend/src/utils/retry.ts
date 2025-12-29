import { Sequelize } from 'sequelize';
import { Logger } from './logger';
import { connectRedis } from '../config/redis';

const logger = Logger.getInstance();

/**
 * Exponential backoff delay calculator
 */
export function calculateExponentialBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
}

/**
 * Wait for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  operationName: string,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateExponentialBackoff(attempt - 1, baseDelay);
        logger.info(`${operationName}: Attempting retry ${attempt + 1}/${maxAttempts} after ${delay}ms`);
        await sleep(delay);
      }

      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn(`${operationName} attempt ${attempt + 1} failed:`, { 
        error: lastError.message,
        attempt: attempt + 1,
        maxAttempts 
      });

      // Don't retry on certain errors
      if (lastError.message.includes('ENOTFOUND') || 
          lastError.message.includes('ECONNREFUSED') && 
          attempt === maxAttempts - 1) {
        throw lastError;
      }
    }
  }

  throw new Error(`${operationName} failed after ${maxAttempts} attempts: ${lastError?.message}`);
}

/**
 * Connect to database with retry logic
 */
export async function connectDatabaseWithRetry(): Promise<void> {
  const sequelize = require('../config/database').default as Sequelize;
  
  return retryWithBackoff(
    async () => {
      await sequelize.authenticate();
      logger.info('Database connection successful');
    },
    5,
    'Database connection',
    2000
  );
}

/**
 * Connect to Redis with retry logic
 */
export async function connectRedisWithRetry(): Promise<void> {
  return retryWithBackoff(
    async () => {
      await connectRedis();
      logger.info('Redis connection successful');
    },
    5,
    'Redis connection',
    1000
  );
}

/**
 * Retry logic for external API calls
 */
export async function retryExternalAPICall<T>(
  fn: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(fn, maxRetries, operationName, 1500);
}