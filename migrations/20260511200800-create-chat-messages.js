'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chat_messages', {
      id:        { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      message:   { type: Sequelize.TEXT,    allowNull: false },
      stream_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'streams', key: 'id' }, onDelete: 'CASCADE' },
      user_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users',   key: 'id' } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('chat_messages'); },
};