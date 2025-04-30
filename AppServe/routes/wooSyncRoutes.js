// routes/wooSyncRoutes.js
const express = require('express');
const router = express.Router();
const wooSyncController = require('../controllers/wooSyncController');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');

// Routes de produits existantes
router.get('/products/pending', wooSyncController.getPendingSync);
router.post('/products/:id/sync', wooSyncController.syncProduct);
router.post('/products/sync', wooSyncController.syncAllUpdatedProducts);
router.post('/products/sync/force', wooSyncController.forceSync);

// Nouvelles routes pour la gestion des woo_id manquants
router.get('/products/missing-woo-ids', wooSyncController.countMissingWooIds);
router.post('/products/sync-missing-woo-ids', wooSyncController.syncMissingWooIds);
router.post('/products/:id/sync-by-sku', wooSyncController.syncProductBySku);

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
