'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Expense extends Model {
        static associate(models) {
            Expense.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
            Expense.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        }
    }
    Expense.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Other'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        expenseDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Expense',
        tableName: 'Expenses',
        timestamps: true,
    });
    return Expense;
};
