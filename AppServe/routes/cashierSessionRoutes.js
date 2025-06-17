// routes/cashierSessionRoutes.js - CORRIGER LE PROBLÈME D'AUTHENTIFICATION

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/auth');
const ResponseHandler = require('../handlers/ResponseHandler');
const cashierSessionController = require('../controllers/cashierSessionController');

// ✅ APPLIQUER LE MIDDLEWARE D'AUTHENTIFICATION SUR TOUTES LES ROUTES
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

// ✅ GESTION FOND DE CAISSE - CORRECTIONS
router.post('/drawer/movement', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return ResponseHandler.unauthorized(res, 'Utilisateur non authentifié');
    }

    const cashierId = req.user.id;
    const result = await cashierSessionController.addCashMovement(cashierId, req.body);
    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

router.get('/drawer/status', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return ResponseHandler.unauthorized(res, 'Utilisateur non authentifié');
    }

    const cashierId = req.user.id;
    const drawer = cashierSessionController.getCashierDrawer(cashierId);
    return ResponseHandler.success(res, { drawer });
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// ✅ CORRIGÉ : Fermeture fond de caisse avec vérification authentification
router.post('/drawer/close', async (req, res) => {
  try {
    console.log('🔍 [ROUTE] drawer/close - req.user:', req.user ? 'PRÉSENT' : 'ABSENT');
    console.log('🔍 [ROUTE] drawer/close - req.user.id:', req.user?.id);

    if (!req.user || !req.user.id) {
      console.error('❌ [ROUTE] drawer/close - Utilisateur non authentifié');
      return ResponseHandler.unauthorized(res, 'Utilisateur non authentifié');
    }

    // ✅ APPELER DIRECTEMENT LA MÉTHODE DU CONTROLLER AVEC REQ ET RES
    return await cashierSessionController.closeCashierSessionWithDrawer(req, res);
  } catch (error) {
    console.error('❌ [ROUTE] drawer/close - Erreur:', error);
    return ResponseHandler.error(res, error);
  }
});

// ✅ GESTION PANIER
router.post('/cart/update', cashierSessionController.updateCart.bind(cashierSessionController));
router.get('/cart/status', cashierSessionController.getCartStatus.bind(cashierSessionController));

// ✅ ADMINISTRATION
router.get(
  '/sessions/active',
  cashierSessionController.getActiveSessions.bind(cashierSessionController)
);

module.exports = router;
