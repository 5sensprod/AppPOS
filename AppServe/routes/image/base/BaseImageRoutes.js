// routes/image/base/BaseImageRoutes.js
const express = require('express');
const createImageUploadMiddleware = require('../../../middleware/upload/handlers');
const BaseImageController = require('../../../controllers/image/BaseImageController');

class BaseImageRoutes {
  constructor(entity) {
    this.router = express.Router();
    this.entity = entity;
    this.imageController = new BaseImageController(entity);
    this.uploadMiddleware = createImageUploadMiddleware(entity);
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.post(
      '/:id/image',
      this.uploadMiddleware.single,
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
