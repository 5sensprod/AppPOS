// apiMain.js — ajout des méthodes manquantes
const axiosLib = require('axios');

// URL de base (à configurer via variable d'env. si besoin)
const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

class ApiMainService {
  constructor() {
    // On crée une instance axios isolée
    this.api = axiosLib.create({ baseURL });
  }

  async init() {
    // rien à faire par défaut
    return true;
  }

  /**
   * Permet d'injecter le token pour toutes les requêtes suivantes
   */
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  get(path, config = {}) {
    return this.api.get(path, config);
  }

  post(path, data, config = {}) {
    return this.api.post(path, data, config);
  }

  put(path, data, config = {}) {
    return this.api.put(path, data, config);
  }

  delete(path, config = {}) {
    return this.api.delete(path, config);
  }
}

module.exports = new ApiMainService();
