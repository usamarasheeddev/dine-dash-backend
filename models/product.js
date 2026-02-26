'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Product.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Product.belongsTo(models.ProductCategory, { foreignKey: 'categoryId', as: 'category' });
      Product.belongsTo(models.InventoryItem, { foreignKey: 'inventoryItemId', as: 'linkedInventory' });
      Product.hasMany(models.OrderItem, { foreignKey: 'productId', as: 'orderItems' });
    }
  }
  Product.init({
    name: DataTypes.STRING,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    categoryId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'ProductCategories',
        key: 'id'
      }
    },
    image: DataTypes.STRING,
    isFavourite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    inventoryItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryItems',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Product',
  });
  return Product;
};