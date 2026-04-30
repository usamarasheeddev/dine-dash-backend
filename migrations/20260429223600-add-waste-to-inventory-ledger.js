'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'waste' to the enum_InventoryLedgers_type ENUM
    await queryInterface.sequelize.query('ALTER TYPE "enum_InventoryLedgers_type" ADD VALUE \'waste\'');
  },

  async down(queryInterface, Sequelize) {
    // ENUM values cannot be easily removed in PostgreSQL. 
    // Reverting would require renaming the old type, creating a new one, and updating the column.
    // Given the risk and complexity, we usually don't remove enum values in down migrations.
    console.log('Skipping removal of ENUM value "waste" in down migration.');
  }
};
