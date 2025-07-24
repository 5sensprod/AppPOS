// AppServe/models/LabelPresetModel.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class LabelPresetModel extends BaseModel {
  constructor() {
    super(db.label_presets);
  }

  getDefaultValues() {
    return {
      created_at: new Date(),
      updated_at: new Date(),
      is_public: true,
      version: 1,
    };
  }

  // Récupérer tous les presets publics
  async findPublic() {
    return this.promisifyCall(this.collection.find, { is_public: true });
  }

  // Récupérer les presets d'un utilisateur spécifique
  async findByUser(userId) {
    return this.promisifyCall(this.collection.find, {
      $or: [{ is_public: true }, { user_id: userId }],
    });
  }

  // Créer ou mettre à jour un preset
  async upsert(data) {
    const existing = await this.promisifyCall(this.collection.findOne, {
      name: data.name,
      user_id: data.user_id || null,
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

  // Supprimer un preset (seulement si propriétaire ou admin)
  async deleteUserPreset(presetId, userId, isAdmin = false) {
    const preset = await this.findById(presetId);
    if (!preset) return false;

    // Vérifier les permissions
    if (!isAdmin && preset.user_id !== userId) {
      throw new Error('Non autorisé à supprimer ce preset');
    }

    return this.delete(presetId);
  }
}

module.exports = LabelPresetModel;
