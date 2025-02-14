// src/services/image/ProductImageService.js
const GalleryImage = require('../../models/images/GalleryImage');
const WordPressImageSync = require('./WordPressImageSync');

class ProductImageService {
  constructor() {
    this.imageHandler = new GalleryImage();
    this.wpSync = new WordPressImageSync();
  }

  async processUpload(files, productId, options = {}) {
    try {
      // Upload local
      const imagesData = await this.imageHandler.upload(files, productId);

      // Synchronisation WordPress si nécessaire
      if (options.syncToWordPress) {
        for (let imageData of imagesData) {
          try {
            const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
            imageData.wp_id = wpData.id;
            imageData.status = 'active';
          } catch (error) {
            console.error('Erreur synchronisation WordPress:', error);
            imageData.sync_error = error.message;
            imageData.status = 'pending';
          }
        }
      }

      return imagesData;
    } catch (error) {
      // Nettoyage en cas d'erreur
      await this._cleanupFiles(files).catch(() => {});
      throw error;
    }
  }

  async reorderGallery(productId, imageIds, options = {}) {
    const reorderedImages = await this.imageHandler.reorderGallery(productId, imageIds);

    if (options.syncToWordPress) {
      // Mise à jour de l'ordre dans WordPress si nécessaire
      for (const image of reorderedImages) {
        if (image.wp_id) {
          try {
            await this.wpSync.updateMetadata(image.wp_id, {
              menu_order: image.gallery_order,
            });
          } catch (error) {
            console.error('Erreur sync ordre WordPress:', error);
          }
        }
      }
    }

    return reorderedImages;
  }

  async setPrimaryImage(productId, imageId, options = {}) {
    const updatedImages = await this.imageHandler.setPrimaryImage(productId, imageId);

    if (options.syncToWordPress) {
      for (const image of updatedImages) {
        if (image.wp_id) {
          try {
            await this.wpSync.updateMetadata(image.wp_id, {
              is_primary: image.is_primary,
            });
          } catch (error) {
            console.error('Erreur sync primary WordPress:', error);
          }
        }
      }
    }

    return updatedImages;
  }

  async deleteImage(productId, imageId) {
    const image = (await this.imageHandler.getExistingImages(productId)).find(
      (img) => img.id === imageId
    );

    if (image && image.wp_id) {
      try {
        await this.wpSync.deleteFromWordPress(image.wp_id);
      } catch (error) {
        console.error('Erreur suppression WordPress:', error);
      }
    }

    return this.imageHandler.deleteImage(productId, imageId);
  }

  async updateMetadata(productId, imageId, metadata) {
    const updatedImage = await this.imageHandler.updateMetadata(productId, imageId, metadata);

    if (updatedImage.wp_id) {
      try {
        await this.wpSync.updateMetadata(updatedImage.wp_id, metadata);
      } catch (error) {
        console.error('Erreur mise à jour WordPress:', error);
        updatedImage.sync_error = error.message;
      }
    }

    return updatedImage;
  }

  async _cleanupFiles(files) {
    const filesToClean = Array.isArray(files) ? files : [files];
    for (const file of filesToClean) {
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error('Erreur nettoyage fichier:', error);
        }
      }
    }
  }
}

module.exports = ProductImageService;
