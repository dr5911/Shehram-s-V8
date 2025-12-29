import sequelize from '../config/database';
import '../models';

const migrate = async () => {
  try {
    console.log('Running database migrations...');
    
    await sequelize.authenticate();
    console.log('Database connection established');

    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
