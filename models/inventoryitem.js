'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InventoryItem extends Model {
    static associate(models) {
      InventoryItem.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      InventoryItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'linkedProduct' });
      InventoryItem.belongsTo(models.InventoryCategory, { foreignKey: 'categoryId', as: 'category' });
      InventoryItem.hasMany(models.InventoryLedger, { foreignKey: 'inventoryItemId', as: 'ledger' });
      InventoryItem.hasMany(models.RecipeItem, { foreignKey: 'inventoryItemId', as: 'recipeItems' });
    }
  }
  InventoryItem.init({
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryCategories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'simple' // 'simple' | 'ingredient'
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 4),
      defaultValue: 0
    },
    minStock: {
      type: DataTypes.DECIMAL(12, 4),
      defaultValue: 0
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(12, 4),
      defaultValue: 0
    },
    supplier: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'InventoryItem',
    tableName: 'InventoryItems'
  });
  return InventoryItem;
};