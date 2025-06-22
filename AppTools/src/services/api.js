// src/services/api.js - VERSION CORRIGÉE
import axios from 'axios';
import apiConfigService from './apiConfig';

class ApiService {
  constructor() {
    this.api = axios.create();
    this.authToken = null;
    this.logoutCallback = null;
    this.interceptorsSetup = false; // Éviter la double configuration
  }

  // Configurer le callback de déconnexion automatique
  setLogoutCallback(callback) {
    this.logoutCallback = callback;
  }

  // Initialise le service API avec 3 tentatives max
  async init(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await apiConfigService.init();

        // Configurer les intercepteurs UNE SEULE FOIS
        if (!this.interceptorsSetup) {
          this.setupInterceptors();
          this.interceptorsSetup = true;
        }

        return true;
      } catch (error) {
        console.warn(`⚠️ Tentative ${attempt}/${retries} échouée`);
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Configuration des intercepteurs (VERSION SIMPLIFIÉE)
  setupInterceptors() {
    // Intercepteur de requête
    this.api.interceptors.request.use(
      (config) => {
        // Ajouter automatiquement le token d'auth
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        console.log(`🌐 [API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ [API] Erreur de requête:', error);
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse SIMPLIFIÉ (sans redécouverte automatique)
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [API] ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // GESTION DES ERREURS 401 UNIQUEMENT
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.warn('🚨 [API] Erreur 401 - Token invalide');

          originalRequest._retry = true;

          // Nettoyer le token local
          this.clearAuthData();

          // Déclencher la déconnexion si callback configuré
          if (this.logoutCallback) {
            console.log('🚪 [API] Déclenchement de la déconnexion automatique');
            this.logoutCallback();
          }
        }

        // MARQUER LES ERREURS RÉSEAU (sans retry automatique)
        if (!error.response) {
          console.error('❌ [API] Erreur réseau - Serveur inaccessible');
          error.isNetworkError = true;
        }

        // MARQUER LES ERREURS SERVEUR
        if (error.response?.status >= 500) {
          console.error('❌ [API] Erreur serveur:', error.response.status);
          error.isServerError = true;
        }

        return Promise.reject(error);
      }
    );

    console.log('✅ [API] Intercepteurs configurés');
  }

  // Nettoyage complet des données d'auth
  clearAuthData() {
    this.authToken = null;

    // Supprimer de localStorage
    localStorage.removeItem('authToken');

    // Supprimer de sessionStorage
    sessionStorage.removeItem('authToken');

    // Nettoyer les headers Axios
    delete this.api.defaults.headers.common['Authorization'];

    // Nettoyer Electron API si disponible
    if (window.electronAPI?.setAuthToken) {
      window.electronAPI.setAuthToken(null);
    }

    console.log("🧹 [API] Données d'authentification nettoyées");
  }

  // Génère l'URL complète et exécute la requête HTTP
  async request(method, url, data = null, config = {}) {
    try {
      const fullUrl = apiConfigService.createUrl(url);
      return await this.api[method](fullUrl, data, config);
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

  // Définit le token d'authentification
  setAuthToken(token) {
    this.authToken = token;

    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("✅ [API] Token d'authentification configuré");
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  async testConnection() {
    try {
      const response = await this.get('/test');
      return {
        success: true,
        data: response.data,
        baseURL: apiConfigService.getBaseUrl(),
      };
    } catch (error) {
      console.error('🚫 Test de connexion échoué:', error);
      return {
        success: false,
        error: error.message,
        isNetworkError: error.isNetworkError,
        isServerError: error.isServerError,
        baseURL: apiConfigService.getBaseUrl(),
      };
    }
  }

  getBaseUrl() {
    return apiConfigService.getBaseUrl();
  }

  // Méthode MANUELLE pour forcer la redécouverte (pas automatique)
  async rediscoverServer() {
    try {
      console.log('🔄 [API] Redécouverte forcée du serveur...');
      apiConfigService.apiBaseUrl = null; // Reset de l'URL cachée
      await apiConfigService.init();
      return true;
    } catch (error) {
      console.error('❌ [API] Échec de la redécouverte:', error);
      return false;
    }
  }
}

// Exporter une instance unique
export default new ApiService();
