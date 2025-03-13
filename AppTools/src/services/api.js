// src/services/api.js
import axios from 'axios';
import apiConfigService from './apiConfig';

class ApiService {
  constructor() {
    this.api = axios.create();
  }

  // Initialise le service API avec 3 tentatives max
  async init(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await apiConfigService.init();
        console.log('✅ Service API initialisé');
        return true;
      } catch (error) {
        console.warn(`⚠️ Tentative ${attempt}/${retries} échouée`);
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Génère l'URL complète et exécute la requête HTTP
  async request(method, url, data = null, config = {}) {
    try {
      const fullUrl = apiConfigService.createUrl(url);
      console.log(`🔄 Requête ${method.toUpperCase()} vers: ${fullUrl}`);
      return this.api[method](fullUrl, data, config);
    } catch (error) {
      console.error(`❌ Erreur sur la requête ${method.toUpperCase()} ${url}:`, error);
      throw error;
    }
  }

  get(url, config = {}) {
    return this.request('get', url, null, config);
  }

  post(url, data, config = {}) {
    return this.request('post', url, data, config);
  }

  put(url, data, config = {}) {
    return this.request('put', url, data, config);
  }

  delete(url, config = {}) {
    return this.request('delete', url, null, config);
  }

  // Définit le token d'authentification pour toutes les requêtes
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  async testConnection() {
    try {
      return (await this.get('/test')).data;
    } catch (error) {
      console.error('🚫 Test de connexion échoué:', error);
      throw error;
    }
  }

  getBaseUrl() {
    return apiConfigService.getBaseUrl();
  }
}

// Exporter une instance unique
export default new ApiService();
