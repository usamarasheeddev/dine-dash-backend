'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Companies', 'expiryDate', {
            type: Sequelize.DATE,
            allowNull: true
        });
        await queryInterface.addColumn('Companies', 'subscriptionPrice', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0.00
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Companies', 'expiryDate');
        await queryInterface.removeColumn('Companies', 'subscriptionPrice');
    }
};
