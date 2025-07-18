// routes/brandRoutes.js - VERSION REFACTORISÉE
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/BrandController');
const validateSchema = require('../validation/validation');
const { createBrandSchema, updateBrandSchema } = require('../validation/schemas');
const brandImageRoutes = require('./image/brandImageRoutes');
const Brand = require('../models/Brand');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');
const { brandDependencyValidation } = require('../middleware/dependencyValidationMiddleware');

// Routes principales
router.get('/', brandController.getAll);
router.get('/:id', brandController.getById);
router.get('/supplier/:supplierId', brandController.getBySupplier);
router.post('/', validateSchema(createBrandSchema), brandController.create);
router.put('/:id', validateSchema(updateBrandSchema), brandController.update);

// Route de suppression simplifiée avec middleware
router.delete('/:id', brandDependencyValidation, brandController.delete);

// Route de synchronisation
router.post(
  '/:id/sync',
  (req, res, next) => {
    req.model = Brand;
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

// Routes images
router.use('/', brandImageRoutes);

module.exports = router;
