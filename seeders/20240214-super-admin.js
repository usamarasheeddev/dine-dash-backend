'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Check if superadmin exists
        const users = await queryInterface.sequelize.query(
            "SELECT * FROM \"Users\" WHERE role = 'superadmin';",
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (users.length === 0) {
            return queryInterface.bulkInsert('Users', [{
                username: 'Super Admin',
                email: 'admin@martpos.com',
                password: hashedPassword,
                role: 'superadmin',
                companyId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }]);
        }
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('Users', { role: 'superadmin' }, {});
    }
};
