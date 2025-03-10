// controllers/wooSyncController.js
const ResponseHandler = require('../handlers/ResponseHandler');
const ProductWooCommerceService = require('../services/ProductWooCommerceService');
const { syncUpdatedProducts } = require('../services/sync/syncUpdatedProducts');

class WooSyncController {
  /**
   * Synchronise un produit spécifique avec WooCommerce
   */
  async syncProduct(req, res) {
    try {
      const productId = req.params.id;
      if (!productId) {
        return ResponseHandler.badRequest(res, 'ID du produit requis');
      }

      // Utiliser le service de synchronisation
      const result = await ProductWooCommerceService.syncToWooCommerce({ _id: productId });

      if (result.success) {
        // Réinitialiser pending_sync après synchronisation réussie
        const Product = require('../models/Product');
        await Product.update(productId, {
          pending_sync: false,
          last_sync: new Date(),
        });

        return ResponseHandler.success(res, {
          message: 'Produit synchronisé avec succès',
          data: result.data,
        });
      } else {
        return ResponseHandler.partialSuccess(res, {
          message: 'Erreur lors de la synchronisation',
          errors: result.errors,
        });
      }
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getPendingSync(req, res) {
    try {
      const Product = require('../models/Product');

      // Utiliser findAll() au lieu de find()
      const allProducts = await Product.findAll();

      // Filtrer les produits avec pending_sync=true
      const pendingProducts = allProducts.filter((product) => product.pending_sync === true);

      return ResponseHandler.success(res, {
        count: pendingProducts.length,
        data: pendingProducts,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
  /**
   * Synchronise tous les produits modifiés avec WooCommerce
   */
  async syncAllUpdatedProducts(req, res) {
    try {
      const Product = require('../models/Product');

      // Récupérer tous les produits avec pending_sync=true
      const pendingProducts = await Product.find({ pending_sync: true });

      if (pendingProducts.length === 0) {
        return ResponseHandler.success(res, {
          message: 'Aucun produit en attente de synchronisation',
          products_synced: 0,
          errors: [],
        });
      }

      // Lancer la synchronisation pour chaque produit
      const results = {
        synced: 0,
        errors: [],
      };

      for (const product of pendingProducts) {
        try {
          const syncResult = await ProductWooCommerceService.syncToWooCommerce(product);

          if (syncResult.success) {
            // Réinitialiser pending_sync après synchronisation réussie
            await Product.update(product._id, {
              pending_sync: false,
              last_sync: new Date(),
            });
            results.synced++;
          } else {
            results.errors.push({
              product_id: product._id,
              name: product.name,
              error: syncResult.error?.message || 'Erreur inconnue',
            });
          }
        } catch (error) {
          results.errors.push({
            product_id: product._id,
            name: product.name,
            error: error.message,
          });
        }
      }

      return ResponseHandler.success(res, {
        message: 'Synchronisation terminée',
        products_synced: results.synced,
        errors: results.errors,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Force la synchronisation de tous les produits avec WooCommerce
   */
  async forceSync(req, res) {
    try {
      // Lancer la synchronisation complète
      const result = await syncUpdatedProducts(true);

      return ResponseHandler.success(res, {
        message: 'Synchronisation forcée lancée',
        products_synced: result.synced,
        errors: result.errors,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const wooSyncController = new WooSyncController();

module.exports = {
  syncProduct: wooSyncController.syncProduct.bind(wooSyncController),
  syncAllUpdatedProducts: wooSyncController.syncAllUpdatedProducts.bind(wooSyncController),
  forceSync: wooSyncController.forceSync.bind(wooSyncController),
  getPendingSync: wooSyncController.getPendingSync.bind(wooSyncController),
};
