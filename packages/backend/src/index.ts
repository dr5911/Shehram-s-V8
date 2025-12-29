import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import sequelize from './config/database';
import { connectRedis } from './config/redis';
import routes from './routes';
import { startScheduledPostsJob } from './jobs/scheduledPosts';
import { errorHandler } from './middleware/errorHandler';
import { Logger } from './utils/logger';
import { connectDatabaseWithRetry, connectRedisWithRetry } from './utils/retry';
import { DatabaseError, ExternalServiceError } from './utils/customErrors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Winston logger
const logger = Logger.getInstance();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

app.use('/api', routes);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
    redis: 'unknown'
  };

  try {
    // Check database connectivity
    await sequelize.authenticate();
    healthCheck.database = 'connected';
  } catch (error) {
    healthCheck.database = 'disconnected';
    logger.error('Health check - Database connection failed', { error });
  }

  try {
    // Check Redis connectivity
    const redis = require('./config/redis').redis;
    if (redis) {
      await redis.ping();
      healthCheck.redis = 'connected';
    } else {
      healthCheck.redis = 'not configured';
    }
  } catch (error) {
    healthCheck.redis = 'disconnected';
    logger.error('Health check - Redis connection failed', { error });
  }

  const isHealthy = healthCheck.database === 'connected' && healthCheck.redis === 'connected';
  
  res.status(isHealthy ? 200 : 503).json(healthCheck);
});

// Global error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    logger.info('Starting server initialization...');

    // Connect to database with retry logic
    await connectDatabaseWithRetry();
    logger.info('Database connected successfully');

    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');

    // Connect to Redis with retry logic
    await connectRedisWithRetry();
    logger.info('Redis connected successfully');

    // Start scheduled jobs with error handling
    try {
      startScheduledPostsJob();
      logger.info('Scheduled posts job started successfully');
    } catch (error) {
      logger.error('Failed to start scheduled posts job', { error });
      // Continue server startup even if scheduled job fails
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { 
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  try {
    await sequelize.close();
    const redis = require('./config/redis').redis;
    if (redis) {
      await redis.quit();
    }
    logger.info('Database and Redis connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

startServer();

export default app;
