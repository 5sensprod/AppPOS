// controllers/SupplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
const supplierService = require('../services/SupplierService');
const ResponseHandler = require('../handlers/ResponseHandler');

class SupplierController extends BaseController {
  constructor() {
    // Pas de service WooCommerce pour les fournisseurs
    super(Supplier, null, {
      entity: 'suppliers',
      type: 'single',
    });
  }

  _getService() {
    return supplierService;
  }
}

const supplierController = new SupplierController();

module.exports = {
  getAll: supplierController.getAll.bind(supplierController),
  getById: supplierController.getById.bind(supplierController),
  create: supplierController.create.bind(supplierController),
  update: supplierController.update.bind(supplierController),
  delete: supplierController.delete.bind(supplierController),
  uploadImage: supplierController.uploadImage,
  updateImageMetadata: supplierController.updateImageMetadata,
  deleteImage: supplierController.deleteImage,
};
