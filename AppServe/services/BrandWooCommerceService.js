// services/BrandWooCommerceService.js
const WooCommerceClient = require('./base/WooCommerceClient');
const BrandSyncStrategy = require('./sync/BrandSync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Brand = require('../models/Brand');

class BrandWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new BrandSyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products/brands';
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      if (!input) {
        return await this.strategy.handleFullSync(this.client, results);
      }

      const brands = Array.isArray(input) ? input : [input];
      for (const brand of brands) {
        const wcData = await this.strategy._mapLocalToWooCommerce(brand);

        // Ajout explicite des données d'image
        if (brand.image?.wp_id) {
          wcData.image = {
            id: parseInt(brand.image.wp_id),
            src: brand.image.url,
            alt: brand.name,
          };
        }

        if (brand.woo_id) {
          const response = await this.client.put(`${this.endpoint}/${brand.woo_id}`, wcData);
          await Brand.update(brand._id, {
            last_sync: new Date(),
            image: brand.image,
            woo_id: brand.woo_id,
          });
          results.updated++;
        } else {
          // Pour une nouvelle marque, d'abord créer la marque
          const response = await this.client.post(this.endpoint, wcData);
          await Brand.update(brand._id, {
            woo_id: response.data.id,
            last_sync: new Date(),
            image: brand.image,
          });
          results.created++;
        }
      }

      // Retourner les données mises à jour
      const updatedBrands = await Promise.all(brands.map((brand) => Brand.findById(brand._id)));

      return {
        success: true,
        data: Array.isArray(input) ? updatedBrands : updatedBrands[0],
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

  async deleteBrand(brandId) {
    try {
      const brand = await Brand.findById(brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      if (brand.woo_id) {
        try {
          if (brand.image?.wp_id) {
            await this.client.deleteMedia(brand.image.wp_id);
          }
          await this.client.delete(`${this.endpoint}/${brand.woo_id}`, { force: true });
        } catch (error) {
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      }

      await Brand.delete(brandId);
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async testConnection() {
    return this.client.testConnection(this.strategy.endpoint);
  }
}

module.exports = new BrandWooCommerceService();
