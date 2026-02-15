'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Branch.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Branch.hasMany(models.Table, { foreignKey: 'branchId', as: 'tables' });
      Branch.hasMany(models.Waiter, { foreignKey: 'branchId', as: 'waiters' });
      Branch.hasMany(models.Order, { foreignKey: 'branchId', as: 'orders' });
    }
  }
  Branch.init({
    name: DataTypes.STRING,
    address: DataTypes.STRING,
    phone: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
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
    modelName: 'Branch',
  });
  return Branch;
};