import { createClient, RedisClientType } from 'redis';
import { ServiceUnavailableError } from '../errors';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('Redis reconnection failed after 10 attempts');
        return false;
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`Redis reconnection attempt ${retries}, reconnecting in ${delay}ms`);
      return delay;
    },
    connectTimeout: 10000,
  },
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', {
    message: err.message,
    code: err.code,
  });
});

redisClient.on('connect', () => {
  console.log('✅ Redis Client Connected');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis Client Reconnecting...');
});

export async function connectRedisWithRetry(maxAttempts: number = 5): Promise<void> {
  let lastError: any;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Redis connection attempt ${attempt}/${maxAttempts}...`);
      await redisClient.connect();
      console.log('✅ Redis connected successfully');
      return;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Redis connection attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
      });

      if (attempt < maxAttempts) {
        console.log(`⏳ Retrying Redis connection in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  throw new ServiceUnavailableError(
    `Failed to connect to Redis after ${maxAttempts} attempts: ${lastError?.message}`,
    { originalError: lastError?.message, code: lastError?.code }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    return false;
  }
}

export const connectRedis = connectRedisWithRetry;

export default redisClient;
