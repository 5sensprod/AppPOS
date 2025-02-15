// routes/image/base/BaseImageRoutes.js
const express = require('express');
const createImageUploadMiddleware = require('../../../middleware/upload/handlers');
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
    this.router.post(
      '/:id/image',
      this.uploadMiddleware[uploadMethod],
      this.imageController.uploadImage.bind(this.imageController)
    );

    this.router.put(
      '/:id/image/metadata',
      this.imageController.updateImageMetadata.bind(this.imageController)
    );

    this.router.delete('/:id/image', this.imageController.deleteImage.bind(this.imageController));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = BaseImageRoutes;
