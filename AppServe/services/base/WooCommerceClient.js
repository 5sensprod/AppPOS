// services/base/WooCommerceClient.js
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const axios = require('axios');

class WooCommerceClient {
  constructor(config) {
    this.api = new WooCommerceRestApi({
      url: process.env.WC_URL,
      consumerKey: process.env.WC_CONSUMER_KEY,
      consumerSecret: process.env.WC_CONSUMER_SECRET,
      version: 'wc/v3',
    });
  }

  async get(endpoint, params = {}) {
    return this.api.get(endpoint, params);
  }

  async post(endpoint, data) {
    return this.api.post(endpoint, data);
  }

  async put(endpoint, data) {
    return this.api.put(endpoint, data);
  }

  async delete(endpoint, params = {}) {
    return this.api.delete(endpoint, params);
  }

  async deleteMedia(mediaId) {
    try {
      const credentials = Buffer.from(
        `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
      ).toString('base64');

      await axios.delete(`${process.env.WC_URL}/wp-json/wp/v2/media/${mediaId}`, {
        params: { force: true },
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`Erreur lors de la suppression du média ${mediaId}: ${error.message}`);
      }
    }
  }

  async testConnection(endpoint) {
    try {
      await this.api.get(endpoint);
      return { status: 'success' };
    } catch (error) {
      throw new Error(`WC connection failed: ${error.message}`);
    }
  }
}

module.exports = WooCommerceClient;
