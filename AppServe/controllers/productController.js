//AppServe\controllers\productController.js
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

  async batchUpdateStatus(req, res) {
    try {
      const { productIds, status } = req.body;

      // Validation
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return ResponseHandler.badRequest(
          res,
          'IDs de produits requis et doivent être un tableau non vide'
        );
      }

      if (!status || !['published', 'draft', 'archived'].includes(status)) {
        return ResponseHandler.badRequest(
          res,
          'Statut invalide. Les valeurs autorisées sont: published, draft, archived'
        );
      }

      const updatedProducts = [];
      const errors = [];

      // Traiter chaque produit
      for (const productId of productIds) {
        try {
          // Chercher le produit
          const product = await this.model.findById(productId);

          if (!product) {
            errors.push({
              productId,
              message: 'Produit non trouvé',
            });
            continue;
          }

          // Mettre à jour le statut
          const updatedData = {
            ...product,
            status: status,
            // Si le produit est déjà synchronisé avec WooCommerce, marquer comme en attente de synchro
            pending_sync: product.woo_id ? true : product.pending_sync,
          };

          // Utiliser la méthode update existante
          await this.model.update(productId, updatedData);

          // Déclencher un événement de mise à jour si nécessaire
          if (this.eventService) {
            this.eventService.emit('updated', {
              id: productId,
              data: updatedData,
              original: product,
            });
          }

          updatedProducts.push(productId);
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du produit ${productId}:`, error);
          errors.push({
            productId,
            message: error.message || 'Erreur de mise à jour',
          });
        }
      }

      // Préparer la réponse
      const result = {
        success: updatedProducts.length > 0,
        message: `${updatedProducts.length} produits mis à jour avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`,
        updatedProducts,
      };

      // Ajouter les erreurs à la réponse si nécessaire
      if (errors.length > 0) {
        result.errors = errors;
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur lors de la mise à jour par lot des statuts:', error);
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

const exportController = require('../utils/exportController');

module.exports = exportController(productController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'batchUpdateStatus',
  'uploadImage',
  'updateImageMetadata',
  'deleteImage',
  'setMainImage',
  'recalculateAllCounts',
  'filter',
]);
