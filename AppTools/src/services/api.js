// src/services/api.js
import axios from 'axios';
import apiConfigService from './apiConfig';

class ApiService {
  constructor() {
    this.api = axios.create();
    this.isInitialized = false;
  }

  // Initialise le service API
  async init() {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await apiConfigService.init();
        this.isInitialized = true;
        console.log('Service API initialisé avec succès');
        return true;
      } catch (error) {
        attempts++;
        console.warn(`Tentative ${attempts}/${maxAttempts} échouée`);

        if (attempts >= maxAttempts) {
          throw error;
        }

        // Attendre avant réessai
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Vérifie si le service est initialisé
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Le service API doit être initialisé avant utilisation');
    }
  }

  // Méthode GET
  async get(url, config = {}) {
    this.ensureInitialized();

    let fullUrl;
    try {
      fullUrl = apiConfigService.createUrl(url);
    } catch (error) {
      console.warn('Erreur avec createUrl:', error);
      fullUrl = url;
    }

    console.log(`Requête GET vers: ${fullUrl}`);
    return this.api.get(fullUrl, config);
  }

  // Méthode POST
  async post(url, data, config = {}) {
    this.ensureInitialized();
    const fullUrl = apiConfigService.createUrl(url);
    return this.api.post(fullUrl, data, config);
  }

  // Méthode PUT
  async put(url, data, config = {}) {
    this.ensureInitialized();
    const fullUrl = apiConfigService.createUrl(url);
    return this.api.put(fullUrl, data, config);
  }

  // Méthode DELETE
  async delete(url, config = {}) {
    this.ensureInitialized();
    const fullUrl = apiConfigService.createUrl(url);
    return this.api.delete(fullUrl, config);
  }

  // Définit le token d'authentification pour les requêtes futures
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Vérifie la connectivité API
  async testConnection() {
    try {
      const response = await this.get('/test');
      return response.data;
    } catch (error) {
      console.error('Test de connexion échoué:', error);
      throw error;
    }
  }

  getBaseUrl() {
    return apiConfigService.getBaseUrl();
  }
}

// Exporte une instance unique du service
const apiService = new ApiService();
export default apiService;
