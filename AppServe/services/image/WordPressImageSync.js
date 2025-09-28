// src/services/image/WordPressImageSync.js - VERSION OPTIMISÉE
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class WordPressImageSync {
  constructor() {
    this.wpUrl = process.env.WC_URL;
    this.credentials = Buffer.from(
      `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    // Cache pour éviter les vérifications répétées de fichiers
    this.pathCache = new Map();
  }

  async uploadToWordPress(imagePath) {
    try {
      const actualPath = this._resolveImagePath(imagePath);

      // Log uniquement en mode debug
      if (process.env.DEBUG_WP_SYNC) {
        console.log(`[WP-SYNC] Upload: ${actualPath}`);
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(actualPath));

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
      // Log d'erreur uniquement si nécessaire
      if (process.env.DEBUG_WP_SYNC) {
        console.error(`[WP-SYNC] Erreur:`, error.message);
      }
      throw new Error(`Erreur upload WordPress: ${error.message}`);
    }
  }

  /**
   * Résolution optimisée du chemin avec cache
   */
  _resolveImagePath(imagePath) {
    // Vérifier le cache d'abord
    if (this.pathCache.has(imagePath)) {
      return this.pathCache.get(imagePath);
    }

    let actualPath;

    // Conversion rapide pour chemins relatifs /public/
    if (imagePath.startsWith('/public/')) {
      actualPath = path.join(process.cwd(), imagePath.substring(1));
    } else {
      actualPath = imagePath;
    }

    // Vérification d'existence (coûteuse)
    if (!fs.existsSync(actualPath)) {
      throw new Error(`Fichier image non trouvé: ${actualPath}`);
    }

    // Mettre en cache le résultat
    this.pathCache.set(imagePath, actualPath);
    return actualPath;
  }

  /**
   * Version optimisée pour objets image avec dédoublonnage
   */
  async uploadImageObject(imageData, uploadedCache = new Map()) {
    // Identifier l'image de manière unique
    const imageKey = imageData.src || imageData.local_path || imageData._id;

    // Vérifier si déjà uploadée dans cette session
    if (uploadedCache.has(imageKey)) {
      return uploadedCache.get(imageKey);
    }

    // Priorité au src stable
    const pathToUpload = imageData.src || imageData.local_path;
    if (!pathToUpload) {
      throw new Error("Aucun chemin valide pour l'image");
    }

    const result = await this.uploadToWordPress(pathToUpload);

    // Mettre en cache pour éviter les doublons
    uploadedCache.set(imageKey, result);
    return result;
  }

  /**
   * Upload en lot avec gestion des doublons
   */
  async uploadBatch(images) {
    const uploadedCache = new Map();
    const results = [];

    for (const img of images) {
      try {
        const result = await this.uploadImageObject(img, uploadedCache);
        results.push({ success: true, data: result, image: img });
      } catch (error) {
        results.push({ success: false, error: error.message, image: img });
      }
    }

    return results;
  }

  // Méthodes inchangées mais avec logs conditionnels
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
      if (error.response && error.response.status === 404) {
        return true;
      }
      throw new Error(`Erreur suppression WordPress: ${error.message}`);
    }
  }

  /**
   * Nettoyer le cache si nécessaire
   */
  clearCache() {
    this.pathCache.clear();
  }
}

module.exports = WordPressImageSync;
