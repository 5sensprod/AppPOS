// services/GeminiDescriptionService.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class GeminiDescriptionService {
  constructor() {
    this.apiBaseUrl = process.env.WC_URL;
    this.username = process.env.WP_USER;
    this.password = process.env.WP_APP_PASSWORD;
  }

  async generateProductDescription(productData, imagePath) {
    try {
      const formData = new FormData();

      // Ajouter les données du produit
      formData.append('product_name', productData.name);
      if (productData.category) formData.append('category', productData.category);
      if (productData.brand) formData.append('brand', productData.brand);
      if (productData.price) formData.append('price', productData.price);

      // Ajouter les spécifications si disponibles
      if (productData.specifications) {
        formData.append('specifications', JSON.stringify(productData.specifications));
      }

      // Ajouter l'image si disponible
      if (imagePath && fs.existsSync(imagePath)) {
        formData.append('image', fs.createReadStream(imagePath));
      }

      // Configuration de l'authentification Basic
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      // Appel à l'API
      const response = await axios.post(
        `${this.apiBaseUrl}/wp-json/appstock/v1/product-description`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Erreur lors de la génération de la description:',
        error.response?.data || error.message
      );
      throw new Error(`Échec de la génération de description: ${error.message}`);
    }
  }
}

module.exports = GeminiDescriptionService;
