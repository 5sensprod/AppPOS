// routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Routes de test et catégories
router.get('/woocommerce/test', syncController.testConnection);
router.get('/woocommerce/categories', syncController.syncCategories);
router.put('/woocommerce/categories', syncController.syncCategories);

// Routes de synchronisation
router.get('/woocommerce/products', syncController.syncProducts);
router.get('/woocommerce/brands', syncController.syncBrands);
router.get('/woocommerce/suppliers', syncController.syncSuppliers);
router.get('/woocommerce/all', syncController.syncAll);

module.exports = router;
