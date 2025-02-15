// src/models/images/SingleImage.js
const BaseImage = require('../base/BaseImage');
const fs = require('fs').promises;
const db = require('../../config/database');

class SingleImage extends BaseImage {
  constructor(entity) {
    super(entity);
    this.maxFiles = 1;
    this.collection = db[entity];
  }

  async getExistingImage(entityId) {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ _id: entityId }, (err, doc) => {
        if (err) reject(err);
        resolve(doc?.image || null);
      });
    });
  }

  async updateEntityWithImage(entityId, imageData) {
    return new Promise((resolve, reject) => {
      this.collection.update(
        { _id: entityId },
        { $set: { image: imageData } },
        {},
        (err, numReplaced) => {
          if (err) reject(err);
          resolve(numReplaced);
        }
      );
    });
  }

  async upload(file, entityId) {
    try {
      // Valider le fichier
      this.validateFile(file);

      // Générer les métadonnées de l'image
      const imageData = await this.uploadImage(file, entityId);

      // Vérifier et supprimer l'image existante si nécessaire
      const existingImage = await this.getExistingImage(entityId);
      if (existingImage) {
        await this.deleteExistingImage(existingImage);
      }

      // Créer le répertoire si nécessaire
      await this.ensureDirectoryExists(imageData.local_path);

      // Déplacer le fichier
      try {
        await fs.rename(file.path, imageData.local_path);
      } catch (moveError) {
        await fs.copyFile(file.path, imageData.local_path);
        await fs.unlink(file.path).catch(() => {});
      }

      // Mettre à jour l'entité dans la base de données
      await this.updateEntityWithImage(entityId, imageData);

      return imageData;
    } catch (error) {
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }
      throw new Error(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  async deleteExistingImage(existingImage) {
    try {
      if (existingImage.local_path) {
        await fs.access(existingImage.local_path);
        await this.deleteImage(existingImage.local_path);
      }
    } catch (error) {
      console.warn('Avertissement: fichier inexistant lors de la suppression:', error.message);
    }
  }

  async delete(entityId) {
    const existingImage = await this.getExistingImage(entityId);
    if (existingImage) {
      await this.deleteExistingImage(existingImage);
      await this.updateEntityWithImage(entityId, null);
    }
  }
}

module.exports = SingleImage;
