// src/models/images/SingleImage.js
const BaseImage = require('../base/BaseImage');
const path = require('path');
const fs = require('fs').promises;

class SingleImage extends BaseImage {
  constructor(entity) {
    super(entity);
    this.maxFiles = 1;
  }

  async upload(file, entityId) {
    try {
      // Valider le fichier
      this.validateFile(file);

      // Obtenir les données de base de l'image via la classe parente
      const imageData = await this.uploadImage(file, entityId);

      // Vérifier et supprimer l'ancienne image si elle existe
      const existingImage = await this.getExistingImage(entityId);
      if (existingImage) {
        await this.deleteExistingImage(existingImage).catch((err) =>
          console.warn('Avertissement: échec suppression ancienne image:', err.message)
        );
      }

      // Créer le dossier de destination s'il n'existe pas
      const destDir = path.dirname(imageData.local_path);
      await fs.mkdir(destDir, { recursive: true });

      // Déplacer physiquement le fichier
      try {
        await fs.rename(file.path, imageData.local_path);
      } catch (moveError) {
        // Si le rename échoue, essayer de copier puis supprimer
        await fs.copyFile(file.path, imageData.local_path);
        await fs.unlink(file.path).catch(() => {}); // Ignorer l'erreur si le fichier n'existe plus
      }

      return imageData;
    } catch (error) {
      // Nettoyage en cas d'erreur, ignorer si le fichier n'existe pas
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }
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
