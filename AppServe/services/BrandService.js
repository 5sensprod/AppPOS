// services/BrandService.js
const BaseEntityService = require('./BaseEntityService');
const brandRepository = require('../repositories/BrandRepository');
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');

class BrandService extends BaseEntityService {
  constructor() {
    super(brandRepository, 'BRAND');
  }

  async findBySupplier(supplierId) {
    return await this.repository.findBySupplier(supplierId);
  }

  async syncToWooCommerce(brand) {
    const brandWooService = require('./BrandWooCommerceService');
    return await brandWooService.syncToWooCommerce(brand);
  }
}

module.exports = new BrandService();
