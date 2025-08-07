// AppServer/controllers/UserPresetController.js
const BaseController = require('./base/BaseController');
const UserPresetModel = require('../models/UserPresetModel');
const ResponseHandler = require('../handlers/ResponseHandler');

class UserPresetController extends BaseController {
  constructor() {
    super(new UserPresetModel());
  }

  // GET /api/presets/:category/public - Presets publics par catégorie
  async getPublicPresets(req, res) {
    try {
      const { category } = req.params;
      const filters = this.extractFilters(req.query);

      let presets;
      if (Object.keys(filters).length > 0) {
        presets = await this.model.findWithFilters(category, filters);
      } else {
        presets = await this.model.findByCategory(category);
      }

      return ResponseHandler.success(res, presets);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // GET /api/presets/:category/my - Presets utilisateur par catégorie
  async getMyPresets(req, res) {
    try {
      const { category } = req.params;
      const userId = req.user?.id;
      const filters = this.extractFilters(req.query);

      let presets;
      if (Object.keys(filters).length > 0) {
        presets = await this.model.findWithFilters(category, filters, userId);
      } else {
        presets = await this.model.findByCategoryAndUser(category, userId);
      }

      return ResponseHandler.success(res, presets);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // POST /api/presets/:category - Créer/modifier preset
  async createOrUpdatePreset(req, res) {
    try {
      const { category } = req.params;
      const { name, preset_data, is_public = false, metadata = {} } = req.body;

      if (!name || !preset_data) {
        return ResponseHandler.badRequest(res, 'Nom et données requis');
      }

      // Seule catégorie autorisée maintenant
      if (category !== 'label_preset') {
        return ResponseHandler.badRequest(res, 'Catégorie non autorisée');
      }

      const presetData = {
        category,
        name: name.trim(),
        preset_data,
        is_public,
        user_id: req.user?.id || null,
        metadata,
        is_factory: false,
      };

      const preset = await this.model.upsert(presetData);
      return ResponseHandler.success(res, preset);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // DELETE /api/presets/:category/:id - Supprimer preset
  async deletePreset(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const result = await this.model.deleteUserPreset(id, userId, isAdmin);

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

  // GET /api/presets/categories - Liste des catégories disponibles
  async getCategories(req, res) {
    try {
      const categories = [
        {
          id: 'label_preset', // ← Unifié !
          name: "Presets d'étiquettes",
          description: 'Configuration complète (style + layout)',
        },
      ];

      return ResponseHandler.success(res, categories);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Utilitaire pour extraire les filtres des query params
  extractFilters(queryParams) {
    const allowedFilters = ['support_type', 'version'];
    const filters = {};

    allowedFilters.forEach((filter) => {
      if (queryParams[filter]) {
        filters[`metadata.${filter}`] = queryParams[filter];
      }
    });

    return filters;
  }
}

module.exports = UserPresetController;
