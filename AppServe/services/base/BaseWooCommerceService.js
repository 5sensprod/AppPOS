// services/base/BaseWooCommerceService.js
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const axios = require('axios');
const path = require('path');

class BaseWooCommerceService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.wcApi = new WooCommerceRestApi({
      url: process.env.WC_URL,
      consumerKey: process.env.WC_CONSUMER_KEY,
      consumerSecret: process.env.WC_CONSUMER_SECRET,
      version: 'wc/v3',
    });
  }

  async syncFromWooCommerce(Model, entityType) {
    try {
      const wcEntities = await this.wcApi.get(this.endpoint, { per_page: 100 });
      const existingEntities = await Model.findAll();
      const results = { created: 0, updated: 0, errors: [] };

      for (const wcEntity of wcEntities.data) {
        try {
          await this._handleEntitySync(wcEntity, existingEntities, Model, entityType, results);
        } catch (error) {
          results.errors.push({
            entity_id: wcEntity.id,
            error: error.message,
          });
        }
      }
      return results;
    } catch (error) {
      throw new Error(`Sync from WC failed: ${error.message}`);
    }
  }

  async deleteMedia(mediaId) {
    try {
      const credentials = Buffer.from(
        `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
      ).toString('base64');

      await axios.delete(`${process.env.WC_URL}/wp-json/wp/v2/media/${mediaId}`, {
        params: {
          force: true,
        },
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Si l'erreur n'est pas une 404 (média déjà supprimé), on la propage
      if (error.response?.status !== 404) {
        throw new Error(`Erreur lors de la suppression du média ${mediaId}: ${error.message}`);
      }
    }
  }
  _mapWooCommerceToLocal(wcEntity) {
    throw new Error('_mapWooCommerceToLocal must be implemented');
  }

  _mapLocalToWooCommerce(localEntity) {
    throw new Error('_mapLocalToWooCommerce must be implemented');
  }

  async testConnection() {
    try {
      await this.wcApi.get(this.endpoint);
      return { status: 'success' };
    } catch (error) {
      throw new Error(`WC connection failed: ${error.message}`);
    }
  }
}

module.exports = BaseWooCommerceService;
