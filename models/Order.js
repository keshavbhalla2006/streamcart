const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Order = sequelize.define('Order', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  buyer_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  product_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' },
  },
  stream_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'streams', key: 'id' },
  },
  quantity: {
    type:         DataTypes.INTEGER,
    defaultValue: 1,
  },
  total_price: {
    type:      DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type:         DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
    defaultValue: 'pending',
  },
}, {
  tableName:  'orders',
  timestamps: true,
});

module.exports = Order;