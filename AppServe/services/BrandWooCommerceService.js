// services/BrandWooCommerceService.js
const WooCommerceClient = require('./base/WooCommerceClient');
const BrandSyncStrategy = require('./sync/BrandSync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Brand = require('../models/Brand');
const { getEntityEventService } = require('./events/entityEvents');

class BrandWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new BrandSyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products/brands';
    this.eventService = getEntityEventService('brands');
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      if (!input) {
        return await this.strategy.handleFullSync(this.client, results);
      }

      const brands = Array.isArray(input) ? input : [input];

      return await this.strategy.syncEntityList(
        input,
        Brand,
        this.client,
        this.eventService,
        results,
        'brand'
      );

      return {
        success: true,
        data: Array.isArray(input)
          ? await Promise.all(brands.map((b) => Brand.findById(b._id)))
          : [await Brand.findById(input._id)],
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

      // Émettre un événement après suppression réussie
      this.eventService.deleted(brandId);

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
