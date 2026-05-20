const sequelize   = require('../config/sequelize');
const User        = require('./User');
const Stream      = require('./Stream');
const Product     = require('./Product');
const Order       = require('./Order');
const ChatMessage = require('./ChatMessage');

// --- ASSOCIATIONS ---

// A seller (User) can run many Streams
User.hasMany(Stream,  { foreignKey: 'seller_id', as: 'streams' });
Stream.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// A Stream has many Products showcased in it
Stream.hasMany(Product,  { foreignKey: 'stream_id', as: 'products' });
Product.belongsTo(Stream, { foreignKey: 'stream_id', as: 'stream' });

// A Stream has many ChatMessages
Stream.hasMany(ChatMessage,  { foreignKey: 'stream_id', as: 'messages' });
ChatMessage.belongsTo(Stream, { foreignKey: 'stream_id', as: 'stream' });

// A User (buyer) can have many Orders
User.hasMany(Order,  { foreignKey: 'buyer_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

// A Product can be in many Orders
Product.hasMany(Order,   { foreignKey: 'product_id', as: 'orders' });
Order.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// A Stream can have many Orders
Stream.hasMany(Order,  { foreignKey: 'stream_id', as: 'orders' });
Order.belongsTo(Stream, { foreignKey: 'stream_id', as: 'stream' });
// A User can send many ChatMessages
User.hasMany(ChatMessage,   { foreignKey: 'user_id', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { sequelize, User, Stream, Product, Order, ChatMessage };