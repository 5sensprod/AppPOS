// services/CategoryWooCommerceService.js
const WooCommerceClient = require('./base/WooCommerceClient');
const CategorySyncStrategy = require('./sync/CategorySync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Category = require('../models/Category');
const { getEntityEventService } = require('./events/entityEvents');

class CategoryWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new CategorySyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products/categories';
    this.eventService = getEntityEventService('categories');
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [], pending: [] };

    try {
      if (!input) {
        return await this.strategy.handleFullSync(this.client, results);
      }

      const categories = Array.isArray(input) ? input : [input];

      // Trier les catégories par niveau pour synchroniser les parents d'abord
      const sortedCategories = this.strategy._sortCategoriesByLevel(categories);

      return await this.strategy.syncEntityList(
        sortedCategories,
        Category,
        this.client,
        this.eventService,
        results,
        'category'
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

  async deleteCategory(categoryId) {
    try {
      // Validation avant suppression
      await this.strategy.validateDeletion(categoryId);

      const category = await Category.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      if (category.woo_id) {
        try {
          if (category.image?.wp_id) {
            await this.client.deleteMedia(category.image.wp_id);
          }
          await this.client.delete(`${this.endpoint}/${category.woo_id}`, { force: true });
        } catch (error) {
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      }

      await Category.delete(categoryId);
      return { success: true };
    } catch (error) {
      this.errorHandler.handleError(error, 'category', categoryId);
      throw error;
    }
  }

  async testConnection() {
    return this.client.testConnection(this.endpoint);
  }
}

module.exports = new CategoryWooCommerceService();
