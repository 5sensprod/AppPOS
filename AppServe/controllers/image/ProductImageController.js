// src/controllers/image/ProductImageController.js
const ProductImageService = require('../../services/image/ProductImageService');

class ProductImageController {
  constructor() {
    this.imageService = new ProductImageService();
  }

  async uploadImages(req, res) {
    try {
      if (!req.files || !req.files.length) {
        return res.status(400).json({ error: 'Aucune image fournie' });
      }

      const imagesData = await this.imageService.processUpload(req.files, req.params.id, {
        syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
      });

      res.json({
        success: true,
        message: 'Images téléversées avec succès',
        data: imagesData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async reorderGallery(req, res) {
    try {
      const { imageIds } = req.body;

      const reorderedImages = await this.imageService.reorderGallery(req.params.id, imageIds, {
        syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
      });

      res.json({
        success: true,
        message: 'Galerie réorganisée avec succès',
        data: reorderedImages,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async setPrimaryImage(req, res) {
    try {
      const { imageId } = req.body;

      const updatedImages = await this.imageService.setPrimaryImage(req.params.id, imageId, {
        syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
      });

      res.json({
        success: true,
        message: 'Image principale définie avec succès',
        data: updatedImages,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteImage(req, res) {
    try {
      const { imageId } = req.params;

      await this.imageService.deleteImage(req.params.id, imageId);

      res.json({
        success: true,
        message: 'Image supprimée avec succès',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = ProductImageController;
