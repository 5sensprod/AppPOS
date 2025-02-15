// controllers/supplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
const BaseImageController = require('./image/BaseImageController');

class SupplierController extends BaseController {
  constructor() {
    super(Supplier, null); // null car pas de WooCommerce
    this.imageController = new BaseImageController('entity_name', { type: 'single' });
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
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
