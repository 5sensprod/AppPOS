// src/services/image/ImageService.js
const path = require('path');
const fs = require('fs').promises;
const GalleryImage = require('../../models/images/GalleryImage');
const SingleImage = require('../../models/images/SingleImage');
const WordPressImageSync = require('./WordPressImageSync');
const FileManager = require('../../utils/FileManager');
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor(entity, type = 'single') {
    this.entity = entity;
    this.imageHandler = type === 'gallery' ? new GalleryImage(entity) : new SingleImage(entity);
    this.wpSync = new WordPressImageSync();
    this.logPrefix = '[WS-DEBUG]';
  }

  async processUpload(files, entityId, options = {}) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);
      if (!item) throw new Error(`${this.entity} non trouvé`);

      const uploadedImages = [];
      const filesToProcess = Array.isArray(files) ? files : [files];

      // Limiter le nombre de fichiers selon le type
      if (this.imageHandler.isGallery === false && filesToProcess.length > 1) {
        console.log(
          `${this.logPrefix} Type 'single' - Limitation à un seul fichier (${filesToProcess.length} fournis)`
        );
        filesToProcess.length = 1;
      }

      // Pour le type 'single', sauvegarder l'ancienne image
      let oldImage = null;
      if (!this.imageHandler.isGallery && item.image) {
        oldImage = { ...item.image };
        console.log(`${this.logPrefix} Ancienne image trouvée pour ${entityId}:`, oldImage);
      }

      // Traitement des nouvelles images
      for (const file of filesToProcess) {
        const imageData = await this.imageHandler.upload(file, entityId);
        imageData._id = uuidv4();

        // Synchronisation WordPress si nécessaire
        if (this.shouldSyncToWordPress(options)) {
          const wpData = await this.syncImageToWordPress(imageData.local_path);
          uploadedImages.push({
            ...imageData,
            wp_id: wpData.id,
            url: wpData.url,
          });
        } else {
          uploadedImages.push(imageData);
        }
      }

      // Mise à jour de l'entité
      if (uploadedImages.length > 0) {
        await this.updateEntityWithImages(item, uploadedImages, Model);

        // Suppression de l'ancienne image si type 'single'
        if (!this.imageHandler.isGallery && oldImage) {
          await this.cleanupOldImage(oldImage, entityId);
        }
      }

      return { message: 'Images téléversées avec succès', data: uploadedImages };
    } catch (error) {
      if (files) {
        await this.cleanupTempFiles(files);
      }
      throw error;
    }
  }

  shouldSyncToWordPress(options) {
    return this.entity !== 'suppliers' && options.syncToWordPress;
  }

  async syncImageToWordPress(localPath) {
    return await this.wpSync.uploadToWordPress(localPath);
  }

  async cleanupTempFiles(files) {
    const toClean = Array.isArray(files) ? files : [files];
    for (const file of toClean) {
      if (file.path) await this._cleanup(file.path).catch(console.error);
    }
  }

  async updateEntityWithImages(item, newImages, Model) {
    const updateData = {};

    if (!this.imageHandler.isGallery) {
      // Mode 'single' - remplacer l'image existante
      updateData.image = { ...newImages[0], status: 'active' };
      updateData.gallery_images = [];
    } else {
      // Mode 'gallery' - ajouter à la galerie
      if (!item.image && newImages.length > 0) {
        updateData.image = { ...newImages[0], status: 'active' };
      }

      // Fusionner avec les images existantes en évitant les doublons
      const allImages = [...(item.gallery_images || []), ...newImages];
      updateData.gallery_images = this.deduplicateImages(allImages);
    }

    await Model.update(item._id, updateData);
  }

  deduplicateImages(images) {
    const uniqueImages = [];
    const pathsAdded = new Set();

    for (const img of images) {
      if (!pathsAdded.has(img.local_path)) {
        if (!img._id) {
          img._id = uuidv4();
        }
        uniqueImages.push({ ...img, status: 'active' });
        pathsAdded.add(img.local_path);
      }
    }

    return uniqueImages;
  }

  async cleanupOldImage(oldImage, entityId) {
    console.log(`${this.logPrefix} Début suppression de l'ancienne image:`, oldImage);

    // 1. Suppression WordPress si nécessaire
    if (oldImage.wp_id && this.entity !== 'suppliers') {
      await this.deleteFromWordPress(oldImage.wp_id);
    }

    // 2. Suppression fichier local
    await this.deleteImageFile(oldImage, entityId);

    // 3. Nettoyage du répertoire
    await this.cleanupDirectoryForEntity(entityId);
  }

  async deleteFromWordPress(wpId) {
    if (!wpId) return;

    try {
      console.log(`${this.logPrefix} Suppression de l'image WordPress wp_id: ${wpId}`);
      await this.wpSync.deleteFromWordPress(wpId);
      console.log(`${this.logPrefix} Image WordPress supprimée avec succès`);
    } catch (wpError) {
      console.error(`${this.logPrefix} Erreur lors de la suppression WordPress:`, wpError.message);
    }
  }

  async deleteImageFile(imageData, entityId) {
    if (!imageData) return;

    // Essayer avec le chemin direct
    if (imageData.local_path) {
      const deleted = await FileManager.deleteFile(imageData.local_path, this.logPrefix);
      if (deleted) return true;
    }

    // Si échec ou pas de local_path, essayer avec chemin alternatif
    if (imageData.src) {
      const altPath = FileManager.getAlternativePath(
        this.entity,
        entityId,
        imageData.local_path,
        imageData.src
      );
      if (altPath) {
        return await FileManager.deleteFile(altPath, this.logPrefix);
      }
    }

    return false;
  }

  async cleanupDirectoryForEntity(entityId) {
    try {
      console.log(`${this.logPrefix} Nettoyage du répertoire pour ${this.entity} ID: ${entityId}`);

      // 1. Récupérer l'entité pour connaître les fichiers à conserver
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) {
        // Si l'entité n'existe plus, supprimer tout le répertoire
        const entityDir = FileManager.getEntityDir(this.entity, entityId);
        await FileManager.deleteDirectory(entityDir, this.logPrefix);
        return {
          success: true,
          message: 'Répertoire supprimé (entité inexistante)',
          deleted: true,
        };
      }

      // 2. Identifier les fichiers à conserver
      const filesToKeep = this.collectFilesToKeep(item);
      console.log(`${this.logPrefix} Fichiers à conserver: ${Array.from(filesToKeep).join(', ')}`);

      // 3. Supprimer les fichiers non utilisés
      const entityDir = FileManager.getEntityDir(this.entity, entityId);
      let deleted = 0;

      try {
        const files = await fs.readdir(entityDir);
        console.log(`${this.logPrefix} Fichiers trouvés dans le répertoire: ${files.join(', ')}`);

        for (const file of files) {
          if (!filesToKeep.has(file)) {
            const filePath = path.join(entityDir, file);
            const success = await FileManager.deleteFile(filePath, this.logPrefix);
            if (success) deleted++;
          }
        }

        console.log(`${this.logPrefix} ${deleted} fichiers supprimés sur ${files.length} trouvés`);

        // Si tous les fichiers ont été supprimés, supprimer le répertoire
        if (deleted === files.length && files.length > 0) {
          await FileManager.deleteDirectory(entityDir, this.logPrefix);
        }

        return {
          success: true,
          message: `Nettoyage terminé pour ${this.entity} ID: ${entityId}`,
          deleted,
          total: files.length,
        };
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          console.log(`${this.logPrefix} Le répertoire n'existe pas: ${entityDir}`);
          return { success: true, message: 'Aucun répertoire à nettoyer', deleted: 0 };
        }
        throw readError;
      }
    } catch (error) {
      console.error(`${this.logPrefix} Erreur lors du nettoyage du répertoire:`, error);
      return { success: false, error: error.message };
    }
  }

  collectFilesToKeep(item) {
    const filesToKeep = new Set();

    // Fonction pour extraire et ajouter un nom de fichier à l'ensemble
    const addFileToKeep = (imageData) => {
      if (!imageData) return;

      if (imageData.local_path) {
        filesToKeep.add(path.basename(imageData.local_path));
      } else if (imageData.src) {
        const filename = FileManager.extractFilename(imageData.src);
        if (filename) filesToKeep.add(filename);
      }
    };

    // Vérifier l'image principale
    if (item.image) {
      addFileToKeep(item.image);
    }

    // Vérifier les images de galerie
    if (item.gallery_images && item.gallery_images.length > 0) {
      for (const img of item.gallery_images) {
        addFileToKeep(img);
      }
    }

    return filesToKeep;
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

  async deleteImage(entityId) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) throw new Error(`Entité non trouvée`);

      const imageData = item.image;

      // 1. Suppression WordPress
      if (imageData?.wp_id && this.entity !== 'suppliers') {
        await this.deleteFromWordPress(imageData.wp_id);
      }

      // 2. Suppression fichier local
      await this.deleteImageFile(imageData, entityId);

      // 3. Nettoyage complet du répertoire
      await this.cleanupAllFiles(entityId);

      // 4. Mise à jour de l'entité en base de données
      await this.imageHandler.delete(entityId);
      return true;
    } catch (error) {
      throw new Error(`Erreur suppression image: ${error.message}`);
    }
  }

  async cleanupAllFiles(entityId) {
    const entityDir = FileManager.getEntityDir(this.entity, entityId);

    try {
      console.log(`${this.logPrefix} Nettoyage complet du répertoire: ${entityDir}`);

      // Vérifier si le répertoire existe
      const exists = await FileManager.fileExists(entityDir);
      if (!exists) {
        console.log(`${this.logPrefix} Le répertoire n'existe pas: ${entityDir}`);
        return false;
      }

      // Supprimer tous les fichiers puis le répertoire
      const files = await fs.readdir(entityDir);
      for (const file of files) {
        await FileManager.deleteFile(path.join(entityDir, file), this.logPrefix);
      }

      // Supprimer le répertoire
      return await FileManager.deleteDirectory(entityDir, this.logPrefix);
    } catch (error) {
      console.error(`${this.logPrefix} Erreur nettoyage complet:`, error);
      return false;
    }
  }

  async deleteGalleryImage(entityId, imageId, options = { localOnly: false }) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) throw new Error(`Entité non trouvée`);

      // Rechercher l'image par _id uniquement
      const imageToDelete = item.gallery_images?.find((img) => img._id === imageId);

      if (!imageToDelete) throw new Error(`Image non trouvée`);

      // Suppression WordPress sauf si mode localOnly
      if (!options.localOnly && imageToDelete.wp_id && this.entity !== 'suppliers') {
        await this.deleteFromWordPress(imageToDelete.wp_id);
      } else if (options.localOnly) {
        console.log(`${this.logPrefix} Mode localOnly activé - Suppression WordPress ignorée`);
      }

      // Suppression du fichier local
      await this.deleteImageFile(imageToDelete, entityId);

      // Mise à jour des données en base
      await this.updateAfterGalleryImageDeletion(
        entityId,
        imageId,
        imageToDelete,
        item,
        Model,
        options
      );

      return true;
    } catch (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
  }

  async updateAfterGalleryImageDeletion(entityId, imageId, imageToDelete, item, Model, options) {
    // Filtrer la galerie pour enlever l'image supprimée
    const updatedGallery = item.gallery_images.filter((img) => img._id !== imageId);

    const updateData = {
      gallery_images: updatedGallery,
    };

    // Si c'est aussi l'image principale, la supprimer ou la remplacer
    if (
      item.image &&
      (item.image._id === imageId ||
        (item.image.local_path && item.image.local_path === imageToDelete.local_path))
    ) {
      // Si d'autres images existent dans la galerie, utiliser la première
      if (updatedGallery.length > 0) {
        updateData.image = { ...updatedGallery[0] };
      } else {
        updateData.image = null;
      }
    }

    // Marquer pour synchronisation si localOnly est activé
    if (options.localOnly && item.woo_id) {
      updateData.pending_sync = true;
    }

    await Model.update(entityId, updateData);
  }

  async resyncImage(imageData) {
    if (!imageData.local_path) {
      throw new Error('Chemin local requis pour la resynchronisation');
    }

    if (this.entity === 'suppliers') {
      throw new Error('Resynchronisation non disponible pour les fournisseurs');
    }

    try {
      const wpData = await this.syncImageToWordPress(imageData.local_path);
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
    await FileManager.deleteFile(filePath);
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
}

module.exports = ImageService;
