const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateSchema = require('../validation/validation');
const { createProductSchema, updateProductSchema } = require('../validation/schemas');
const productImageRoutes = require('./image/productImageRoutes');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware'); // Ajouter cette ligne

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validateSchema(createProductSchema), productController.create);

// Ajouter le middleware aux routes de mise à jour
router.put(
  '/:id',
  validateSchema(updateProductSchema),
  wooSyncMiddleware,
  productController.update
);
router.patch(
  '/:id',
  validateSchema(updateProductSchema),
  wooSyncMiddleware,
  productController.update
);

router.delete('/:id', productController.delete);

router.use('/', productImageRoutes);

module.exports = router;
