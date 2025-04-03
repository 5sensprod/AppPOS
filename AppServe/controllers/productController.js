const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const { createProduct, updateProduct, deleteProduct } = require('../services/productService');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
    this.eventService = getEntityEventService(this.entityName);
  }

  async getAll(req, res) {
    try {
      const products = await this.model.findAll();
      const withCategoryInfo = await Promise.all(
        products.map((product) => this.model.findByIdWithCategoryInfo(product._id))
      );
      return ResponseHandler.success(res, withCategoryInfo);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const product = await this.model.findByIdWithCategoryInfo(req.params.id);
      if (!product) return ResponseHandler.notFound(res);
      return ResponseHandler.success(res, product);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    try {
      const product = await createProduct(req.body);
      const syncResult = await this.syncIfNeeded([product], res);
      if (syncResult) return syncResult;
      return ResponseHandler.created(res, product);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      const updated = await updateProduct(req.params.id, req.body);
      const syncResult = await this.syncIfNeeded([updated], res);
      if (syncResult) return syncResult;

      return ResponseHandler.success(res, updated);
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      await this.handleImageDeletion(existing);
      await this.handleWooCommerceDelete(existing);
      const result = await deleteProduct(existing);

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async recalculateAllCounts(req, res) {
    try {
      await Brand.recalculateAllProductCounts();
      await Supplier.recalculateAllProductCounts();

      return ResponseHandler.success(res, {
        message: 'Tous les compteurs de produits ont été recalculés',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const productController = new ProductController();

const exportController = require('../utils/exportController');

module.exports = exportController(productController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'uploadImage',
  'updateImageMetadata',
  'deleteImage',
  'setMainImage',
  'recalculateAllCounts',
]);
