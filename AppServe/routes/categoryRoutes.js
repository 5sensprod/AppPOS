// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validateSchema = require('../middleware/validation');
const {
  createCategorySchema,
  updateCategorySchema,
  imageMetadataSchema,
} = require('../validation/schemas');
const upload = require('../middleware/upload');

// Routes principales des catégories
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', validateSchema(createCategorySchema), categoryController.create);
router.put('/:id', validateSchema(updateCategorySchema), categoryController.update);
router.delete('/:id', categoryController.delete);

// Routes de gestion des images
router.patch('/:id/image', upload.single('image'), categoryController.uploadImage);
router.put(
  '/:id/image/metadata',
  validateSchema(imageMetadataSchema),
  categoryController.updateImageMetadata
);

module.exports = router;
