'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hash = await bcrypt.hash('password123', 10);
    await queryInterface.bulkInsert('users', [
      { name: 'Seller Sam',  email: 'seller@test.com', password_hash: hash, role: 'seller', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Buyer Priya', email: 'buyer@test.com',  password_hash: hash, role: 'buyer',  createdAt: new Date(), updatedAt: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('users', null, {});
  },
};