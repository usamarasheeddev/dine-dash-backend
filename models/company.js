'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Company.hasMany(models.User, { foreignKey: 'companyId', as: 'users' });
      Company.hasMany(models.InventoryItem, { foreignKey: 'companyId', as: 'inventoryItems' });
      Company.hasMany(models.Branch, { foreignKey: 'companyId', as: 'branches' });
      Company.hasMany(models.SubscriptionTransaction, { foreignKey: 'companyId', as: 'transactions' });
      Company.hasMany(models.ActivationToken, { foreignKey: 'companyId', as: 'activationTokens' });
    }
  }
  Company.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    },
    subscriptionPlan: {
      type: DataTypes.STRING,
      defaultValue: 'basic'
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscriptionPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    address: DataTypes.STRING,
    phone: DataTypes.STRING,
    phone2: DataTypes.STRING,
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD'
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'America/New_York'
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    receiptHeader: DataTypes.TEXT,
    receiptFooter: DataTypes.TEXT,
    orderTypes: {
      type: DataTypes.JSON,
      defaultValue: { dineIn: true, takeaway: true, delivery: true }
    },
    kitchenEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    silentPrintingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    selectedPrinter: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    mode: {
      type: DataTypes.STRING,
      defaultValue: 'online'
    }
  }, {
    sequelize,
    modelName: 'Company',
  });
  return Company;
};