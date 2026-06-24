'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class RegisterSession extends Model {
        static associate(models) {
            RegisterSession.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
            RegisterSession.belongsTo(models.User, { foreignKey: 'openedByUserId', as: 'openedBy' });
            RegisterSession.belongsTo(models.User, { foreignKey: 'closedByUserId', as: 'closedBy' });
            RegisterSession.hasMany(models.Expense, { foreignKey: 'sessionId', as: 'expenses' });
        }
    }
    RegisterSession.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        openedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        closedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        openingBalance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        closingBalance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        expectedBalance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        difference: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        totalCashSales: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalCardSales: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalExpenses: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'open'
        },
        openedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        closedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'RegisterSession',
        tableName: 'RegisterSessions',
        timestamps: true,
    });
    return RegisterSession;
};
