const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Category = require('../models/Category');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      entity: 'products',
      type: 'gallery',
    });
  }

  async validateCategories(categoryIds) {
    if (!categoryIds || (Array.isArray(categoryIds) && categoryIds.length === 0)) return true;

    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    }

    const categories = await Category.findAll();
    const validCategories = categories.filter((cat) => categoryIds.includes(cat._id));

    if (validCategories.length === 0 || validCategories.length !== categoryIds.length) {
      throw new Error("Certaines catégories spécifiées n'existent pas");
    }

    if (this.shouldSync()) {
      const nonSyncedCategories = validCategories
        .filter((cat) => !cat.woo_id)
        .map((cat) => cat._id);
      if (nonSyncedCategories.length > 0) {
        throw new Error(
          `Catégories non synchronisées avec WooCommerce: ${nonSyncedCategories.join(', ')}`
        );
      }
    }

    return validCategories;
  }

  async create(req, res) {
    try {
      const categories =
        req.body.categories || (req.body.category_id ? [req.body.category_id] : []);

      if (categories.length > 0) {
        await this.validateCategories(categories);
      }

      req.body.categories = categories;
      return super.create(req, res);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      if ('category_id' in req.body || 'categories' in req.body) {
        const categories =
          req.body.categories || (req.body.category_id ? [req.body.category_id] : []);

        if (categories.length > 0) {
          await this.validateCategories(categories);
        }

        req.body.categories = categories;
        req.body.category_id = categories.length > 0 ? categories[0] : null;
      }

      return super.update(req, res);
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
};
