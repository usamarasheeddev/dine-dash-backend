'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Voucher extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Voucher.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Voucher.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
    }
  }
  Voucher.init({
    customerId: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL,
    type: DataTypes.STRING,
    description: DataTypes.STRING,
    date: DataTypes.DATE,
    companyId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Voucher',
  });
  return Voucher;
};