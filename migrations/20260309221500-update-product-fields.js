'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Products', 'variations', {
            type: Sequelize.JSONB,
            defaultValue: []
        });
        await queryInterface.addColumn('Products', 'addons', {
            type: Sequelize.JSONB,
            defaultValue: []
        });
        await queryInterface.addColumn('Products', 'active', {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Products', 'variations');
        await queryInterface.removeColumn('Products', 'addons');
        await queryInterface.removeColumn('Products', 'active');
    }
};
