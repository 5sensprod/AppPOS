// src/routes/image/categoryImageRoutes.js
const express = require('express');
const router = express.Router();
const createImageUploadMiddleware = require('../../middleware/upload/handlers');
const BaseImageController = require('../../controllers/image/BaseImageController');

const imageController = new BaseImageController('categories');
const uploadMiddleware = createImageUploadMiddleware('categories');

router.post(
  '/:id/image',
  uploadMiddleware.single,
  imageController.uploadImage.bind(imageController)
);

router.put('/:id/image/metadata', imageController.updateImageMetadata.bind(imageController));

router.delete('/:id/image', imageController.deleteImage.bind(imageController));

module.exports = router;
