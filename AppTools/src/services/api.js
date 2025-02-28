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
    try {
      // S'assure que la configuration API est initialisée
      await apiConfigService.init();
      this.isInitialized = true;
      console.log('Service API initialisé avec succès');
      return true;
    } catch (error) {
      console.error("Erreur lors de l'initialisation du service API:", error);
      throw error;
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
    const fullUrl = apiConfigService.createUrl(url);
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
}

// Exporte une instance unique du service
const apiService = new ApiService();
export default apiService;
