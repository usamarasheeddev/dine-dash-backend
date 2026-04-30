'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InventoryLedger extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      InventoryLedger.belongsTo(models.InventoryItem, { foreignKey: 'inventoryItemId', as: 'item' });
      InventoryLedger.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      InventoryLedger.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
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
    type: {
      type: DataTypes.ENUM('addition', 'deduction', 'adjustment', 'waste'),
      allowNull: false
    },
    quantityChange: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    previousStock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    newStock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    note: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'InventoryLedger',
  });
  return InventoryLedger;
};