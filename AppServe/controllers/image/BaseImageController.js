// src/controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');

class BaseImageController {
  constructor(entity, options = { type: 'single' }) {
    if (!['single', 'gallery'].includes(options.type)) {
      throw new Error("Le type d'image doit être 'single' ou 'gallery'");
    }
    this.imageService = new ImageService(entity, options.type);
  }

  async uploadImage(req, res) {
    try {
      if ((!req.file && !req.files) || (req.files && req.files.length === 0)) {
        return res.status(400).json({ error: 'Aucune image fournie' });
      }

      const files = req.files || [req.file];
      const results = await Promise.all(
        files.map((file) =>
          this.imageService.processUpload(file, req.params.id, {
            syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
          })
        )
      );

      res.json({
        success: true,
        message: 'Images téléversées avec succès',
        data: results,
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
