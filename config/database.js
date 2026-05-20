require('dotenv').config();

module.exports = {
  // Used by sequelize-cli for migrations
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    dialect:  'mysql',
    logging:  false,
  },

  
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    dialect:  'mysql',
    logging:  false,
  },
};

//a bridge between node.js app and mysql database
//.env → database.js → Sequelize instance → Models → Queries