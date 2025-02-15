const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const BaseImageController = require('./image/BaseImageController');
const productWooCommerceService = require('../services/ProductWooCommerceService');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService);
    this.imageController = new BaseImageController('products', { type: 'gallery' });
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
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
