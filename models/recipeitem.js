'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecipeItem extends Model {
    static associate(models) {
      RecipeItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      RecipeItem.belongsTo(models.InventoryItem, { foreignKey: 'inventoryItemId', as: 'inventoryItem' });
      RecipeItem.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    }
  }
  RecipeItem.init({
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    inventoryItemId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    variationName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    addonName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RecipeItem',
  });
  return RecipeItem;
};
