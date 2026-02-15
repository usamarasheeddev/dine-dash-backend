'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Waiter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Waiter.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Waiter.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
      Waiter.hasMany(models.Order, { foreignKey: 'waiterId', as: 'orders' });
    }
  }
  Waiter.init({
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    cnic: DataTypes.STRING,
    address: DataTypes.STRING,
    branchId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Branches',
        key: 'id'
      }
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
    modelName: 'Waiter',
  });
  return Waiter;
};