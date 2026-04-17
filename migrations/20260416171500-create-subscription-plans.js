'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SubscriptionPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      durationDays: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      features: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SubscriptionPlans');
  }
};
