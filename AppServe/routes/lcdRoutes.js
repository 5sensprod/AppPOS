// routes/lcdRoutes.js - Version avec middleware de session
const express = require('express');
const router = express.Router();
const LCDController = require('../controllers/lcdController');

const lcdController = new LCDController();

// Middleware pour mettre à jour l'activité de session
const updateActivity = lcdController.updateSessionActivity.bind(lcdController);

// Connexion (pas de middleware d'activité car c'est la connexion initiale)
router.get('/ports', lcdController.listPorts.bind(lcdController));
router.post('/connect', lcdController.connect.bind(lcdController));
router.post('/disconnect', lcdController.disconnect.bind(lcdController));
router.get('/status', lcdController.getStatus.bind(lcdController));

// Messages (avec middleware d'activité pour maintenir la session)
router.post('/write', updateActivity, lcdController.writeMessage.bind(lcdController));
router.post('/clear', updateActivity, lcdController.clearDisplay.bind(lcdController));

// Messages POS (avec middleware d'activité)
router.post('/show/price', updateActivity, lcdController.showPrice.bind(lcdController));
router.post('/show/total', updateActivity, lcdController.showTotal.bind(lcdController));
router.post('/show/welcome', updateActivity, lcdController.showWelcome.bind(lcdController));
router.post('/show/thankyou', updateActivity, lcdController.showThankYou.bind(lcdController));
router.post('/show/error', updateActivity, lcdController.showError.bind(lcdController));

// Test (avec middleware d'activité)
router.post('/test', updateActivity, lcdController.testDisplay.bind(lcdController));

module.exports = router;
