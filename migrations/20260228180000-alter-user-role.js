'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('Users', 'role', {
            type: Sequelize.STRING,
            defaultValue: 'cashier',
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('Users', 'role', {
            type: Sequelize.ENUM('superadmin', 'admin', 'cashier'),
            defaultValue: 'cashier',
        });
    }
};
