// src/services/image/ImageService.js
const path = require('path');
const fs = require('fs').promises;
const GalleryImage = require('../../models/images/GalleryImage');
const SingleImage = require('../../models/images/SingleImage');
const WordPressImageSync = require('./WordPressImageSync');

class ImageService {
  constructor(entity, type = 'single') {
    this.entity = entity;
    this.imageHandler = type === 'gallery' ? new GalleryImage(entity) : new SingleImage(entity);
    this.wpSync = new WordPressImageSync();
  }

  async processUpload(file, entityId, options = {}) {
    try {
      const imageData = await this.imageHandler.upload(file, entityId);

      if (this.entity !== 'suppliers' && options.syncToWordPress) {
        const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
        const updatedImageData = {
          ...imageData,
          wp_id: wpData.id,
          url: wpData.url,
          status: 'active',
        };

        const Model = require('../../models/Brand');
        const service = require('../BrandWooCommerceService');

        const item = await Model.findById(entityId);
        if (!item) throw new Error(`${this.entity} non trouvé`);

        // Recherche du tag_id du brand
        const brandsResponse = await service.wcApi.get('products/brands');
        const brandTag = brandsResponse.data.find((b) => b.name === item.name);

        if (brandTag) {
          // Mise à jour de l'image avec le tag_id trouvé
          await service.wcApi.put(`products/brands/${brandTag.id}`, {
            name: item.name,
            image: { id: wpData.id },
          });

          const updateData = { image: updatedImageData, woo_id: brandTag.id };
          await Model.update(entityId, { ...item, ...updateData });
        }

        return updatedImageData;
      }

      return imageData;
    } catch (error) {
      await this._cleanup(file.path).catch(() => {});
      throw error;
    }
  }
  async updateMetadata(entityId, metadata) {
    try {
      // 1. Mise à jour locale
      const updatedImage = await this.imageHandler.update(entityId, metadata);

      // 2. Synchronisation WordPress si applicable
      if (updatedImage.wp_id && metadata.status && this.entity !== 'suppliers') {
        try {
          await this.wpSync.updateMetadata(updatedImage.wp_id, metadata);
        } catch (error) {
          console.error('Erreur mise à jour WordPress:', error);
          updatedImage.sync_error = error.message;
        }
      }

      return updatedImage;
    } catch (error) {
      throw new Error(`Erreur mise à jour métadonnées: ${error.message}`);
    }
  }

  async deleteImage(entityId, imageData) {
    try {
      // 1. Suppression WordPress si applicable
      if (imageData?.wp_id && this.entity !== 'suppliers') {
        try {
          await this.wpSync.deleteFromWordPress(imageData.wp_id);
        } catch (error) {
          console.error('Erreur suppression WordPress:', error);
        }
      }

      // 2. Suppression locale (toujours effectuée)
      await this.imageHandler.delete(entityId);
      return true;
    } catch (error) {
      throw new Error(`Erreur suppression image: ${error.message}`);
    }
  }

  async resyncImage(imageData) {
    if (!imageData.local_path) {
      throw new Error('Chemin local requis pour la resynchronisation');
    }

    if (this.entity === 'suppliers') {
      throw new Error('Resynchronisation non disponible pour les fournisseurs');
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
