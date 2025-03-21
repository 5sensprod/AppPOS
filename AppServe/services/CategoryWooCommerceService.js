// services/CategoryWooCommerceService.js
const WooCommerceClient = require('./base/WooCommerceClient');
const CategorySyncStrategy = require('./sync/CategorySync');
const SyncErrorHandler = require('./base/SyncErrorHandler');
const Category = require('../models/Category');
const apiEventEmitter = require('../services/apiEventEmitter');

class CategoryWooCommerceService {
  constructor() {
    this.client = new WooCommerceClient();
    this.strategy = new CategorySyncStrategy();
    this.errorHandler = new SyncErrorHandler();
    this.endpoint = 'products/categories';
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

      for (const category of sortedCategories) {
        try {
          const result = await this.strategy.syncToWooCommerce(category, this.client, results);
          if (!result.success) {
            if (result.error.message.includes('catégorie parente')) {
              results.pending.push(category._id);
            } else {
              this.errorHandler.handleSyncError(result.error, results, category._id);
            }
          } else if (result.category) {
            // ⚠️ AJOUTER CE BLOC : Émettre un événement après la synchronisation
            console.log(
              `[EVENT] Émission d'événement après synchronisation de la catégorie ${category._id}`
            );
            apiEventEmitter.entityUpdated('categories', category._id, result.category);
          }
        } catch (error) {
          this.errorHandler.handleSyncError(error, results, category._id);
        }
      }

      // Si c'est une seule catégorie et qu'elle a été synchronisée avec succès,
      // émettre un événement de mise à jour de l'arborescence
      if (!Array.isArray(input) && results.errors.length === 0) {
        apiEventEmitter.categoryTreeChanged();
      }

      return {
        success: true,
        data: Array.isArray(input)
          ? await Promise.all(categories.map((c) => Category.findById(c._id)))
          : [await Category.findById(input._id)],
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
