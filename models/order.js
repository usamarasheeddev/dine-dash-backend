'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Order.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Order.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
      Order.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      Order.belongsTo(models.Waiter, { foreignKey: 'waiterId', as: 'waiter' });
      Order.belongsTo(models.Table, { foreignKey: 'tableId', as: 'table' });
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
    }
  }
  Order.init({
    orderType: DataTypes.STRING,
    subTotal: DataTypes.DECIMAL,
    discount: DataTypes.DECIMAL,
    tax: DataTypes.DECIMAL,
    finalTotal: DataTypes.DECIMAL,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    paymentMethod: DataTypes.STRING,
    waiterId: DataTypes.INTEGER,
    tableId: DataTypes.INTEGER,
    customerId: DataTypes.INTEGER,
    branchId: DataTypes.INTEGER,
    companyId: DataTypes.INTEGER,
    isUploaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editHistory: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};