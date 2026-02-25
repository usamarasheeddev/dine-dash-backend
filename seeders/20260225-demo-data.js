'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Get the first company
        const companies = await queryInterface.sequelize.query(
            "SELECT id FROM \"Companies\" LIMIT 1;",
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (companies.length === 0) {
            console.log("No companies found. Skipping demo data seeder.");
            return;
        }

        const companyId = companies[0].id;

        // 2. Insert or find a Branch for Tables
        const branches = await queryInterface.sequelize.query(
            "SELECT id FROM \"Branches\" WHERE \"companyId\" = " + companyId + " LIMIT 1;",
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        let branchId;
        if (branches.length === 0) {
            await queryInterface.bulkInsert('Branches', [{
                name: 'Main Branch',
                companyId: companyId,
                address: 'Downtown',
                phone: '123-456-7890',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            }]);
            const newBranches = await queryInterface.sequelize.query(
                "SELECT id FROM \"Branches\" WHERE \"companyId\" = " + companyId + " ORDER BY id DESC LIMIT 1;",
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            branchId = newBranches[0].id;
        } else {
            branchId = branches[0].id;
        }

        // 3. Insert Product Categories
        await queryInterface.bulkInsert('ProductCategories', [
            { name: 'Pizza', companyId: companyId, createdAt: new Date(), updatedAt: new Date() },
            { name: 'Drinks', companyId: companyId, createdAt: new Date(), updatedAt: new Date() },
            { name: 'Mains', companyId: companyId, createdAt: new Date(), updatedAt: new Date() }
        ]);

        const categories = await queryInterface.sequelize.query(
            "SELECT id, name FROM \"ProductCategories\" WHERE \"companyId\" = " + companyId + " ORDER BY id DESC LIMIT 3;",
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const pizzaCat = categories.find(c => c.name === 'Pizza')?.id;
        const drinksCat = categories.find(c => c.name === 'Drinks')?.id;
        const mainsCat = categories.find(c => c.name === 'Mains')?.id;

        // 4. Insert Products
        if (pizzaCat && drinksCat && mainsCat) {
            await queryInterface.bulkInsert('Products', [
                { name: 'Margherita Pizza', price: 12.99, cost: 5.00, stock_quantity: 100, categoryId: pizzaCat, companyId: companyId, isFavourite: true, createdAt: new Date(), updatedAt: new Date() },
                { name: 'Pepperoni Pizza', price: 14.99, cost: 6.00, stock_quantity: 100, categoryId: pizzaCat, companyId: companyId, isFavourite: false, createdAt: new Date(), updatedAt: new Date() },
                { name: 'Cola', price: 2.50, cost: 0.50, stock_quantity: 200, categoryId: drinksCat, companyId: companyId, isFavourite: true, createdAt: new Date(), updatedAt: new Date() },
                { name: 'Lemonade', price: 3.00, cost: 0.80, stock_quantity: 150, categoryId: drinksCat, companyId: companyId, isFavourite: false, createdAt: new Date(), updatedAt: new Date() },
                { name: 'Grilled Salmon', price: 24.99, cost: 12.00, stock_quantity: 50, categoryId: mainsCat, companyId: companyId, isFavourite: true, createdAt: new Date(), updatedAt: new Date() }
            ]);
        }

        // 5. Insert Tables
        await queryInterface.bulkInsert('Tables', [
            { tableNo: 'T1', capacity: 2, location: 'Window', branchId: branchId, companyId: companyId, status: 'available', createdAt: new Date(), updatedAt: new Date() },
            { tableNo: 'T2', capacity: 4, location: 'Center Hall', branchId: branchId, companyId: companyId, status: 'available', createdAt: new Date(), updatedAt: new Date() },
            { tableNo: 'T3', capacity: 6, location: 'Patio', branchId: branchId, companyId: companyId, status: 'available', createdAt: new Date(), updatedAt: new Date() },
            { tableNo: 'T4', capacity: 2, location: 'Bar', branchId: branchId, companyId: companyId, status: 'occupied', createdAt: new Date(), updatedAt: new Date() }
        ]);

        console.log("Demo data embedded successfully.");
    },

    down: async (queryInterface, Sequelize) => {
        // Danger zone: be careful with deletes in a production-like structure,
        // but for demo seeders this is standard.
        await queryInterface.bulkDelete('Tables', null, {});
        await queryInterface.bulkDelete('Products', null, {});
        await queryInterface.bulkDelete('ProductCategories', null, {});
    }
};
