// src/services/image/WordPressImageSync.js
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

class WordPressImageSync {
  constructor() {
    this.wpUrl = process.env.WC_URL;
    this.credentials = Buffer.from(
      `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');
  }

  async uploadToWordPress(imagePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    try {
      const response = await axios.post(`${this.wpUrl}/wp-json/wp/v2/media`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Basic ${this.credentials}`,
        },
      });

      return {
        id: response.data.id,
        url: response.data.source_url,
      };
    } catch (error) {
      throw new Error(`Erreur upload WordPress: ${error.message}`);
    }
  }

  async updateMetadata(wpId, metadata) {
    try {
      const response = await axios.post(`${this.wpUrl}/wp-json/wp/v2/media/${wpId}`, metadata, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erreur mise à jour WordPress: ${error.message}`);
    }
  }

  async deleteFromWordPress(wpId) {
    try {
      await axios.delete(`${this.wpUrl}/wp-json/wp/v2/media/${wpId}?force=true`, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
        },
      });
      return true;
    } catch (error) {
      // Si l'image n'existe pas (404), considérer comme un succès
      if (error.response && error.response.status === 404) {
        return true;
      }
      throw new Error(`Erreur suppression WordPress: ${error.message}`);
    }
  }
}

module.exports = WordPressImageSync;
