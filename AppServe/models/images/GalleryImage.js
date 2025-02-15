// src/models/images/GalleryImage.js
const BaseImageHandler = require('../base/BaseImageHandler');

class GalleryImage extends BaseImageHandler {
  constructor(entity) {
    super(entity);
    this.maxFiles = 10;
    this.isGallery = true;
  }

  async reorderGallery(productId, imageIds) {
    const existingImages = await this.getImages(productId);
    if (!existingImages.length) throw new Error('Aucune image trouvée');

    const validIds = existingImages.map((img) => img.id);
    if (!imageIds.every((id) => validIds.includes(id))) {
      throw new Error("IDs d'images invalides");
    }

    const reorderedImages = imageIds.map((id, index) => ({
      ...existingImages.find((img) => img.id === id),
      gallery_order: index,
    }));

    await this.updateEntity(productId, reorderedImages);
    return reorderedImages;
  }

  async setPrimaryImage(productId, imageId) {
    const existingImages = await this.getImages(productId);
    if (!existingImages.length) throw new Error('Aucune image trouvée');

    const updatedImages = existingImages.map((img) => ({
      ...img,
      is_primary: img.id === imageId,
    }));

    await this.updateEntity(productId, updatedImages);
    return updatedImages;
  }
}

module.exports = GalleryImage;
