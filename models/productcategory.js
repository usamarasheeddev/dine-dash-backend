'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProductCategory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProductCategory.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      ProductCategory.hasMany(models.Product, { foreignKey: 'categoryId', as: 'products' });
    }
  }
  ProductCategory.init({
    name: DataTypes.STRING,
    image: DataTypes.STRING,
    companyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Companies',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ProductCategory',
  });
  return ProductCategory;
};