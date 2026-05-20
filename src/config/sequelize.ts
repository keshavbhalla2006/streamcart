import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Process.env values can be undefined — TypeScript forces us to handle that
const {
  DB_NAME     = '',
  DB_USER     = '',
  DB_PASSWORD = '',
  DB_HOST     = 'localhost',
  DB_PORT     = '3306',
} = process.env;

if (!DB_NAME || !DB_USER) {
  throw new Error('Missing required database environment variables');
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host:    DB_HOST,
  dialect: 'mysql',
  port:    parseInt(DB_PORT, 10),
  logging: false,
});

export default sequelize;