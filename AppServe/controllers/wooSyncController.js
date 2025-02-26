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

  /**
   * Synchronise tous les produits modifiés avec WooCommerce
   */
  async syncAllUpdatedProducts(req, res) {
    try {
      // Lancer la synchronisation en utilisant le script
      const result = await syncUpdatedProducts(false);

      return ResponseHandler.success(res, {
        message: 'Synchronisation lancée',
        products_synced: result.synced,
        errors: result.errors,
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
};
