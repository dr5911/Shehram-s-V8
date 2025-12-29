import { Sequelize } from 'sequelize-typescript';
import path from 'path';

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

export default sequelize;
