const express = require('express');
const router = express.Router();
const POSPrinterController = require('../controllers/posPrinterController');

const printerController = new POSPrinterController();

// Middleware pour mettre à jour l'activité de session
const updateActivity = printerController.updateSessionActivity.bind(printerController);

// === CONNEXION ===
router.get('/ports', printerController.listPorts.bind(printerController));
router.post('/connect', printerController.connect.bind(printerController));
router.post('/disconnect', printerController.disconnect.bind(printerController));
router.get('/status', printerController.getStatus.bind(printerController));

// === IMPRESSION BASIQUE ===
router.post('/print/text', updateActivity, printerController.printText.bind(printerController));
router.post('/print/line', updateActivity, printerController.printLine.bind(printerController));

// === IMPRESSION AVANCÉE ===
router.post(
  '/print/receipt',
  updateActivity,
  printerController.printReceipt.bind(printerController)
);
router.post(
  '/print/barcode',
  updateActivity,
  printerController.printBarcode.bind(printerController)
);

// === CONTRÔLES PAPIER ===
router.post('/cut', updateActivity, printerController.cutPaper.bind(printerController));
router.post('/feed', updateActivity, printerController.feedPaper.bind(printerController));

// === PÉRIPHÉRIQUES ===
router.post(
  '/cash-drawer/open',
  updateActivity,
  printerController.openCashDrawer.bind(printerController)
);

// === TEST ===
router.post('/test', updateActivity, printerController.testPrinter.bind(printerController));

module.exports = router;
