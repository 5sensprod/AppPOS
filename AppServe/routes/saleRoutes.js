// routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// Routes principales
router.get('/', saleController.getSales.bind(saleController));
router.get('/:id', saleController.getSaleById.bind(saleController));
router.post('/', saleController.createSale.bind(saleController));

// Routes spécialisées
router.get('/cashier/report', saleController.getCashierReport.bind(saleController));

module.exports = router;
