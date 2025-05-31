// routes/lcdRoutes.js - Version optimisée
const express = require('express');
const router = express.Router();
const LCDController = require('../controllers/lcdController');

const lcdController = new LCDController();

// Connexion
router.get('/ports', lcdController.listPorts.bind(lcdController));
router.post('/connect', lcdController.connect.bind(lcdController));
router.post('/disconnect', lcdController.disconnect.bind(lcdController));
router.get('/status', lcdController.getStatus.bind(lcdController));

// Messages
router.post('/write', lcdController.writeMessage.bind(lcdController));
router.post('/clear', lcdController.clearDisplay.bind(lcdController));

// Messages POS
router.post('/show/price', lcdController.showPrice.bind(lcdController));
router.post('/show/total', lcdController.showTotal.bind(lcdController));
router.post('/show/welcome', lcdController.showWelcome.bind(lcdController));
router.post('/show/thankyou', lcdController.showThankYou.bind(lcdController));
router.post('/show/error', lcdController.showError.bind(lcdController));

// Test
router.post('/test', lcdController.testDisplay.bind(lcdController));

module.exports = router;
