import Redis from 'ioredis';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

export const connectRedis = async (): Promise<void> => {
  try {
    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis error', { error });
    });

    await redis.ping();
  } catch (error) {
    logger.error('Redis connection failed', { error });
    throw error;
  }
};

process.on('SIGTERM', async () => {
  logger.info('Closing Redis connection...');
  await redis.quit();
});