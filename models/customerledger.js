'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerLedger extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CustomerLedger.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      CustomerLedger.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    }
  }
  CustomerLedger.init({
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    type: {
      type: DataTypes.ENUM('credit', 'debit', 'payment'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    note: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'CustomerLedger',
  });
  return CustomerLedger;
};