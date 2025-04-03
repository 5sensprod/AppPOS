const BaseImage = require('./BaseImage');
const db = require('../../config/database');
const fs = require('fs').promises;
const path = require('path');

class ImageEntityHandler extends BaseImage {
  constructor(entity, collection = null) {
    super(entity);
    this.collection = collection || db[entity];
    this.isGallery = this.isGallery ?? false; // fallback si oublié
  }

  async getImages(entityId) {
    const doc = await this._findEntity(entityId);
    return this.isGallery ? doc?.gallery_images || [] : doc?.image || null;
  }

  async updateEntity(entityId, imageData) {
    const updateQuery = { _id: entityId };
    const updateData = this.isGallery
      ? { $set: { gallery_images: Array.isArray(imageData) ? imageData : [imageData] } }
      : { $set: { image: imageData } };

    return this._updateEntityInDb(updateQuery, updateData);
  }

  async upload(file, entityId) {
    try {
      await this._assertEntityExists(entityId);
      this.validateFile(file);

      const imageData = await this.uploadImage(file, entityId);
      const existingImage = await this.getImages(entityId);

      // Supprimer ancienne image si non-gallery
      if (!this.isGallery && existingImage) {
        await this._deleteImageFile(existingImage);
      }

      await this._moveFile(file.path, imageData.local_path);
      await this.updateEntity(
        entityId,
        this.isGallery ? [...(existingImage || []), imageData] : imageData
      );

      return imageData;
    } catch (error) {
      if (file?.path) await fs.unlink(file.path).catch(() => {});
      throw error;
    }
  }

  async deleteImage(entityId, image) {
    if (!image) return;
    await this._deleteImageFile(image);
    await this._cleanEmptyFolder(entityId);
  }

  async delete(entityId) {
    const existingImage = await this.getImages(entityId);

    if (this.isGallery && Array.isArray(existingImage)) {
      for (const img of existingImage) {
        await this._deleteImageFile(img);
      }
      await this.updateEntity(entityId, []);
    } else if (existingImage) {
      await this._deleteImageFile(existingImage);
      await this.updateEntity(entityId, null);
    }

    await this._cleanEmptyFolder(entityId);
  }

  // 🔒 Méthodes privées

  async _assertEntityExists(entityId) {
    const doc = await this._findEntity(entityId);
    if (!doc) throw new Error(`Entité avec l'ID ${entityId} non trouvée`);
  }

  async _findEntity(entityId) {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ _id: entityId }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  async _updateEntityInDb(query, data) {
    return new Promise((resolve, reject) => {
      this.collection.update(query, data, { multi: false }, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  }

  async _moveFile(sourcePath, destPath) {
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.rename(sourcePath, destPath);
  }

  async _deleteImageFile(image) {
    if (!image?.local_path) return;
    try {
      await fs.access(image.local_path);
      await fs.unlink(image.local_path);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Erreur suppression fichier:', err);
    }
  }

  async _cleanEmptyFolder(entityId) {
    const imageDir = path.join(process.cwd(), 'public', this.entity, entityId);
    try {
      const files = await fs.readdir(imageDir);
      if (files.length === 0) {
        await fs.rmdir(imageDir);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Erreur nettoyage dossier:', err);
    }
  }
}

module.exports = ImageEntityHandler;
