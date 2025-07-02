// ===== controllers/product/productBatchController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const Brand = require('../../models/Brand');
const Supplier = require('../../models/Supplier');
const Category = require('../../models/Category');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const { getEntityEventService } = require('../../services/events/entityEvents');
const exportController = require('../../utils/exportController');

class ProductBatchController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
    this.eventService = getEntityEventService(this.entityName);
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
          const product = await this.model.findById(productId);

          if (!product) {
            errors.push({
              productId,
              message: 'Produit non trouvé',
            });
            continue;
          }

          const updatedData = {
            ...product,
            status: status,
            pending_sync: product.woo_id ? true : product.pending_sync,
          };

          await this.model.update(productId, updatedData);

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

      const result = {
        success: updatedProducts.length > 0,
        message: `${updatedProducts.length} produits mis à jour avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`,
        updatedProducts,
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur lors de la mise à jour par lot des statuts:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async batchUpdateCategory(req, res) {
    try {
      const { productIds, categoryId, replace = false } = req.body;

      // Validation
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return ResponseHandler.badRequest(res, 'IDs de produits requis');
      }

      if (!categoryId) {
        return ResponseHandler.badRequest(res, 'ID de catégorie requis');
      }

      // Vérifier si la catégorie existe
      const category = await Category.findById(categoryId);
      if (!category) {
        return ResponseHandler.notFound(res, 'Catégorie non trouvée');
      }

      const updatedProducts = [];
      const errors = [];

      // Traiter chaque produit
      for (const productId of productIds) {
        try {
          const product = await this.model.findById(productId);

          if (!product) {
            errors.push({ productId, message: 'Produit non trouvé' });
            continue;
          }

          // 🎯 LA SEULE DIFFÉRENCE : replace ou add
          let newCategories;
          if (replace) {
            newCategories = [categoryId]; // Remplacer complètement
          } else {
            // Logique existante : ajouter sans doublons
            const currentCategories = product.categories || [];
            newCategories = [categoryId];
            for (const catId of currentCategories) {
              if (catId !== categoryId) {
                newCategories.push(catId);
              }
            }
          }

          const updatedData = {
            ...product,
            categories: newCategories,
            category_id: categoryId,
            pending_sync: product.woo_id ? true : product.pending_sync,
          };

          await this.model.update(productId, updatedData);

          if (this.eventService) {
            this.eventService.emit('updated', {
              id: productId,
              data: updatedData,
              original: product,
            });
          }

          updatedProducts.push(productId);
        } catch (error) {
          console.error(`Erreur produit ${productId}:`, error);
          errors.push({
            productId,
            message: error.message || 'Erreur de mise à jour',
          });
        }
      }

      const result = {
        success: updatedProducts.length > 0,
        message: `${updatedProducts.length} produit(s) mis à jour avec succès${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`,
        updatedProducts,
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur batch update category:', error);
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

const productBatchController = new ProductBatchController();

module.exports = exportController(productBatchController, [
  'batchUpdateStatus',
  'batchUpdateCategory',
  'recalculateAllCounts',
]);
