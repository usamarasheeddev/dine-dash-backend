require('dotenv').config();
const { sequelize } = require('./models');

async function createExpensesTable() {
    try {
        console.log('Authenticating...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        console.log('Syncing Expenses table...');
        // We can just sync the Expense model specifically
        const { Expense } = sequelize.models;
        await Expense.sync({ force: true });
        
        console.log('Expenses table created/synced successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database or sync:', error);
        process.exit(1);
    }
}

createExpensesTable();
