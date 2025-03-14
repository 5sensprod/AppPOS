// routes/wooSyncRoutes.js
const express = require('express');
const router = express.Router();
const wooSyncController = require('../controllers/wooSyncController');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');

router.get('/products/pending', wooSyncController.getPendingSync);
// Route pour synchroniser un produit spécifique l image nest pas prise en compte ! utilser plutot {{base_url}}/api/products/:id/sync
router.post('/products/:id/sync', wooSyncController.syncProduct);

// Route pour synchroniser tous les produits modifiés
router.post('/products/sync', wooSyncController.syncAllUpdatedProducts);

// Route pour forcer la synchronisation de tous les produits
router.post('/products/sync/force', wooSyncController.forceSync);

// Routes pour les catégories
router.get('/categories/pending', wooSyncController.getPendingCategories);
router.post(
  '/categories/:id/sync',
  (req, res, next) => {
    req.model = require('../models/Category');
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

// Routes pour les marques
router.get('/brands/pending', wooSyncController.getPendingBrands);
router.post(
  '/brands/:id/sync',
  (req, res, next) => {
    req.model = require('../models/Brand');
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

module.exports = router;
