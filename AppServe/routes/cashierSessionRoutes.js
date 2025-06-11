// routes/cashierSessionRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/auth');
const cashierSessionController = require('../controllers/cashierSessionController');

// ✅ TOUTES LES ROUTES PROTÉGÉES PAR AUTHENTIFICATION
router.use(authMiddleware);

// ✅ GESTION DE SESSION
router.post('/session/open', cashierSessionController.openSession.bind(cashierSessionController));
router.post('/session/close', cashierSessionController.closeSession.bind(cashierSessionController));
router.get(
  '/session/status',
  cashierSessionController.getSessionStatus.bind(cashierSessionController)
);

// ✅ GESTION LCD
router.get('/lcd/ports', cashierSessionController.listLCDPorts.bind(cashierSessionController));
router.post(
  '/lcd/request',
  cashierSessionController.requestLCDControl.bind(cashierSessionController)
);
router.post(
  '/lcd/release',
  cashierSessionController.releaseLCDControl.bind(cashierSessionController)
);

// ✅ UTILISATION LCD
router.post('/lcd/write', cashierSessionController.writeLCDMessage.bind(cashierSessionController));
router.post('/lcd/price', cashierSessionController.showLCDPrice.bind(cashierSessionController));
router.post('/lcd/total', cashierSessionController.showLCDTotal.bind(cashierSessionController));
router.post('/lcd/welcome', cashierSessionController.showLCDWelcome.bind(cashierSessionController));
router.post(
  '/lcd/thankyou',
  cashierSessionController.showLCDThankYou.bind(cashierSessionController)
);
router.post('/lcd/clear', cashierSessionController.clearLCDDisplay.bind(cashierSessionController));

// ✅ ADMINISTRATION (optionnel - pour superviser)
router.get(
  '/sessions/active',
  cashierSessionController.getActiveSessions.bind(cashierSessionController)
);

module.exports = router;
