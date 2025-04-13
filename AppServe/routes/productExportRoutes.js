// AppServe/routes/productExportRoutes.js
const express = require('express');
const router = express.Router();
const productExportController = require('../controllers/productExportController');

// Route pour exporter les produits en PDF
router.post('/export/pdf', productExportController.exportToPdf);

// Route pour exporter les produits en CSV (optionnel)
router.post('/export/csv', productExportController.exportToCsv);

module.exports = router;
