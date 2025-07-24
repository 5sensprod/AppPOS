// AppTools/src/services/labelPresetService.js
import apiService from './api';

class LabelPresetService {
  constructor() {
    this.baseUrl = '/api/presets/labels';
  }

  // 📥 RÉCUPÉRER les presets publics (pas d'auth)
  async getPublicPresets() {
    try {
      const response = await apiService.get(`${this.baseUrl}/public`);
      console.log('🔍 Response publics:', response);

      // Gérer la structure de réponse de ton API
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération presets publics:', error);
      return [];
    }
  }

  // 📥 RÉCUPÉRER mes presets (auth requise)
  async getMyPresets() {
    try {
      const response = await apiService.get(`${this.baseUrl}/my`);
      console.log('🔍 Response mes presets:', response);

      // Gérer la structure de réponse de ton API
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Erreur récupération mes presets:', error);
      return [];
    }
  }

  // 💾 SAUVEGARDER un preset (auth requise)
  async savePreset(name, configData, isPublic = false) {
    try {
      const response = await apiService.post(this.baseUrl, {
        name: name.trim(),
        config_data: configData,
        is_public: isPublic,
      });

      console.log('✅ Preset sauvegardé:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur sauvegarde preset:', error);
      throw error;
    }
  }

  // 🗑️ SUPPRIMER un preset (auth requise)
  async deletePreset(presetId) {
    try {
      await apiService.delete(`${this.baseUrl}/${presetId}`);
      console.log('✅ Preset supprimé:', presetId);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression preset:', error);
      throw error;
    }
  }

  // 📄 CHARGER un preset spécifique
  async loadPreset(presetId, presets = null) {
    try {
      // Si on a déjà la liste, chercher dedans
      if (presets) {
        return presets.find((p) => p._id === presetId) || null;
      }

      // Sinon récupérer tous les presets accessibles
      const allPresets = await this.getMyPresets();
      return allPresets.find((p) => p._id === presetId) || null;
    } catch (error) {
      console.error('❌ Erreur chargement preset:', error);
      return null;
    }
  }

  // 🔄 RAFRAÎCHIR la liste complète
  async refreshPresets() {
    try {
      // Récupérer les deux types en parallèle
      const [publicPresets, myPresets] = await Promise.all([
        this.getPublicPresets(),
        this.getMyPresets(),
      ]);

      console.log('🔍 Presets récupérés:', {
        public: publicPresets,
        my: myPresets,
        publicIsArray: Array.isArray(publicPresets),
        myIsArray: Array.isArray(myPresets),
      });

      // S'assurer qu'on a des tableaux
      const safePublicPresets = Array.isArray(publicPresets) ? publicPresets : [];
      const safeMyPresets = Array.isArray(myPresets) ? myPresets : [];

      // Fusionner en évitant les doublons (privilégier "my presets")
      const allPresets = [...safeMyPresets];
      safePublicPresets.forEach((publicPreset) => {
        if (!allPresets.find((p) => p._id === publicPreset._id)) {
          allPresets.push(publicPreset);
        }
      });

      console.log('✅ Presets fusionnés:', allPresets);
      return allPresets;
    } catch (error) {
      console.error('❌ Erreur rafraîchissement presets:', error);
      return [];
    }
  }
}

export default new LabelPresetService();
