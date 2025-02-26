// routes/wooSyncRoutes.js
const express = require('express');
const router = express.Router();
const wooSyncController = require('../controllers/wooSyncController');

// Route pour synchroniser un produit spécifique
router.post('/products/:id/sync', wooSyncController.syncProduct);

// Route pour synchroniser tous les produits modifiés
router.post('/products/sync', wooSyncController.syncAllUpdatedProducts);

// Route pour forcer la synchronisation de tous les produits
router.post('/products/sync/force', wooSyncController.forceSync);

module.exports = router;
