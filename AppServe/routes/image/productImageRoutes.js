// src/routes/image/productImageRoutes.js
const express = require('express');
const router = express.Router();
const createImageUploadMiddleware = require('../../middleware/upload/handlers');
const ProductImageController = require('../../controllers/image/ProductImageController');

const imageController = new ProductImageController();
const uploadMiddleware = createImageUploadMiddleware('products');

router.post(
  '/:id/images',
  uploadMiddleware.array,
  imageController.uploadImages.bind(imageController)
);

router.put('/:id/gallery/reorder', imageController.reorderGallery.bind(imageController));

router.put('/:id/gallery/primary', imageController.setPrimaryImage.bind(imageController));

router.delete('/:id/images/:imageId', imageController.deleteImage.bind(imageController));

module.exports = router;
