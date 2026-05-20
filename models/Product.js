const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Product = sequelize.define('Product', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  name: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type:         DataTypes.TEXT,
    defaultValue: '',
  },
  price: {
    type:      DataTypes.FLOAT,
    allowNull: false,
  },
  stock_quantity: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  stream_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'streams', key: 'id' },
  },
  is_flash_deal: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  flash_price: {
    type:         DataTypes.FLOAT,
    defaultValue: null,
  },
  flash_ends_at: {
    type:         DataTypes.DATE,
    defaultValue: null,
  },
}, {
  tableName:  'products',
  timestamps: true,
});

module.exports = Product;