'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Expenses', 'sessionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'RegisterSessions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Expenses', 'sessionId');
  }
};
