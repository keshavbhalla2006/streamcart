module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Kipscse@200608',
    database: process.env.DB_NAME || 'streamcart_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },

  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Kipscse@200608',
    database: process.env.DB_NAME || 'streamcart_prod',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },

  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'testpassword',
    database: process.env.DB_NAME || 'streamcart_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
};