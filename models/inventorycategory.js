'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InventoryCategory extends Model {
    static associate(models) {
      InventoryCategory.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      InventoryCategory.hasMany(models.InventoryItem, { foreignKey: 'categoryId', as: 'items' });
    }
  }
  InventoryCategory.init({
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'InventoryCategory',
    tableName: 'InventoryCategories'
  });
  return InventoryCategory;
};
