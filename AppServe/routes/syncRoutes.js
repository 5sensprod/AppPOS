// routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

router.get('/woocommerce/test', syncController.testConnection);
router.post('/woocommerce/categories', syncController.syncCategories);
router.post('/woocommerce/products', syncController.syncProducts);
router.post('/woocommerce/brands', syncController.syncBrands);
router.post('/woocommerce/suppliers', syncController.syncSuppliers);
router.post('/woocommerce/all', syncController.syncAll);

module.exports = router;
