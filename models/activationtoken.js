'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ActivationToken extends Model {
    static associate(models) {
      ActivationToken.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    }
  }
  ActivationToken.init({
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ActivationToken',
    tableName: 'ActivationTokens'
  });
  return ActivationToken;
};
