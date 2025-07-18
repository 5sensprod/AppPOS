// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validateSchema = require('../validation/validation');
const { createCategorySchema, updateCategorySchema } = require('../validation/schemas');
const categoryImageRoutes = require('./image/categoryImageRoutes');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');
const Category = require('../models/Category');
const ResponseHandler = require('../handlers/ResponseHandler');
const { categoryDependencyValidation } = require('../middleware/dependencyValidationMiddleware');

// Routes principales des catégories
router.get('/', categoryController.getAll);
router.get('/hierarchical', categoryController.getHierarchicalCategories);
router.get('/:id', categoryController.getById);
router.post('/', validateSchema(createCategorySchema), categoryController.create);
router.put('/:id', validateSchema(updateCategorySchema), categoryController.update);

router.delete('/:id', categoryDependencyValidation, categoryController.delete);

router.post(
  '/:id/sync',
  (req, res, next) => {
    req.model = Category;
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

router.get('/:id/path', async (req, res) => {
  try {
    const pathInfo = await Category.getCategoryPath(req.params.id);
    return ResponseHandler.success(res, pathInfo);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Intégration des routes de gestion d'images
router.use('/', categoryImageRoutes);

module.exports = router;
