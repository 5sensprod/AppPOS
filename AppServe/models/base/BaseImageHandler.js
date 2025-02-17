// BaseImageHandler.js
const BaseImage = require('./BaseImage');
const db = require('../../config/database');
const fs = require('fs').promises;
const path = require('path');

class BaseImageHandler extends BaseImage {
  constructor(entity) {
    super(entity);
    this.collection = db[entity];
  }

  async getImages(entityId) {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ _id: entityId }, (err, doc) => {
        if (err) reject(err);
        resolve(this.isGallery ? doc?.gallery_images || [] : doc?.image || null);
      });
    });
  }

  async updateEntity(entityId, imageData) {
    return new Promise((resolve, reject) => {
      const updateQuery = { _id: entityId };
      const updateData = this.isGallery
        ? {
            $set: {
              gallery_images: Array.isArray(imageData) ? imageData : [imageData],
            },
          }
        : { $set: { image: imageData } };

      this.collection.update(updateQuery, updateData, { multi: false }, (err, numReplaced) => {
        if (err) return reject(err);
        resolve(numReplaced);
      });
    });
  }

  async upload(file, entityId) {
    try {
      // Vérifier d'abord si l'entité existe
      const entityExists = await new Promise((resolve, reject) => {
        this.collection.findOne({ _id: entityId }, (err, doc) => {
          if (err) reject(err);
          resolve(doc);
        });
      });

      if (!entityExists) {
        throw new Error(`Entité avec l'ID ${entityId} non trouvée`);
      }

      this.validateFile(file);
      const imageData = await this.uploadImage(file, entityId);
      const existingImage = await this.getImages(entityId);

      // Si c'est une image unique, supprimer l'ancienne
      if (!this.isGallery && existingImage) {
        await this.deleteImage(entityId, existingImage);
      }

      // Assurer que le répertoire existe
      const uploadDir = path.dirname(imageData.local_path);
      await fs.mkdir(uploadDir, { recursive: true });

      // Déplacer le fichier
      await fs.rename(file.path, imageData.local_path);

      // Mettre à jour l'entité
      await this.updateEntity(
        entityId,
        this.isGallery ? [...(existingImage || []), imageData] : imageData
      );

      return imageData;
    } catch (error) {
      if (file.path) {
        await fs.unlink(file.path).catch(console.error);
      }
      throw error;
    }
  }

  async deleteImage(entityId, image) {
    if (!image) return;

    try {
      // Supprimer le fichier physique
      if (image.local_path) {
        try {
          await fs.access(image.local_path);
          await fs.unlink(image.local_path);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Erreur suppression fichier:', error);
          }
        }
      }

      // Nettoyer le dossier si vide
      const imageDir = path.join(process.cwd(), 'public', this.entity, entityId);
      try {
        const files = await fs.readdir(imageDir);
        if (files.length === 0) {
          await fs.rmdir(imageDir);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Erreur nettoyage dossier:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async delete(entityId) {
    const existingImage = await this.getImages(entityId);

    if (this.isGallery && Array.isArray(existingImage)) {
      for (const image of existingImage) {
        await this.deleteImage(entityId, image);
      }
      await this.updateEntity(entityId, []);
    } else if (existingImage) {
      await this.deleteImage(entityId, existingImage);
      await this.updateEntity(entityId, null);
    }
  }
}

module.exports = BaseImageHandler;
