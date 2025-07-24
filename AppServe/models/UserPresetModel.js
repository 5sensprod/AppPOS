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

  // Supprimer un preset avec vérification permissions
  async deleteUserPreset(presetId, userId, isAdmin = false) {
    const preset = await this.findById(presetId);
    if (!preset) return false;

    if (!isAdmin && preset.user_id !== userId) {
      throw new Error('Non autorisé à supprimer ce preset');
    }

    return this.delete(presetId);
  }
}

module.exports = UserPresetModel;
