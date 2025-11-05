// AppTools/src/services/templateApiService.js
import apiService from './api';

/**
 * 🎨 Service API pour les templates de labels
 * Communique avec le backend pour la persistance cloud
 */
class TemplateApiService {
  constructor() {
    this.baseUrl = '/api/templates';
  }

  /**
   * 📋 Récupère tous les templates (factory + user + public)
   */
  async listTemplates(filters = {}) {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get(url);
      console.log('📋 [TEMPLATES-API] Templates récupérés:', response);

      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ [TEMPLATES-API] Erreur listTemplates:', error);
      return [];
    }
  }

  /**
   * 📋 Récupère uniquement MES templates
   */
  async getMyTemplates(filters = {}) {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const url = `${this.baseUrl}/my${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get(url);
      console.log('📋 [TEMPLATES-API] Mes templates récupérés:', response);

      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ [TEMPLATES-API] Erreur getMyTemplates:', error);
      return [];
    }
  }

  /**
   * 📋 Récupère les templates publics uniquement
   */
  async getPublicTemplates(filters = {}) {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const url = `${this.baseUrl}/public${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get(url);
      console.log('📋 [TEMPLATES-API] Templates publics récupérés:', response);

      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ [TEMPLATES-API] Erreur getPublicTemplates:', error);
      return [];
    }
  }

  /**
   * 🔍 Récupère un template par son ID
   */
  async getTemplate(id) {
    try {
      const response = await apiService.get(`${this.baseUrl}/${id}`);
      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      // Ne pas logger les 404 (templates locaux normaux en mode hybride)
      if (error.response?.status !== 404) {
        console.error('❌ [TEMPLATES-API] Erreur getTemplate:', error);
      }
      return null;
    }
  }

  /**
   * 💾 Sauvegarde un template (création ou mise à jour)
   */
  async saveTemplate(templateData, metadata = {}) {
    try {
      const payload = {
        // Métadonnées
        name: metadata.name,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        tags: metadata.tags || [],
        thumbnail: metadata.thumbnail || null,
        is_public: metadata.is_public || false,

        // Données du template
        elements: templateData.elements || [],
        canvasSize: templateData.canvasSize || { width: 800, height: 600 },
        sheetSettings: templateData.sheetSettings || null,
        lockCanvasToSheetCell: templateData.lockCanvasToSheetCell || false,
        dataSource: templateData.dataSource || 'blank',
      };

      const response = await apiService.post(this.baseUrl, payload);
      console.log('✅ [TEMPLATES-API] Template sauvegardé:', response.data);

      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur saveTemplate:', error);
      throw error;
    }
  }

  /**
   * ✏️ Met à jour un template existant
   */
  async updateTemplate(id, templateData, metadata = {}) {
    try {
      const payload = {
        // Métadonnées (optionnelles)
        ...(metadata.name && { name: metadata.name }),
        ...(metadata.description !== undefined && { description: metadata.description }),
        ...(metadata.category && { category: metadata.category }),
        ...(metadata.tags && { tags: metadata.tags }),
        ...(metadata.thumbnail !== undefined && { thumbnail: metadata.thumbnail }),
        ...(metadata.is_public !== undefined && { is_public: metadata.is_public }),

        // Données du template (optionnelles)
        ...(templateData.elements && { elements: templateData.elements }),
        ...(templateData.canvasSize && { canvasSize: templateData.canvasSize }),
        ...(templateData.sheetSettings !== undefined && {
          sheetSettings: templateData.sheetSettings,
        }),
        ...(templateData.lockCanvasToSheetCell !== undefined && {
          lockCanvasToSheetCell: templateData.lockCanvasToSheetCell,
        }),
        ...(templateData.dataSource && { dataSource: templateData.dataSource }),
      };

      const response = await apiService.put(`${this.baseUrl}/${id}`, payload);
      console.log('✅ [TEMPLATES-API] Template mis à jour:', response.data);

      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur updateTemplate:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Supprime un template
   */
  async deleteTemplate(id) {
    try {
      await apiService.delete(`${this.baseUrl}/${id}`);
      console.log('✅ [TEMPLATES-API] Template supprimé:', id);
      return true;
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur deleteTemplate:', error);
      throw error;
    }
  }

  /**
   * 🔄 Duplique un template
   */
  async duplicateTemplate(id) {
    try {
      const response = await apiService.post(`${this.baseUrl}/${id}/duplicate`);
      console.log('✅ [TEMPLATES-API] Template dupliqué:', response.data);

      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur duplicateTemplate:', error);
      throw error;
    }
  }

  /**
   * 📊 Récupère les statistiques des templates
   */
  async getStats() {
    try {
      const response = await apiService.get(`${this.baseUrl}/stats`);
      const data = response.data?.data || response.data;
      return data;
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur getStats:', error);
      return {
        total: 0,
        byCategory: {},
        byUser: 0,
        public: 0,
        factory: 0,
      };
    }
  }

  /**
   * 🔄 Synchronise un template local vers l'API
   * Utile pour la migration IndexedDB → API
   */
  async syncLocalTemplate(localTemplate) {
    try {
      const templateData = {
        elements: localTemplate.elements,
        canvasSize: localTemplate.canvasSize,
        sheetSettings: localTemplate.sheetSettings,
        lockCanvasToSheetCell: localTemplate.lockCanvasToSheetCell,
        dataSource: localTemplate.dataSource,
      };

      const metadata = {
        name: localTemplate.name,
        description: localTemplate.description,
        category: localTemplate.category,
        tags: localTemplate.tags,
        thumbnail: localTemplate.thumbnail,
        is_public: false, // Par défaut privé lors de la sync
      };

      return await this.saveTemplate(templateData, metadata);
    } catch (error) {
      console.error('❌ [TEMPLATES-API] Erreur syncLocalTemplate:', error);
      throw error;
    }
  }
}

export default new TemplateApiService();
