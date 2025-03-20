// repositories/SupplierRepository.js
const BaseRepository = require('./BaseRepository');
const Supplier = require('../models/Supplier');

class SupplierRepository extends BaseRepository {
  constructor() {
    super(Supplier);
  }

  // Méthodes spécifiques aux fournisseurs si nécessaire
}

module.exports = new SupplierRepository();
