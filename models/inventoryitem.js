'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InventoryItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      InventoryItem.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      InventoryItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'linkedProduct' });
      InventoryItem.hasMany(models.InventoryLedger, { foreignKey: 'inventoryItemId', as: 'ledger' });
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: DataTypes.STRING,
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    minStock: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    supplier: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'InventoryItem',
  });
  return InventoryItem;
};