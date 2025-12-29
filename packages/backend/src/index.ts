import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import sequelize, { connectDatabaseWithRetry, syncDatabase, checkDatabaseHealth } from './config/database';
import { connectRedisWithRetry, checkRedisHealth } from './config/redis';
import routes from './routes';
import { startScheduledPostsJob } from './jobs/scheduledPosts';
import { AppError } from './errors';
import { sanitizeError, isProduction } from './utils/errorHelpers';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use('/api', routes);

app.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks = {
    status: 'OK' as 'OK' | 'DEGRADED' | 'DOWN',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: 0,
    services: {
      database: {
        status: 'OK' as 'OK' | 'DOWN',
        connected: false,
      },
      redis: {
        status: 'OK' as 'OK' | 'DOWN',
        connected: false,
      },
    },
  };

  try {
    checks.services.database.connected = await checkDatabaseHealth();
    checks.services.database.status = checks.services.database.connected ? 'OK' : 'DOWN';
  } catch (error) {
    checks.services.database.connected = false;
    checks.services.database.status = 'DOWN';
    checks.status = 'DEGRADED';
  }

  try {
    checks.services.redis.connected = await checkRedisHealth();
    checks.services.redis.status = checks.services.redis.connected ? 'OK' : 'DOWN';
  } catch (error) {
    checks.services.redis.connected = false;
    checks.services.redis.status = 'DOWN';
    checks.status = 'DEGRADED';
  }

  if (!checks.services.database.connected && !checks.services.redis.connected) {
    checks.status = 'DOWN';
  }

  checks.responseTime = Date.now() - startTime;

  const statusCode = checks.status === 'DOWN' ? 503 : checks.status === 'DEGRADED' ? 200 : 200;
  
  res.status(statusCode).json(checks);
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    console.error(`[${err.statusCode}] ${err.constructor.name}:`, {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: err.timestamp,
      ...(isProduction() ? {} : { stack: err.stack }),
    });

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.isOperational ? {} : { isOperational: err.isOperational }),
    });
  }

  console.error('Unhandled error:', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method,
    ...(isProduction() ? {} : { stack: err.stack }),
  });

  const sanitized = sanitizeError(err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: isProduction() ? 'Internal server error' : err.message || 'Internal server error',
    ...(isProduction() ? {} : { details: sanitized }),
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    
    await connectDatabaseWithRetry(5);
    await syncDatabase();
    await connectRedisWithRetry(5);

    startScheduledPostsJob();

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error: any) {
    console.error('💥 Failed to start server:', {
      message: error.message,
      name: error.name,
      ...(error.context ? { context: error.context } : {}),
    });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }

  console.log('👋 Server shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

startServer();

export default app;
