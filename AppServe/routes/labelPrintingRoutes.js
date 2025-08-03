// ===== 1. ROUTE PRINCIPALE - routes/labelPrintingRoutes.js =====
const express = require('express');
const router = express.Router();
const labelPrintingController = require('../controllers/labelPrintingController');

// Route pour imprimer directement les étiquettes
router.post('/print-labels', labelPrintingController.printLabels);

// Route pour obtenir les imprimantes disponibles
router.get('/printers', labelPrintingController.getAvailablePrinters);

// Route pour tester une imprimante
router.post('/test-printer', labelPrintingController.testPrinter);

// Route pour obtenir les paramètres d'impression par défaut
router.get('/print-settings', labelPrintingController.getPrintSettings);

module.exports = router;
