const WooCommerceClient = require('./base/WooCommerceClient');
const ProductSyncStrategy = require('./sync/ProductSync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Product = require('../models/Product');
const { getEntityEventService } = require('./events/entityEvents');

class ProductWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new ProductSyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products';
    this.eventService = getEntityEventService('products');
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      if (!input) {
        return await this.strategy.handleFullSync(this.client, results);
      }

      const products = Array.isArray(input) ? input : [input];

      return await this.strategy.syncEntityList(
        products,
        Product,
        this.client,
        this.eventService,
        results,
        'product'
      );
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        ...results,
      };
    }
  }

  async deleteProduct(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      if (product.woo_id) {
        try {
          // Supprimer l’image principale
          if (product.image?.wp_id) await this.client.deleteMedia(product.image.wp_id);

          // Supprimer la galerie
          if (product.gallery_images?.length) {
            for (const img of product.gallery_images) {
              if (img.wp_id) await this.client.deleteMedia(img.wp_id);
            }
          }

          await this.client.delete(`${this.endpoint}/${product.woo_id}`, { force: true });
        } catch (error) {
          if (error.response?.status !== 404) throw error;
        }
      }

      await Product.delete(productId);
      return { success: true };
    } catch (error) {
      this.errorHandler.handleError(error, 'product', productId);
      throw error;
    }
  }

  async getProductUrl(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Produit non trouvé');

      const isRecent =
        product.last_sync && Date.now() - new Date(product.last_sync).getTime() < 86400000;

      if (product.website_url && isRecent) {
        return { success: true, url: product.website_url };
      }

      if (product.woo_id) {
        const res = await this.client.get(`${this.endpoint}/${product.woo_id}`);
        if (res.data?.permalink) {
          await Product.update(productId, {
            website_url: res.data.permalink,
            last_sync: new Date(),
          });
          return { success: true, url: res.data.permalink };
        }
      }

      return {
        success: false,
        error: 'URL du produit non disponible',
        message: 'Produit non synchronisé ou lien indisponible.',
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'product', productId);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    return this.client.testConnection(this.endpoint);
  }
}

module.exports = new ProductWooCommerceService();
