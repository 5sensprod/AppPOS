// src/services/image/ImageService.js
const path = require('path');
const fs = require('fs').promises;
const SingleImage = require('../../models/images/SingleImage');
const WordPressImageSync = require('./WordPressImageSync');
const woocommerceService = require('../woocommerceService');

class ImageService {
  constructor(entity) {
    this.entity = entity; // Ajout pour identifier le type d'entité
    this.imageHandler = new SingleImage(entity);
    this.wpSync = new WordPressImageSync();
  }

  async processUpload(file, entityId, options = {}) {
    try {
      const imageData = await this.imageHandler.upload(file, entityId);

      // Skip WordPress sync for suppliers
      if (this.entity !== 'suppliers' && options.syncToWordPress) {
        const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
        const updatedImageData = {
          ...imageData,
          wp_id: wpData.id,
          url: wpData.url,
          status: 'active',
        };

        if (this.entity === 'categories') {
          const Category = require('../../models/Category');
          const category = await Category.findById(entityId);
          if (category) {
            await Category.update(entityId, {
              ...category,
              image: updatedImageData,
            });
            await woocommerceService.syncToWooCommerce([
              {
                ...category,
                image: updatedImageData,
              },
            ]);
          }
        }
        return updatedImageData;
      }
      return imageData;
    } catch (error) {
      await this._cleanup(file.path).catch(() => {});
      throw error;
    }
  }

  async updateMetadata(entityId, imageData, metadata) {
    const updatedImage = await this.imageHandler.update(entityId, metadata);

    if (updatedImage.wp_id && metadata.status) {
      try {
        await this.wpSync.updateMetadata(updatedImage.wp_id, metadata);
      } catch (error) {
        console.error('Erreur mise à jour WordPress:', error);
        updatedImage.sync_error = error.message;
      }
    }

    return updatedImage;
  }

  async deleteImage(entityId, imageData) {
    // Suppression WordPress si nécessaire
    if (imageData.wp_id) {
      try {
        await this.wpSync.deleteFromWordPress(imageData.wp_id);
      } catch (error) {
        console.error('Erreur suppression WordPress:', error);
        // On continue la suppression locale même si erreur WordPress
      }
    }

    // Suppression locale
    await this.imageHandler.delete(entityId);
    return true;
  }

  async resyncImage(imageData) {
    if (!imageData.local_path) {
      throw new Error('Chemin local requis pour la resynchronisation');
    }

    try {
      const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
      return {
        ...imageData,
        wp_id: wpData.id,
        status: 'active',
        sync_error: null,
      };
    } catch (error) {
      throw new Error(`Erreur de resynchronisation: ${error.message}`);
    }
  }

  // Méthode "privée" par convention (préfixée par _)
  async _cleanup(filePath) {
    if (!filePath) return;

    try {
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Erreur nettoyage fichier:', error);
    }
  }
}

module.exports = ImageService;
