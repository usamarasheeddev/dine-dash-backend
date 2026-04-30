'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const bcrypt = require('bcryptjs');
  class ServiceRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ServiceRequest.init({
    companyName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: DataTypes.STRING,
    address: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    planSlug: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    hooks: {
      beforeCreate: async (request) => {
        if (request.password) {
          const salt = await bcrypt.genSalt(10);
          request.password = await bcrypt.hash(request.password, salt);
        }
      },
      beforeUpdate: async (request) => {
        if (request.password && request.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          request.password = await bcrypt.hash(request.password, salt);
        }
      }
    },
    sequelize,
    modelName: 'ServiceRequest',
  });
  return ServiceRequest;
};