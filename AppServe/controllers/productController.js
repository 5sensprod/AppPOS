// controllers/productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const productWooCommerceService = require('../services/ProductWooCommerceService');

class ProductController extends BaseController {
  constructor() {
    const imageOptions = {
      entity: 'products',
      type: 'gallery',
    };
    super(Product, productWooCommerceService, imageOptions);
  }
}

const productController = new ProductController();
module.exports = {
  getAll: productController.getAll.bind(productController),
  getById: productController.getById.bind(productController),
  create: productController.create.bind(productController),
  update: productController.update.bind(productController),
  delete: productController.delete.bind(productController),
  uploadImage: productController.uploadImage,
  updateImageMetadata: productController.updateImageMetadata,
  deleteImage: productController.deleteImage,
};
