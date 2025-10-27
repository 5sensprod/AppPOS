// src/services/image/WordPressImageSync.js - VERSION CORRIGÉE
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pathManager = require('../../utils/PathManager');

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
   * ✅ CORRIGÉ : Résolution optimisée du chemin avec PathManager
   * Gère les différences entre dev (local) et prod (AppData)
   */
  _resolveImagePath(imagePath) {
    // Vérifier le cache d'abord
    if (this.pathCache.has(imagePath)) {
      return this.pathCache.get(imagePath);
    }

    let actualPath;

    // 1️⃣ Chemin absolu déjà correct (commence par / ou C:)
    if (path.isAbsolute(imagePath)) {
      // Vérifier si c'est un chemin dev qui doit être converti en prod
      if (pathManager.useAppData) {
        // En production, convertir les anciens chemins dev
        const relativePath = this._extractRelativePath(imagePath);
        if (relativePath) {
          actualPath = path.join(pathManager.getPublicPath(), relativePath);
        } else {
          actualPath = imagePath;
        }
      } else {
        actualPath = imagePath;
      }
    }
    // 2️⃣ Chemin relatif commençant par /public/
    else if (imagePath.startsWith('/public/')) {
      const relativePath = imagePath.substring('/public/'.length);
      actualPath = path.join(pathManager.getPublicPath(), relativePath);
    }
    // 3️⃣ Chemin relatif commençant par public/
    else if (imagePath.startsWith('public/')) {
      const relativePath = imagePath.substring('public/'.length);
      actualPath = path.join(pathManager.getPublicPath(), relativePath);
    }
    // 4️⃣ Autres chemins relatifs (products/xxx/image.jpg)
    else {
      actualPath = path.join(pathManager.getPublicPath(), imagePath);
    }

    // Vérification d'existence
    if (!fs.existsSync(actualPath)) {
      // Tentative de résolution alternative
      const alternativePath = this._tryAlternativePaths(imagePath);
      if (alternativePath && fs.existsSync(alternativePath)) {
        actualPath = alternativePath;
      } else {
        throw new Error(`Fichier image non trouvé: ${actualPath} (original: ${imagePath})`);
      }
    }

    // Mettre en cache le résultat
    this.pathCache.set(imagePath, actualPath);
    return actualPath;
  }

  /**
   * ✅ NOUVEAU : Extrait le chemin relatif depuis un chemin absolu
   */
  _extractRelativePath(absolutePath) {
    // Extraire la partie après "public/"
    const publicIndex = absolutePath.indexOf('public' + path.sep);
    if (publicIndex !== -1) {
      return absolutePath.substring(publicIndex + 'public'.length + 1);
    }

    // Extraire la partie après "public/"
    const publicIndex2 = absolutePath.indexOf('public/');
    if (publicIndex2 !== -1) {
      return absolutePath.substring(publicIndex2 + 'public/'.length);
    }

    return null;
  }

  /**
   * ✅ NOUVEAU : Tente de résoudre le chemin avec des méthodes alternatives
   */
  _tryAlternativePaths(originalPath) {
    // Extraire le nom de fichier et l'entité
    const parts = originalPath.split(/[/\\]/);

    // Format attendu : products/ID/filename.jpg ou /public/products/ID/filename.jpg
    let entity, entityId, filename;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'products' || parts[i] === 'categories' || parts[i] === 'brands') {
        entity = parts[i];
        if (i + 2 < parts.length) {
          entityId = parts[i + 1];
          filename = parts[i + 2];
        }
        break;
      }
    }

    if (entity && entityId && filename) {
      const alternativePath = path.join(pathManager.getPublicPath(), entity, entityId, filename);

      console.log(`[WP-SYNC] Tentative chemin alternatif: ${alternativePath}`);
      return alternativePath;
    }

    return null;
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
