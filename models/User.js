const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('User', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  name: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING,
    allowNull: false,
    unique:    true,
    validate: {
      isEmail: true,   // Sequelize validates format before saving
    },
  },
  password_hash: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM('buyer', 'seller'),
    allowNull:    false,
    defaultValue: 'buyer',
  },
}, {
  tableName:  'users',
  timestamps: true,   // auto-adds createdAt and updatedAt columns
});

module.exports = User;