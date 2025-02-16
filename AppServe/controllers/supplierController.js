// controllers/supplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');

class SupplierController extends BaseController {
  constructor() {
    const imageOptions = {
      entity: 'suppliers',
      type: 'single',
    };
    super(Supplier, null, imageOptions); // null car pas de WooCommerce
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
