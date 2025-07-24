// AppTools/src/services/userPresetService.js
import apiService from './api';

class UserPresetService {
  constructor() {
    this.baseUrl = '/api/presets';
  }

  // 📋 RÉCUPÉRER les catégories disponibles
  async getCategories() {
    try {
      const response = await apiService.get(`${this.baseUrl}/categories`);
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération catégories:', error);
      return [];
    }
  }

  // 📥 RÉCUPÉRER les presets publics par catégorie
  async getPublicPresets(category, filters = {}) {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const url = `${this.baseUrl}/${category}/public${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get(url);
      console.log(`🔍 Response ${category} publics:`, response);

      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`⚠️ Erreur récupération presets ${category} publics:`, error);
      return [];
    }
  }

  // 📥 RÉCUPÉRER mes presets par catégorie
  async getMyPresets(category, filters = {}) {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const url = `${this.baseUrl}/${category}/my${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get(url);
      console.log(`🔍 Response mes ${category}:`, response);

      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`⚠️ Erreur récupération mes presets ${category}:`, error);
      return [];
    }
  }

  // 💾 SAUVEGARDER un preset
  async savePreset(category, name, presetData, isPublic = false, metadata = {}) {
    try {
      const response = await apiService.post(`${this.baseUrl}/${category}`, {
        name: name.trim(),
        preset_data: presetData,
        is_public: isPublic,
        metadata,
      });

      console.log(`✅ Preset ${category} sauvegardé:`, response.data);
      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde preset ${category}:`, error);
      throw error;
    }
  }

  // 🗑️ SUPPRIMER un preset
  async deletePreset(category, presetId) {
    try {
      await apiService.delete(`${this.baseUrl}/${category}/${presetId}`);
      console.log(`✅ Preset ${category} supprimé:`, presetId);
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression preset ${category}:`, error);
      throw error;
    }
  }

  // 📄 CHARGER un preset spécifique
  async loadPreset(category, presetId, presets = null) {
    try {
      if (presets) {
        return presets.find((p) => p._id === presetId) || null;
      }

      const allPresets = await this.getMyPresets(category);
      return allPresets.find((p) => p._id === presetId) || null;
    } catch (error) {
      console.error(`❌ Erreur chargement preset ${category}:`, error);
      return null;
    }
  }

  // 🔄 RAFRAÎCHIR la liste complète par catégorie
  async refreshPresets(category, filters = {}) {
    try {
      const [publicPresets, myPresets] = await Promise.all([
        this.getPublicPresets(category, filters),
        this.getMyPresets(category, filters),
      ]);

      console.log(`🔍 ${category} récupérés:`, {
        public: publicPresets,
        my: myPresets,
        filters,
      });

      const safePublicPresets = Array.isArray(publicPresets) ? publicPresets : [];
      const safeMyPresets = Array.isArray(myPresets) ? myPresets : [];

      // Fusionner en évitant les doublons
      const allPresets = [...safeMyPresets];
      safePublicPresets.forEach((publicPreset) => {
        if (!allPresets.find((p) => p._id === publicPreset._id)) {
          allPresets.push(publicPreset);
        }
      });

      console.log(`✅ ${category} fusionnés:`, allPresets);
      return allPresets;
    } catch (error) {
      console.error(`❌ Erreur rafraîchissement presets ${category}:`, error);
      return [];
    }
  }
}

export default new UserPresetService();
