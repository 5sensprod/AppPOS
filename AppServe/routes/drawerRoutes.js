// AppServe/routes/drawerRoutes.js
const express = require('express');
const router = express.Router();
const drawerController = require('../controllers/drawerController');

// Note: authMiddleware est appliqué au niveau de server.js
// donc ces routes sont déjà protégées

// Routes fond de caisse
router.post('/movement', drawerController.addMovement);
router.get('/status', drawerController.getStatus);
router.get('/movements', drawerController.getMovements);
router.post('/close', drawerController.closeDrawer);
router.get('/history', drawerController.getHistory);
router.get('/daily-report', drawerController.getDailyReport);

module.exports = router;
