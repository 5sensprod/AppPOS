// repositories/BrandRepository.js
const BaseRepository = require('./BaseRepository');
const Brand = require('../models/Brand');

class BrandRepository extends BaseRepository {
  constructor() {
    super(Brand);
  }

  async findBySupplier(supplierId) {
    return await this.model.findBySupplier(supplierId);
  }
}

module.exports = new BrandRepository();
