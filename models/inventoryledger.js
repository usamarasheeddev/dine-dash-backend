'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InventoryLedger extends Model {
    static associate(models) {
      InventoryLedger.belongsTo(models.InventoryItem, { foreignKey: 'inventoryItemId', as: 'item' });
      InventoryLedger.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      InventoryLedger.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      InventoryLedger.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    }
  }
  InventoryLedger.init({
    inventoryItemId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING, // 'addition', 'deduction', 'adjustment', 'waste', 'sale'
      allowNull: false
    },
    quantityChange: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    previousStock: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    newStock: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    purchaseCost: {
      type: DataTypes.DECIMAL,
      defaultValue: 0
    },
    note: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'InventoryLedger',
    tableName: 'InventoryLedgers'
  });
  return InventoryLedger;
};