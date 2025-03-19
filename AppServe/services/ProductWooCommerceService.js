// services/ProductWooCommerceService.js
const WooCommerceClient = require('./base/WooCommerceClient');
const ProductSyncStrategy = require('./sync/ProductSync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Product = require('../models/Product');

class ProductWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new ProductSyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products';
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      if (!input) {
        return await this.strategy.handleFullSync(this.client, results);
      }

      const products = Array.isArray(input) ? input : [input];

      for (const product of products) {
        const result = await this.strategy.syncToWooCommerce(product, this.client, results);
        if (!result.success) {
          this.errorHandler.handleSyncError(result.error, results, product._id);
        }
      }

      return {
        success: true,
        data: Array.isArray(input)
          ? await Promise.all(products.map((p) => Product.findById(p._id)))
          : [await Product.findById(input._id)],
        ...results,
      };
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
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.woo_id) {
        try {
          // Suppression des images
          if (product.image?.wp_id) {
            await this.client.deleteMedia(product.image.wp_id);
          }
          if (product.gallery_images?.length) {
            for (const image of product.gallery_images) {
              if (image.wp_id) {
                await this.client.deleteMedia(image.wp_id);
              }
            }
          }
          // Suppression du produit
          await this.client.delete(`${this.endpoint}/${product.woo_id}`, { force: true });
        } catch (error) {
          if (error.response?.status !== 404) {
            throw error;
          }
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

      if (!product) {
        throw new Error('Produit non trouvé');
      }

      // Si l'URL du produit est déjà enregistrée et récente (sync récent)
      if (product.website_url && product.last_sync) {
        const syncAge = Date.now() - new Date(product.last_sync).getTime();
        // Si la sync date de moins de 24h, utiliser l'URL stockée
        if (syncAge < 24 * 60 * 60 * 1000) {
          return { success: true, url: product.website_url };
        }
      }

      // Si pas d'URL ou sync trop ancienne, récupérer depuis WooCommerce
      if (product.woo_id) {
        const response = await this.client.get(`${this.endpoint}/${product.woo_id}`);

        if (response.data && response.data.permalink) {
          // Mettre à jour l'URL dans la base de données
          await Product.update(productId, {
            website_url: response.data.permalink,
            last_sync: new Date(),
          });

          return { success: true, url: response.data.permalink };
        }
      }

      // Si pas de woo_id ou pas d'URL trouvée
      return {
        success: false,
        error: 'URL du produit non disponible',
        message:
          "Le produit n'a pas encore été synchronisé avec WooCommerce ou l'URL n'est pas disponible",
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'product', productId);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testConnection() {
    return this.client.testConnection(this.endpoint);
  }
}

module.exports = new ProductWooCommerceService();
