// AppServer/controllers/LabelPresetController.js
const BaseController = require('./base/BaseController');
const LabelPresetModel = require('../models/LabelPresetModel');
const ResponseHandler = require('../handlers/ResponseHandler');

class LabelPresetController extends BaseController {
  constructor() {
    super(new LabelPresetModel());
  }

  // GET /api/presets/labels - Presets publics (pas d'auth)
  async getPublicPresets(req, res) {
    try {
      const presets = await this.model.findPublic();
      return ResponseHandler.success(res, presets);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // GET /api/presets/labels/my - Presets utilisateur (auth requise)
  async getMyPresets(req, res) {
    try {
      const userId = req.user?.id;
      const presets = await this.model.findByUser(userId);
      return ResponseHandler.success(res, presets);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // POST /api/presets/labels - Créer/modifier preset
  async createOrUpdatePreset(req, res) {
    try {
      const { name, config_data, is_public = false } = req.body;

      if (!name || !config_data) {
        return ResponseHandler.badRequest(res, 'Nom et configuration requis');
      }

      const presetData = {
        name: name.trim(),
        config_data,
        is_public,
        user_id: req.user?.id || null,
      };

      const preset = await this.model.upsert(presetData);
      return ResponseHandler.success(res, preset);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // DELETE /api/presets/labels/:id - Supprimer preset
  async deletePreset(req, res) {
    try {
      const presetId = req.params.id;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const result = await this.model.deleteUserPreset(presetId, userId, isAdmin);

      if (!result) {
        return ResponseHandler.notFound(res, 'Preset non trouvé');
      }

      return ResponseHandler.success(res, { message: 'Preset supprimé' });
    } catch (error) {
      if (error.message === 'Non autorisé à supprimer ce preset') {
        return ResponseHandler.forbidden(res, error.message);
      }
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = LabelPresetController;
