// AppServer/routes/userPresetRoutes.js
const express = require('express');
const UserPresetController = require('../controllers/UserPresetController');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();
const controller = new UserPresetController();

// Routes publiques
router.get('/categories', controller.getCategories.bind(controller));
router.get('/:category/public', controller.getPublicPresets.bind(controller));

// Routes protégées (auth requise)
router.get('/:category/my', authMiddleware, controller.getMyPresets.bind(controller));
router.post('/:category', authMiddleware, controller.createOrUpdatePreset.bind(controller));
router.delete('/:category/:id', authMiddleware, controller.deletePreset.bind(controller));

module.exports = router;
