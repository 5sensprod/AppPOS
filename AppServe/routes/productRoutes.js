// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateSchema = require('../validation/validation');
const { createProductSchema, updateProductSchema } = require('../validation/schemas');
const productImageRoutes = require('./image/productImageRoutes');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');
const Product = require('../models/Product');

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validateSchema(createProductSchema), productController.create);

// Middleware de synchronisation pour les routes de mise à jour
router.put(
  '/:id',
  validateSchema(updateProductSchema),
  wooSyncMiddleware(),
  productController.update
);
router.patch(
  '/:id',
  validateSchema(updateProductSchema),
  wooSyncMiddleware(),
  productController.update
);

router.delete('/:id', productController.delete);

// Nouvelle route pour la synchronisation manuelle
router.post(
  '/:id/sync',
  (req, res, next) => {
    req.model = Product; // Ajouter le modèle à la requête
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

router.use('/', productImageRoutes);

module.exports = router;
