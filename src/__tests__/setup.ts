process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'mySuperSecretJwtKey123!';
process.env.PORT = '5001';

process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'Kipscse@200608';
process.env.DB_NAME = 'streamcart_test';
process.env.DB_PORT = '3306';

process.env.MAILTRAP_HOST = 'sandbox.smtp.mailtrap.io';
process.env.MAILTRAP_PORT = '2525';
process.env.MAILTRAP_USER = '559db272d86734';
process.env.MAILTRAP_PASS = '6d76fde724be28';
process.env.MAIL_FROM = 'noreply@streamcart.dev';

import sequelize from '../config/sequelize';
import User from '../models/User';
// import Stream from '../models/Stream';
// import Order from '../models/Order';

/**
 * ✅ Runs ONCE before all tests
 */
beforeAll(async () => {
  try {
    await sequelize.authenticate();

    // ensure all models are registered
    await sequelize.sync({ force: true });

    console.log('Test DB synced');
  } catch (err) {
    console.error('DB setup failed:', err);
    throw err;
  }
});

/**
 * ✅ Clean DB between tests (faster + safer than truncate all models manually)
 */
beforeEach(async () => {
  await sequelize.truncate({
    cascade: true,
    restartIdentity: true,
  });
});

/**
 * ✅ Prevent Jest hanging
 */
afterAll(async () => {
  await sequelize.close();
});