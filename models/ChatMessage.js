const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  message: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  stream_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'streams', key: 'id' },
  },
  user_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName:  'chat_messages',
  timestamps: true,
});

module.exports = ChatMessage;