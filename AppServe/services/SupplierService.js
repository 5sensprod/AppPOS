// services/SupplierService.js
const BaseEntityService = require('./BaseEntityService');
const supplierRepository = require('../repositories/SupplierRepository');

class SupplierService extends BaseEntityService {
  constructor() {
    super(supplierRepository, 'SUPPLIER');
  }
}

module.exports = new SupplierService();
