// BaseImageHandler.js
const BaseImage = require('./BaseImage');
const db = require('../../config/database');
const fs = require('fs').promises;

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
    const updateField = this.isGallery ? 'gallery_images' : 'image';
    return new Promise((resolve, reject) => {
      this.collection.update(
        { _id: entityId },
        { $set: { [updateField]: imageData } },
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
      this.validateFile(file);
      const imageData = await this.uploadImage(file, entityId);
      const existingImage = await this.getImages(entityId);

      if (!this.isGallery && existingImage) {
        await this.deleteImage(existingImage.local_path);
      }

      await this.ensureDirectoryExists(imageData.local_path);
      await fs.rename(file.path, imageData.local_path);
      await this.updateEntity(
        entityId,
        this.isGallery ? [...(existingImage || []), imageData] : imageData
      );

      return imageData;
    } catch (error) {
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }

  async delete(entityId) {
    const existingImage = await this.getImages(entityId);

    if (this.isGallery) {
      for (const image of existingImage) {
        await this.deleteImage(image.local_path);
      }
      await this.updateEntity(entityId, []);
    } else if (existingImage) {
      await this.deleteImage(existingImage.local_path);
      await this.updateEntity(entityId, null);
    }
  }
}
module.exports = BaseImageHandler;
