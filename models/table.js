'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Table.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      Table.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
      Table.hasMany(models.Order, { foreignKey: 'tableId', as: 'orders' });
    }
  }
  Table.init({
    tableNo: DataTypes.STRING,
    capacity: DataTypes.INTEGER,
    location: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'available'
    },
    branchId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Branches',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Companies',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Table',
  });
  return Table;
};