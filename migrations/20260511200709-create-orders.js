'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      buyer_id:    { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users',    key: 'id' } },
      product_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
      stream_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'streams',  key: 'id' } },
      quantity:    { type: Sequelize.INTEGER, defaultValue: 1 },
      total_price: { type: Sequelize.FLOAT,   allowNull: false },
      status:      { type: Sequelize.ENUM('pending','confirmed','cancelled'), defaultValue: 'pending' },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('orders'); },
};