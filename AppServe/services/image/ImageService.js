// src/services/image/ImageService.js
const path = require('path');
const fs = require('fs').promises;
const GalleryImage = require('../../models/images/GalleryImage');
const SingleImage = require('../../models/images/SingleImage');
const WordPressImageSync = require('./WordPressImageSync');
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor(entity, type = 'single') {
    this.entity = entity;
    this.imageHandler = type === 'gallery' ? new GalleryImage(entity) : new SingleImage(entity);
    this.wpSync = new WordPressImageSync();
  }

  async processUpload(files, entityId, options = {}) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);
      if (!item) throw new Error(`${this.entity} non trouvé`);

      const uploadedImages = [];
      const filesToProcess = Array.isArray(files) ? files : [files];

      for (const file of filesToProcess) {
        const imageData = await this.imageHandler.upload(file, entityId);
        // Ajouter _id unique
        imageData._id = uuidv4();

        if (this.entity !== 'suppliers' && options.syncToWordPress) {
          const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
          uploadedImages.push({
            src: imageData.src, // Chemin local pour l'URL frontend
            local_path: imageData.local_path,
            status: 'active',
            type: imageData.type,
            metadata: imageData.metadata,
            wp_id: wpData.id,
            url: wpData.url, // URL WordPress
          });
        } else {
          // Sans synchronisation
          uploadedImages.push(imageData);
        }
      }

      if (uploadedImages.length > 0) {
        const updateData = {};

        // Définir l'image principale si nécessaire
        if (!item.image && uploadedImages.length > 0) {
          updateData.image = { ...uploadedImages[0], status: 'active' };
        }

        // Construire une nouvelle gallery sans duplication
        const allImages = [...(item.gallery_images || []), ...uploadedImages];
        const uniqueImages = [];
        const pathsAdded = new Set();

        for (const img of allImages) {
          if (!pathsAdded.has(img.local_path)) {
            uniqueImages.push({ ...img, status: 'active' });
            pathsAdded.add(img.local_path);
          }
        }

        updateData.gallery_images = uniqueImages;

        await Model.update(entityId, updateData);

        // Synchronisation avec WooCommerce
        if (this.entity === 'products' && process.env.SYNC_ON_CHANGE === 'true') {
          const service = require('../ProductWooCommerceService');
          const updatedDoc = await Model.findById(entityId);
          await service.syncToWooCommerce(updatedDoc);
        }
      }

      return { message: 'Aucune image téléversée', data: [] };
    } catch (error) {
      if (files) {
        const toClean = Array.isArray(files) ? files : [files];
        for (const file of toClean) {
          if (file.path) await this._cleanup(file.path).catch(console.error);
        }
      }
      throw error;
    }
  }

  async _handleExistingImage(existingImage, entityId) {
    // Supprimer l'image de WordPress si elle existe
    if (existingImage.wp_id && this.entity !== 'suppliers') {
      try {
        await this.wpSync.deleteFromWordPress(existingImage.wp_id);
      } catch (error) {
        // Ignorer l'erreur 404, logger les autres
        if (!error.message.includes('404')) {
          console.error('Erreur suppression WordPress:', error);
        }
      }
    }

    // Supprimer le fichier local s'il existe
    if (existingImage.local_path) {
      try {
        await fs.access(existingImage.local_path);
        await fs.unlink(existingImage.local_path);
      } catch (error) {
        // Ignorer l'erreur si le fichier n'existe pas
        if (error.code !== 'ENOENT') {
          console.error('Erreur suppression fichier local:', error);
        }
      }
    }

    // Nettoyer le dossier si nécessaire
    try {
      const imageDir = path.join(process.cwd(), 'public', this.entity, entityId);
      const exists = await fs
        .access(imageDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const files = await fs.readdir(imageDir);
        if (files.length === 0) {
          await fs.rmdir(imageDir);
        }
      }
    } catch (error) {
      console.warn('Avertissement nettoyage dossier:', error.message);
    }
  }

  async _updateEntityWithNewImage(item, updatedImageData, Model) {
    const updateData = this.imageHandler.isGallery
      ? { gallery_images: [...(item.gallery_images || []), updatedImageData] }
      : { image: updatedImageData };

    try {
      // Mettre à jour l'entité locale
      await Model.update(item._id, updateData);

      // Synchroniser avec WooCommerce si nécessaire
      if (this.entity !== 'suppliers' && process.env.SYNC_ON_CHANGE === 'true') {
        const service = this._getWooCommerceService();
        if (service) {
          const updatedDoc = await Model.findById(item._id);
          await service.syncToWooCommerce(updatedDoc);
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour entité:', error);
      throw error;
    }
  }

  _getModelByEntity() {
    return this.entity === 'products'
      ? require('../../models/Product')
      : this.entity === 'categories'
        ? require('../../models/Category')
        : this.entity === 'brands'
          ? require('../../models/Brand')
          : require('../../models/Supplier');
  }

  _getWooCommerceService() {
    try {
      return this.entity === 'products'
        ? require('../ProductWooCommerceService')
        : this.entity === 'categories'
          ? require('../CategoryWooCommerceService')
          : this.entity === 'brands'
            ? require('../BrandWooCommerceService')
            : null;
    } catch (error) {
      console.error('Service WooCommerce non trouvé:', error);
      return null;
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

  async deleteGalleryImage(entityId, imageId) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) throw new Error(`Entité non trouvée`);

      const imageToDelete = item.gallery_images?.find((img) => img._id === imageId);

      if (!imageToDelete) throw new Error(`Image non trouvée`);

      // Suppression WordPress et fichier local
      if (imageToDelete.wp_id) await this.wpSync.deleteFromWordPress(imageToDelete.wp_id);
      if (imageToDelete.local_path) await this._handleExistingImage(imageToDelete, entityId);

      // Mise à jour données
      const updateData = {
        gallery_images: item.gallery_images.filter((img) => img._id !== imageId),
      };

      // Si c'est aussi l'image principale, la supprimer
      if (
        item.image &&
        (item.image._id === imageId || item.image.local_path === imageToDelete.local_path)
      ) {
        // Si d'autres images existent dans la galerie, utiliser la première comme principale
        if (updateData.gallery_images.length > 0) {
          updateData.image = { ...updateData.gallery_images[0] };
        } else {
          updateData.image = null;
        }
      }

      await Model.update(entityId, updateData);

      // Synchronisation WooCommerce
      if (this.entity === 'products' && process.env.SYNC_ON_CHANGE === 'true') {
        const service = this._getWooCommerceService();
        await service.syncToWooCommerce(await Model.findById(entityId));
      }

      return true;
    } catch (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
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
      console.error('Erreur nettoyage fichier temporaire:', error);
    }
  }
}

module.exports = ImageService;
