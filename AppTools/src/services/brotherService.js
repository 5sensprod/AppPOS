// AppTools/src/services/brotherService.js
import apiService from './api';

class BrotherService {
  // Vérifier l'état du service Brother
  async checkHealth() {
    try {
      const response = await apiService.get('/api/brother/health');
      // L'API retourne { success: true, data: { status: 'ok', ... } }
      return response.data; // Retourne directement le format API
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'error',
          error: error.message,
          bridgeAvailable: false,
        },
      };
    }
  }

  // Obtenir la liste des imprimantes
  async getPrinters() {
    try {
      const response = await apiService.get('/api/brother/printers');
      return response.data; // { success: true, data: { printers: [...], count: X } }
    } catch (error) {
      throw new Error(`Erreur chargement imprimantes: ${error.message}`);
    }
  }

  // Obtenir la liste des templates
  async getTemplates() {
    try {
      const response = await apiService.get('/api/brother/templates');
      return response.data; // { success: true, data: [...] }
    } catch (error) {
      throw new Error(`Erreur chargement templates: ${error.message}`);
    }
  }

  // Obtenir les objets d'un template
  async getTemplateObjects(templateName) {
    try {
      const response = await apiService.get(`/api/brother/templates/${templateName}/objects`);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur objets template: ${error.message}`);
    }
  }

  // Obtenir les paramètres
  async getSettings() {
    try {
      const response = await apiService.get('/api/brother/settings');
      return response.data;
    } catch (error) {
      throw new Error(`Erreur chargement paramètres: ${error.message}`);
    }
  }

  // Mettre à jour les paramètres
  async updateSettings(settings) {
    try {
      const response = await apiService.put('/api/brother/settings', settings);
      return response.data;
    } catch (error) {
      throw new Error(`Erreur sauvegarde paramètres: ${error.message}`);
    }
  }

  // Upload d'un template
  async uploadTemplate(file) {
    try {
      const formData = new FormData();
      formData.append('template', file);

      const response = await apiService.post('/api/brother/templates/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erreur upload template: ${error.message}`);
    }
  }

  // Imprimer une étiquette
  async print(template, data, options = {}) {
    try {
      const response = await apiService.post('/api/brother/print', {
        template,
        data,
        options,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erreur impression: ${error.message}`);
    }
  }

  // Générer un aperçu d'étiquette
  async generatePreview(template, data, options = {}) {
    try {
      const response = await apiService.post('/api/brother/preview', {
        template,
        data,
        options,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erreur aperçu: ${error.message}`);
    }
  }
}

export default new BrotherService();
