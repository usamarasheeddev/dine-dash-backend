'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionTransaction extends Model {
    static associate(models) {
      SubscriptionTransaction.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    }
  }
  SubscriptionTransaction.init({
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    planName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('activation', 'renewal'),
      defaultValue: 'renewal'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'completed'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'manual'
    },
    notes: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'SubscriptionTransaction',
  });
  return SubscriptionTransaction;
};
