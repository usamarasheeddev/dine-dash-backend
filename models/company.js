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
    }
  }, {
    sequelize,
    modelName: 'Company',
  });
  return Company;
};