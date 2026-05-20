'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('streams', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      title:        { type: Sequelize.STRING, allowNull: false },
      description:  { type: Sequelize.TEXT,   defaultValue: '' },
      status:       { type: Sequelize.ENUM('scheduled','live','ended'), defaultValue: 'scheduled' },
      viewer_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      seller_id:    {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('streams'); },
};