'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('OrderItems', 'variations', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: []
        });
        await queryInterface.addColumn('OrderItems', 'addons', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: []
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('OrderItems', 'variations');
        await queryInterface.removeColumn('OrderItems', 'addons');
    }
};
