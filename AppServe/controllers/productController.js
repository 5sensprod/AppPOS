// controllers/ProductController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const productService = require('../services/ProductService');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      entity: 'products',
      type: 'gallery',
    });
  }

  _getService() {
    return productService;
  }

  async create(req, res) {
    try {
      const newProduct = await productService.create(req.body);
      return ResponseHandler.created(res, newProduct);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const updatedProduct = await productService.update(req.params.id, req.body);
      return ResponseHandler.success(res, updatedProduct);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
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
  setMainImage: productController.setMainImage,
};
