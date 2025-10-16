// AppServer/models/UserPresetModel.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class UserPresetModel extends BaseModel {
  constructor() {
    super(db.user_presets);
  }

  getDefaultValues() {
    return {
      created_at: new Date(),
      updated_at: new Date(),
      is_public: true,
      version: 1,
      is_factory: false, // 🆕 Par défaut, pas un preset d'usine
    };
  }

  // Récupérer presets par catégorie (publics)
  async findByCategory(category) {
    return this.promisifyCall(this.collection.find, {
      category,
      is_public: true,
    });
  }

  // Récupérer presets par catégorie pour un utilisateur
  async findByCategoryAndUser(category, userId) {
    return this.promisifyCall(this.collection.find, {
      category,
      $or: [{ is_public: true }, { user_id: userId }],
    });
  }

  // Récupérer avec filtres optionnels (ex: support_type pour print_layout)
  async findWithFilters(category, filters = {}, userId = null) {
    const query = {
      category,
      ...filters,
      $or: [{ is_public: true }, ...(userId ? [{ user_id: userId }] : [])],
    };
    return this.promisifyCall(this.collection.find, query);
  }

  // Créer ou mettre à jour un preset
  async upsert(data) {
    const { category, name, user_id } = data;

    const existing = await this.promisifyCall(this.collection.findOne, {
      category,
      name: name.trim(),
      user_id: user_id || null,
    });

    if (existing) {
      const updateData = {
        ...data,
        updated_at: new Date(),
        version: (existing.version || 1) + 1,
      };
      await this.update(existing._id, updateData);
      return this.findById(existing._id);
    } else {
      return this.create(data);
    }
  }

  // 🔄 MODIFIÉ : Supprimer un preset utilisateur (personnel uniquement)
  async deleteUserPreset(presetId, userId, isAdmin = false) {
    const preset = await this.findById(presetId);

    if (!preset) {
      return false;
    }

    // 🛡️ Vérifier que ce n'est pas un preset d'usine
    if (preset.is_factory) {
      throw new Error('Non autorisé à supprimer ce preset');
    }

    // 🛡️ Si admin, peut supprimer n'importe quel preset (sauf factory)
    if (isAdmin) {
      return this.delete(presetId);
    }

    // 🛡️ Sinon, vérifier que l'utilisateur est le propriétaire
    const presetUserId = preset.user_id?.toString() || preset.user_id;
    const currentUserId = userId?.toString() || userId;

    if (presetUserId !== currentUserId) {
      throw new Error('Non autorisé à supprimer ce preset');
    }

    return this.delete(presetId);
  }

  // 🆕 NOUVEAU : Supprimer un preset public (avec vérifications spécifiques)
  async deletePublicPreset(presetId, userId, isAdmin = false) {
    const preset = await this.findById(presetId);

    if (!preset) {
      return false;
    }

    // 🛡️ Vérifier que c'est bien un preset public
    if (!preset.is_public) {
      throw new Error("Ce preset n'est pas public");
    }

    // 🛡️ Vérifier que ce n'est pas un preset d'usine
    if (preset.is_factory) {
      throw new Error("Non autorisé à supprimer un preset d'usine");
    }

    // 🛡️ Si admin, peut supprimer
    if (isAdmin) {
      return this.delete(presetId);
    }

    // 🛡️ Sinon, vérifier que l'utilisateur est le créateur
    const presetUserId = preset.user_id?.toString() || preset.user_id;
    const currentUserId = userId?.toString() || userId;

    if (presetUserId !== currentUserId) {
      throw new Error('Non autorisé à supprimer ce preset public');
    }

    return this.delete(presetId);
  }

  // 🆕 NOUVEAU : Supprimer par ID sans vérification (utilisé après contrôle)
  async deleteById(presetId) {
    return this.delete(presetId);
  }
}

module.exports = UserPresetModel;
