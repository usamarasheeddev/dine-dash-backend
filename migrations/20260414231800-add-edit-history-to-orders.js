'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (!tableInfo.editHistory) {
      await queryInterface.addColumn('Orders', 'editHistory', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (tableInfo.editHistory) {
      await queryInterface.removeColumn('Orders', 'editHistory');
    }
  }
};

