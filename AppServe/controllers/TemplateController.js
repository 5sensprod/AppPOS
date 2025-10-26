// AppServer/controllers/TemplateController.js
const BaseController = require('./base/BaseController');
const UserPresetModel = require('../models/UserPresetModel');
const ResponseHandler = require('../handlers/ResponseHandler');
const fs = require('fs').promises;
const path = require('path');
const pathManager = require('../utils/PathManager');

/**
 * 🎨 Contrôleur dédié aux templates de labels
 * Réutilise UserPresetModel mais avec logique spécifique templates
 * - Gestion des thumbnails (base64 → fichier)
 * - Catégorie fixe: 'label_template'
 * - Support factory templates
 */
class TemplateController extends BaseController {
  constructor() {
    super(new UserPresetModel());
    this.TEMPLATE_CATEGORY = 'label_template';
    this.thumbnailsDir = pathManager.getPublicPath('templates/thumbnails');
    this.initThumbnailsDirectory();
  }

  /**
   * 📁 Initialise le répertoire des thumbnails
   */
  async initThumbnailsDirectory() {
    try {
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      console.log('✅ [TEMPLATES] Répertoire thumbnails initialisé:', this.thumbnailsDir);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur création répertoire thumbnails:', error);
    }
  }

  /**
   * 📸 Sauvegarde un thumbnail base64 en fichier
   * @returns {string} URL publique du thumbnail
   */
  async saveThumbnail(base64Data, templateId) {
    try {
      if (!base64Data || !base64Data.startsWith('data:image')) {
        return null;
      }

      // Extraire les données base64
      const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        console.warn('⚠️ [TEMPLATES] Format base64 invalide');
        return null;
      }

      const extension = matches[1];
      const imageData = matches[2];
      const filename = `${templateId}.${extension}`;
      const filepath = path.join(this.thumbnailsDir, filename);

      // Sauvegarder le fichier
      await fs.writeFile(filepath, Buffer.from(imageData, 'base64'));

      // Retourner l'URL publique
      const publicUrl = `/public/templates/thumbnails/${filename}`;
      console.log('✅ [TEMPLATES] Thumbnail sauvegardé:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur sauvegarde thumbnail:', error);
      return null;
    }
  }

  /**
   * 🗑️ Supprime un thumbnail
   */
  async deleteThumbnail(thumbnailUrl) {
    try {
      if (!thumbnailUrl || !thumbnailUrl.includes('/templates/thumbnails/')) {
        return;
      }

      const filename = path.basename(thumbnailUrl);
      const filepath = path.join(this.thumbnailsDir, filename);

      await fs.unlink(filepath);
      console.log('✅ [TEMPLATES] Thumbnail supprimé:', filename);
    } catch (error) {
      // Ignorer si le fichier n'existe pas
      if (error.code !== 'ENOENT') {
        console.error('❌ [TEMPLATES] Erreur suppression thumbnail:', error);
      }
    }
  }

  /**
   * 📋 GET /api/templates - Liste tous les templates (factory + user + public)
   */
  async getAllTemplates(req, res) {
    try {
      const userId = req.user?.id;
      const filters = this.extractFilters(req.query);

      // Récupérer les factory templates
      const factoryTemplates = await this.getFactoryTemplates();

      // Récupérer les templates utilisateur
      let userTemplates;
      if (Object.keys(filters).length > 0) {
        userTemplates = await this.model.findWithFilters(this.TEMPLATE_CATEGORY, filters, userId);
      } else {
        userTemplates = userId
          ? await this.model.findByCategoryAndUser(this.TEMPLATE_CATEGORY, userId)
          : await this.model.findByCategory(this.TEMPLATE_CATEGORY);
      }

      // Fusionner sans doublons
      const allTemplates = [...factoryTemplates];
      userTemplates.forEach((template) => {
        if (!allTemplates.find((t) => t._id === template._id)) {
          allTemplates.push(template);
        }
      });

      return ResponseHandler.success(res, allTemplates);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 🏭 Récupère les factory templates
   */
  async getFactoryTemplates() {
    try {
      const filePath = path.join(__dirname, '../presets/factoryTemplates.json');
      const factoryData = await fs.readFile(filePath, 'utf8');
      const factoryTemplates = JSON.parse(factoryData);

      return factoryTemplates.map((template) => ({
        ...template,
        _id: template.id,
        category: this.TEMPLATE_CATEGORY,
        is_factory: true,
        readonly: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      }));
    } catch (error) {
      console.warn('⚠️ [TEMPLATES] Aucun factory template trouvé');
      return [];
    }
  }

  /**
   * 📋 GET /api/templates/my - Mes templates uniquement
   */
  async getMyTemplates(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.unauthorized(res, 'Authentification requise');
      }

      const filters = this.extractFilters(req.query);

      let templates;
      if (Object.keys(filters).length > 0) {
        templates = await this.model.findWithFilters(
          this.TEMPLATE_CATEGORY,
          { ...filters, user_id: userId },
          userId
        );
      } else {
        templates = await this.model.findByCategoryAndUser(this.TEMPLATE_CATEGORY, userId);
      }

      // Ne retourner que les templates de l'utilisateur (pas les publics)
      const myTemplates = templates.filter((t) => t.user_id === userId);

      return ResponseHandler.success(res, myTemplates);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 📋 GET /api/templates/public - Templates publics uniquement
   */
  async getPublicTemplates(req, res) {
    try {
      const filters = this.extractFilters(req.query);

      let templates;
      if (Object.keys(filters).length > 0) {
        templates = await this.model.findWithFilters(this.TEMPLATE_CATEGORY, filters);
      } else {
        templates = await this.model.findByCategory(this.TEMPLATE_CATEGORY);
      }

      return ResponseHandler.success(res, templates);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 💾 POST /api/templates - Créer/modifier un template
   */
  async saveTemplate(req, res) {
    try {
      const userId = req.user?.id;
      const {
        name,
        description = '',
        category = 'custom',
        tags = [],
        thumbnail = null,
        is_public = false,
        // Données du template
        elements = [],
        canvasSize = { width: 800, height: 600 },
        sheetSettings = null,
        lockCanvasToSheetCell = false,
        dataSource = 'blank',
      } = req.body;

      if (!name || !elements) {
        return ResponseHandler.badRequest(res, 'Nom et éléments requis');
      }

      // Générer un ID unique pour le template
      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Sauvegarder le thumbnail si présent
      let thumbnailUrl = null;
      if (thumbnail) {
        thumbnailUrl = await this.saveThumbnail(thumbnail, templateId);
      }

      // Structure des données du template
      const templateData = {
        elements,
        canvasSize,
        sheetSettings,
        lockCanvasToSheetCell,
        dataSource,
      };

      // Métadonnées
      const metadata = {
        category, // custom | product | sheet
        description,
        tags: Array.isArray(tags) ? tags : [],
        thumbnail: thumbnailUrl,
      };

      // Créer le preset
      const presetData = {
        category: this.TEMPLATE_CATEGORY,
        name: name.trim(),
        preset_data: templateData,
        is_public,
        user_id: userId || null,
        metadata,
        is_factory: false,
      };

      const template = await this.model.upsert(presetData);

      return ResponseHandler.success(res, template);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur sauvegarde:', error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 🔍 GET /api/templates/:id - Récupérer un template spécifique
   */
  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await this.model.findById(id);

      if (!template) {
        return ResponseHandler.notFound(res, 'Template non trouvé');
      }

      return ResponseHandler.success(res, template);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * ✏️ PUT /api/templates/:id - Mettre à jour un template
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const existing = await this.model.findById(id);
      if (!existing) {
        return ResponseHandler.notFound(res, 'Template non trouvé');
      }

      // Vérifier les permissions
      if (!isAdmin && existing.user_id !== userId) {
        return ResponseHandler.forbidden(res, 'Non autorisé à modifier ce template');
      }

      if (existing.is_factory) {
        return ResponseHandler.forbidden(res, "Impossible de modifier un template d'usine");
      }

      const {
        name,
        description,
        category,
        tags,
        thumbnail,
        is_public,
        elements,
        canvasSize,
        sheetSettings,
        lockCanvasToSheetCell,
        dataSource,
      } = req.body;

      // Mettre à jour le thumbnail si fourni
      let thumbnailUrl = existing.metadata?.thumbnail;
      if (thumbnail && thumbnail !== thumbnailUrl) {
        // Supprimer l'ancien thumbnail
        if (thumbnailUrl) {
          await this.deleteThumbnail(thumbnailUrl);
        }
        // Sauvegarder le nouveau
        thumbnailUrl = await this.saveThumbnail(thumbnail, id);
      }

      // Construire les données mises à jour
      const templateData = {
        elements: elements || existing.preset_data.elements,
        canvasSize: canvasSize || existing.preset_data.canvasSize,
        sheetSettings:
          sheetSettings !== undefined ? sheetSettings : existing.preset_data.sheetSettings,
        lockCanvasToSheetCell:
          lockCanvasToSheetCell !== undefined
            ? lockCanvasToSheetCell
            : existing.preset_data.lockCanvasToSheetCell,
        dataSource: dataSource || existing.preset_data.dataSource,
      };

      const metadata = {
        category: category || existing.metadata?.category,
        description: description !== undefined ? description : existing.metadata?.description,
        tags: tags !== undefined ? tags : existing.metadata?.tags,
        thumbnail: thumbnailUrl,
      };

      const updateData = {
        name: name ? name.trim() : existing.name,
        preset_data: templateData,
        is_public: is_public !== undefined ? is_public : existing.is_public,
        metadata,
        updated_at: new Date(),
        version: (existing.version || 1) + 1,
      };

      await this.model.update(id, updateData);
      const updated = await this.model.findById(id);

      return ResponseHandler.success(res, updated);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur mise à jour:', error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 🗑️ DELETE /api/templates/:id - Supprimer un template
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const template = await this.model.findById(id);
      if (!template) {
        return ResponseHandler.notFound(res, 'Template non trouvé');
      }

      // Supprimer le thumbnail associé
      if (template.metadata?.thumbnail) {
        await this.deleteThumbnail(template.metadata.thumbnail);
      }

      // Utiliser la logique de suppression existante
      const result = await this.model.deleteUserPreset(id, userId, isAdmin);

      if (!result) {
        return ResponseHandler.notFound(res, 'Template non trouvé');
      }

      return ResponseHandler.success(res, { message: 'Template supprimé' });
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return ResponseHandler.forbidden(res, error.message);
      }
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 🔄 POST /api/templates/:id/duplicate - Dupliquer un template
   */
  async duplicateTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const original = await this.model.findById(id);
      if (!original) {
        return ResponseHandler.notFound(res, 'Template non trouvé');
      }

      // Générer un nouvel ID
      const newId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Dupliquer le thumbnail si présent
      let newThumbnailUrl = null;
      if (original.metadata?.thumbnail) {
        try {
          const oldFilename = path.basename(original.metadata.thumbnail);
          const oldPath = path.join(this.thumbnailsDir, oldFilename);
          const extension = path.extname(oldFilename);
          const newFilename = `${newId}${extension}`;
          const newPath = path.join(this.thumbnailsDir, newFilename);

          await fs.copyFile(oldPath, newPath);
          newThumbnailUrl = `/public/templates/thumbnails/${newFilename}`;
        } catch (error) {
          console.warn('⚠️ [TEMPLATES] Impossible de dupliquer le thumbnail');
        }
      }

      // Créer le duplicata
      const duplicateData = {
        category: this.TEMPLATE_CATEGORY,
        name: `${original.name} (copie)`,
        preset_data: { ...original.preset_data },
        is_public: false, // Par défaut privé
        user_id: userId || null,
        metadata: {
          ...original.metadata,
          thumbnail: newThumbnailUrl,
        },
        is_factory: false,
      };

      const duplicate = await this.model.create(duplicateData);

      return ResponseHandler.success(res, duplicate);
    } catch (error) {
      console.error('❌ [TEMPLATES] Erreur duplication:', error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 📊 GET /api/templates/stats - Statistiques des templates
   */
  async getStats(req, res) {
    try {
      const userId = req.user?.id;

      const allTemplates = userId
        ? await this.model.findByCategoryAndUser(this.TEMPLATE_CATEGORY, userId)
        : await this.model.findByCategory(this.TEMPLATE_CATEGORY);

      const stats = {
        total: allTemplates.length,
        byCategory: {},
        byUser: userId
          ? allTemplates.filter((t) => t.user_id === userId && !t.is_factory).length
          : 0,
        public: allTemplates.filter((t) => t.is_public && !t.is_factory).length,
        factory: allTemplates.filter((t) => t.is_factory).length,
      };

      // Compter par catégorie de template
      allTemplates.forEach((template) => {
        const cat = template.metadata?.category || 'custom';
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      });

      return ResponseHandler.success(res, stats);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * 🔧 Utilitaire pour extraire les filtres des query params
   */
  extractFilters(queryParams) {
    const allowedFilters = ['category', 'tags'];
    const filters = {};

    if (queryParams.category) {
      filters['metadata.category'] = queryParams.category;
    }

    if (queryParams.tags) {
      const tags = Array.isArray(queryParams.tags) ? queryParams.tags : queryParams.tags.split(',');
      filters['metadata.tags'] = { $in: tags };
    }

    return filters;
  }
}

module.exports = TemplateController;
