// src/controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');

class BaseImageController {
  constructor(entity) {
    this.imageService = new ImageService(entity);
  }

  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucune image fournie' });
      }

      const imageData = await this.imageService.processUpload(req.file, req.params.id, {
        syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
      });

      res.json({
        success: true,
        message: 'Image téléversée avec succès',
        data: imageData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateImageMetadata(req, res) {
    try {
      const updateData = await this.imageService.updateMetadata(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Métadonnées mises à jour avec succès',
        data: updateData,
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
      await this.imageService.deleteImage(req.params.id);

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

module.exports = BaseImageController;
