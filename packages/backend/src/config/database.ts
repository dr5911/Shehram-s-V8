import { Sequelize } from 'sequelize-typescript';
import path from 'path';
import { DatabaseError } from '../errors';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://fbuser:fbpass123@localhost:5432/fb_earnings';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  models: [path.join(__dirname, '../models')],
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function connectDatabaseWithRetry(maxAttempts: number = 5): Promise<void> {
  let lastError: any;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxAttempts}...`);
      await sequelize.authenticate();
      console.log('✅ Database connected successfully');
      return;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Database connection attempt ${attempt} failed:`, {
        message: error.message,
        code: error.original?.code,
        errno: error.original?.errno,
      });

      if (attempt < maxAttempts) {
        console.log(`⏳ Retrying database connection in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  throw new DatabaseError(
    `Failed to connect to database after ${maxAttempts} attempts: ${lastError?.message}`,
    { originalError: lastError?.message, code: lastError?.original?.code }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function syncDatabase(): Promise<void> {
  try {
    console.log('Synchronizing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to synchronize database: ${error.message}`,
      { originalError: error.message }
    );
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
}

export default sequelize;
