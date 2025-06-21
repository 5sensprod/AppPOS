// src/models/base/BaseImage.js
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class BaseImage {
  constructor(entity) {
    this.entity = entity; // 'categories', 'products', brands, suppliers.
    const pathManager = require('../../utils/PathManager');
    this.uploadPath = pathManager.getPublicPath(entity);
    this.maxFiles = 1;
    this.supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.maxSize = 5 * 1024 * 1024; // 5MB
  }

  async ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async uploadImage(file, entityId) {
    try {
      // Vérifie si le dossier existe, sinon le crée
      const uploadDir = path.join(this.uploadPath, entityId || 'temp');
      await fs.mkdir(uploadDir, { recursive: true });

      // Vérifie et nettoie le nom du fichier
      const cleanFileName = this.formatFileName(file.originalname);
      const timestamp = Date.now();
      const finalFileName = `${cleanFileName}-${timestamp}${path.extname(file.originalname)}`;

      // Crée l'objet image avec les données de base
      const imageData = {
        src: `/public/${this.entity}/${entityId}/${finalFileName}`,
        local_path: path.join(uploadDir, finalFileName),
        status: 'pending',
        type: path.extname(file.originalname).substring(1),
        metadata: {
          original_name: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      };

      // Utiliser les dimensions du fichier si elles ont été extraites par le middleware
      if (file.dimensions) {
        imageData.dimensions = file.dimensions;
        imageData.width = file.dimensions.width;
        imageData.height = file.dimensions.height;
        imageData.metadata.dimensions = file.dimensions;
      }

      return imageData;
    } catch (error) {
      throw new Error(`Erreur lors de l'upload de l'image: ${error.message}`);
    }
  }

  formatFileName(originalName) {
    return originalName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  validateFile(file) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    if (!this.supportedTypes.includes(file.mimetype)) {
      throw new Error('Type de fichier non supporté');
    }

    if (file.size > this.maxSize) {
      throw new Error('Fichier trop volumineux');
    }

    return true;
  }

  async deleteImage(imagePath) {
    try {
      await fs.unlink(imagePath);
      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'image: ${error.message}`);
    }
  }

  async updateMetadata(imageData, newMetadata) {
    return {
      ...imageData,
      metadata: {
        ...imageData.metadata,
        ...newMetadata,
      },
    };
  }

  getUploadConfig() {
    return {
      path: this.uploadPath,
      maxSize: this.maxSize,
      allowedTypes: this.supportedTypes,
      maxFiles: this.maxFiles,
    };
  }
}

module.exports = BaseImage;
