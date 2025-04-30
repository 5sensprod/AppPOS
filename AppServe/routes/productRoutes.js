// Mise à jour de routes/productRoutes.js pour inclure les routes d'export
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { exportToPdf, exportToCsv } = require('../controllers/productExportController');
const validateSchema = require('../validation/validation');
const { createProductSchema, updateProductSchema } = require('../validation/schemas');
const productImageRoutes = require('./image/productImageRoutes');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');
const Product = require('../models/Product');

// Routes existantes
router.get('/', productController.getAll);
router.get('/filter', productController.filter);
router.get('/:id', productController.getById);
router.get('/:id/category-path', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return ResponseHandler.notFound(res, 'Produit non trouvé');

    if (!product.categories || product.categories.length === 0) {
      return ResponseHandler.success(res, {
        path: [],
        path_ids: [],
        path_string: '',
      });
    }

    const Category = require('../models/Category');
    const pathInfo = await Category.getCategoryPath(product.categories[0]);
    return ResponseHandler.success(res, pathInfo);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});
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

// Nouvelle route pour recalculer tous les compteurs de produits
router.post('/recalculate-counts', productController.recalculateAllCounts);

// Ajouter les routes d'export
router.post('/batch-status', productController.batchUpdateStatus);
router.post('/batch-category', productController.batchUpdateCategory);
router.post('/export/pdf', exportToPdf);
router.post('/export/csv', exportToCsv);

// POST /api/products/:id/repair-images
router.post('/:id/repair-images', productController.repairProductImages.bind(productController));

router.use('/', productImageRoutes);

module.exports = router;
