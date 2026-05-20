'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:           { type: Sequelize.STRING,  allowNull: false },
      description:    { type: Sequelize.TEXT,    defaultValue: '' },
      price:          { type: Sequelize.FLOAT,   allowNull: false },
      stock_quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      stream_id:      {
        type:       Sequelize.INTEGER, allowNull: false,
        references: { model: 'streams', key: 'id' },
        onDelete:   'CASCADE',
      },
      is_flash_deal: { type: Sequelize.BOOLEAN, defaultValue: false },
      flash_price:   { type: Sequelize.FLOAT,   defaultValue: null },
      flash_ends_at: { type: Sequelize.DATE,    defaultValue: null },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
      updatedAt:     { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('products'); },
};