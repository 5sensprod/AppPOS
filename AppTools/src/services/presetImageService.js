// AppTools/src/services/presetImageService.js
import apiService from './api';

class PresetImageService {
  constructor() {
    this.baseUrl = '/api/presets/images';
  }

  /**
   * 📤 Upload une ou plusieurs images
   */
  async uploadImages(files) {
    try {
      const formData = new FormData();

      const fileArray = Array.isArray(files) ? files : [files];

      fileArray.forEach((file) => {
        formData.append('images', file);
      });

      const response = await apiService.post(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Images uploadées:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Erreur upload images:', error);
      throw error;
    }
  }

  /**
   * 📋 Récupère la liste de toutes les images
   */
  async listImages() {
    try {
      const response = await apiService.get(this.baseUrl);
      const data = response.data?.data || response.data;
      return data.images || [];
    } catch (error) {
      console.error('❌ Erreur liste images:', error);
      return [];
    }
  }

  /**
   * 🔍 Récupère les infos d'une image spécifique
   */
  async getImageInfo(filename) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${filename}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Erreur info image:', error);
      return null;
    }
  }

  /**
   * 🗑️ Supprime une image
   */
  async deleteImage(filename) {
    try {
      await apiService.delete(`${this.baseUrl}/${filename}`);
      console.log('✅ Image supprimée:', filename);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression image:', error);
      throw error;
    }
  }

  /**
   * 🧹 Nettoie les images orphelines (admin uniquement)
   */
  async cleanupOrphanImages() {
    try {
      const response = await apiService.post(`${this.baseUrl}/cleanup`);
      console.log('✅ Nettoyage effectué:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      throw error;
    }
  }

  /**
   * 🔗 Construit l'URL complète d'une image
   * ✅ Le serveur retourne déjà des URLs complètes, donc on retourne tel quel
   */
  getImageUrl(src) {
    if (!src) return null;

    // ✅ Si c'est déjà une URL complète (venant du serveur), retourner tel quel
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }

    // ⚠️ Fallback au cas où (ne devrait plus arriver)
    console.warn('⚠️ [IMAGE] Chemin relatif détecté (ancien format):', src);
    const baseUrl = apiService.getBaseUrl();

    if (!baseUrl) {
      console.warn('⚠️ API baseUrl non disponible');
      return src;
    }

    if (src.startsWith('/')) {
      return `${baseUrl}${src}`;
    }

    return `${baseUrl}/public/presets/images/${src}`;
  }
}

export default new PresetImageService();
