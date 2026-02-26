'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Customer.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Customer.hasMany(models.Order, { foreignKey: 'customerId', as: 'orders' });
      Customer.hasMany(models.Voucher, { foreignKey: 'customerId', as: 'vouchers' });
      Customer.hasMany(models.CustomerLedger, { foreignKey: 'customerId', as: 'ledger' });
    }
  }
  Customer.init({
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    address: DataTypes.TEXT,
    initial_balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    current_balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    companyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Companies',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Customer',
  });
  return Customer;
};