// controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');

class BaseImageController {
  constructor(entity, options = { type: 'single' }) {
    this.validateOptions(options);
    this.imageService = new ImageService(entity, options.type);
  }

  validateOptions(options) {
    const validTypes = ['single', 'gallery'];
    if (!validTypes.includes(options.type)) {
      throw new Error(`Type d'image invalide. Valeurs autorisées : ${validTypes.join(', ')}`);
    }
  }

  validateAndGetFiles(req) {
    if ((!req.file && !req.files) || req.files?.length === 0) {
      throw new Error('Aucune image fournie');
    }
    return req.files || [req.file];
  }

  async processFiles(files, id) {
    return Promise.all(
      files.map((file) =>
        this.imageService.processUpload(file, id, {
          syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
        })
      )
    );
  }

  async uploadImage(req, res) {
    try {
      const files = this.validateAndGetFiles(req);
      const results = await this.processFiles(files, req.params.id);

      return res.json({
        success: true,
        message: 'Images téléversées avec succès',
        data: results,
      });
    } catch (error) {
      return this.handleError(res, error);
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

  handleError(res, error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = BaseImageController;
