// AppServer/routes/labelPresetRoutes.js
const express = require('express');
const LabelPresetController = require('../controllers/LabelPresetController');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();
const controller = new LabelPresetController();

// Routes publiques (pas d'auth)
router.get('/public', controller.getPublicPresets.bind(controller));

// Routes protégées (auth requise)
router.get('/my', authMiddleware, controller.getMyPresets.bind(controller));
router.post('/', authMiddleware, controller.createOrUpdatePreset.bind(controller));
router.delete('/:id', authMiddleware, controller.deletePreset.bind(controller));

module.exports = router;
