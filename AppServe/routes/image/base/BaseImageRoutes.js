// routes/image/base/BaseImageRoutes.js
const express = require('express');
const createImageUploadMiddleware = require('../../../middleware/upload/uploadHandlerFactory');
const extractImageDimensions = require('../../../middleware/upload/dimensionExtractor');
const BaseImageController = require('../../../controllers/image/BaseImageController');

class BaseImageRoutes {
  constructor(entity, options = { type: 'single' }) {
    this.router = express.Router();
    this.entity = entity;
    this.imageController = new BaseImageController(entity, options);
    this.uploadMiddleware = createImageUploadMiddleware(entity);
    this.initializeRoutes(options.type);
  }

  initializeRoutes(type) {
    const uploadMethod = type === 'gallery' ? 'array' : 'single';

    // Routes existantes avec middleware d'extraction des dimensions
    this.router.post(
      '/:id/image',
      this.uploadMiddleware[uploadMethod],
      extractImageDimensions, // Ajout du middleware ici
      this.imageController.uploadImage.bind(this.imageController)
    );

    this.router.put(
      '/:id/image/metadata',
      this.imageController.updateImageMetadata.bind(this.imageController)
    );

    this.router.delete('/:id/image', this.imageController.deleteImage.bind(this.imageController));

    // Nouvelle route pour définir l'image principale
    if (type === 'gallery') {
      this.router.put(
        '/:id/main-image',
        this.imageController.setMainImage.bind(this.imageController)
      );
    }

    // Pour supprimer une image spécifique de la galerie
    this.router.delete(
      '/:id/gallery/:imageId',
      this.imageController.deleteGalleryImage.bind(this.imageController)
    );
  }

  getRouter() {
    return this.router;
  }
}

module.exports = BaseImageRoutes;
