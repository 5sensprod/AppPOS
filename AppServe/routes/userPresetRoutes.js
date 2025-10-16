// AppServer/routes/userPresetRoutes.js
const express = require('express');
const UserPresetController = require('../controllers/UserPresetController');
const { authMiddleware } = require('../utils/auth');
const fs = require('fs');
const path = require('path');
const ResponseHandler = require('../handlers/ResponseHandler');

const router = express.Router();
const controller = new UserPresetController();

// Routes publiques
router.get('/categories', controller.getCategories.bind(controller));
router.get('/:category/public', controller.getPublicPresets.bind(controller));

// Routes protégées (auth requise)
router.get('/:category/my', authMiddleware, controller.getMyPresets.bind(controller));
router.post('/:category', authMiddleware, controller.createOrUpdatePreset.bind(controller));

// 🆕 NOUVEAU : Route pour supprimer un preset public
router.delete(
  '/:category/public/:id',
  authMiddleware,
  controller.deletePublicPreset.bind(controller)
);

// Route pour supprimer un preset personnel
router.delete('/:category/:id', authMiddleware, controller.deletePreset.bind(controller));

router.get('/factory', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../presets/factoryPresets.json');
    const factoryPresets = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const enrichedPresets = factoryPresets.map((preset) => ({
      ...preset,
      _id: preset.id,
      is_factory: true,
      readonly: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    }));

    return ResponseHandler.success(res, enrichedPresets);
  } catch (error) {
    return ResponseHandler.success(res, []);
  }
});

module.exports = router;
