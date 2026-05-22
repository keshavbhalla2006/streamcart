import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load correct env file
dotenv.config({
  path: process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env',
});

const database =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DB_NAME
    : process.env.DB_NAME;

const {
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_HOST = 'localhost',
  DB_PORT = '3306',
} = process.env;

if (!database || !DB_USER) {
  throw new Error('Missing database environment variables');
}

const sequelize = new Sequelize(
  database,
  DB_USER,
  DB_PASSWORD,
  {
    host: DB_HOST,
    dialect: 'mysql',
    port: parseInt(DB_PORT, 10),
    logging: false,
  }
);

export default sequelize;