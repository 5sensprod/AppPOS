// ===== controllers/product/productController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const { getEntityEventService } = require('../../services/events/entityEvents');
const { createProduct, updateProduct, deleteProduct } = require('../../services/productService');
const exportController = require('../../utils/exportController');

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

  async filter(req, res) {
    try {
      const query = {};

      // 🔍 Filtre pour produits avec au moins une image
      if (req.query.has_image === 'true') {
        query.$or = [
          { 'image.src': { $exists: true, $ne: '', $ne: null } },
          { 'gallery_images.0.src': { $exists: true, $ne: '', $ne: null } },
        ];
      }

      // ➕ Tu peux ajouter d'autres filtres ici (brand_id, price, etc.)

      const products = await this.model.find(query);
      return ResponseHandler.success(res, products);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const productController = new ProductController();

module.exports = exportController(productController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'filter',
]);
