// src/models/images/SingleImage.js
const BaseImage = require('../base/BaseImage');
const fs = require('fs').promises;

class SingleImage extends BaseImage {
  constructor(entity) {
    super(entity);
    this.maxFiles = 1;
  }

  async upload(file, entityId) {
    try {
      this.validateFile(file);
      const imageData = await this.uploadImage(file, entityId);
      const existingImage = await this.getExistingImage(entityId);

      if (existingImage) {
        await this.deleteExistingImage(existingImage);
      }

      await this.ensureDirectoryExists(imageData.local_path);

      try {
        await fs.rename(file.path, imageData.local_path);
      } catch (moveError) {
        await fs.copyFile(file.path, imageData.local_path);
        await fs.unlink(file.path).catch(() => {});
      }

      return imageData;
    } catch (error) {
      if (file.path) await fs.unlink(file.path).catch(() => {});
      throw error;
    }
  }

  async getExistingImage(entityId) {
    // À implémenter selon votre système de stockage
    // Pour l'instant, retourne null
    return null;
  }

  async deleteExistingImage(existingImage) {
    try {
      if (existingImage.local_path) {
        await fs.access(existingImage.local_path); // Vérifier si le fichier existe
        await this.deleteImage(existingImage.local_path);
      }
    } catch (error) {
      // Ignorer les erreurs si le fichier n'existe pas
      console.warn('Avertissement: fichier inexistant lors de la suppression:', error.message);
    }
  }
}

module.exports = SingleImage;
