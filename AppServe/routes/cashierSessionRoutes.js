// routes/cashierSessionRoutes.js - AVEC ROUTE CART UPDATE
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/auth');
const ResponseHandler = require('../handlers/ResponseHandler');
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

router.post('/drawer/movement', async (req, res) => {
  try {
    const cashierId = req.user.id;
    const result = await cashierSessionController.addCashMovement(cashierId, req.body);
    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// ✅ NOUVEAU : Obtenir statut fond de caisse
router.get('/drawer/status', async (req, res) => {
  try {
    const cashierId = req.user.id;
    const drawer = cashierSessionController.getCashierDrawer(cashierId);
    return ResponseHandler.success(res, { drawer });
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// ✅ NOUVEAU : Fermer fond de caisse avec réconciliation
router.post('/drawer/close', async (req, res) => {
  try {
    const cashierId = req.user.id;
    const result = await cashierSessionController.closeCashierSessionWithDrawer(
      cashierId,
      req.body
    );
    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// ✅ NOUVEAU : GESTION PANIER
router.post('/cart/update', cashierSessionController.updateCart.bind(cashierSessionController));
router.get('/cart/status', cashierSessionController.getCartStatus.bind(cashierSessionController));

// ✅ ADMINISTRATION (optionnel - pour superviser)
router.get(
  '/sessions/active',
  cashierSessionController.getActiveSessions.bind(cashierSessionController)
);

module.exports = router;
