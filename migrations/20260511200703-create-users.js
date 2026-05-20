'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:          { type: Sequelize.STRING,  allowNull: false },
      email:         { type: Sequelize.STRING,  allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING,  allowNull: false },
      role:          { type: Sequelize.ENUM('buyer', 'seller'), defaultValue: 'buyer' },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
      updatedAt:     { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};