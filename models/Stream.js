const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Stream = sequelize.define('Stream', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  title: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type:         DataTypes.TEXT,
    defaultValue: '',
  },
  status: {
    type:         DataTypes.ENUM('scheduled', 'live', 'ended'),
    defaultValue: 'scheduled',
  },
  viewer_count: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  seller_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: {
      model: 'users',  // foreign key points to users table
      key:   'id',
    },
  },
}, {
  tableName:  'streams',
  timestamps: true,
});

module.exports = Stream;