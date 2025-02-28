// src/services/apiConfig.js
import axios from 'axios';

// Classe pour gérer la configuration de l'API dynamiquement
class ApiConfigService {
  constructor() {
    this.apiBaseUrl = '';
    this.isInitialized = false;
    this.initPromise = null;
  }

  // Initialise la connexion à l'API
  init() {
    // Si déjà initialisé ou en cours d'initialisation, retourne la promesse existante
    if (this.initPromise) {
      return this.initPromise;
    }

    // Crée une nouvelle promesse d'initialisation
    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        // Essaie d'abord avec le proxy Vite (pour le développement)
        await this._discoverApiThroughProxy()
          .then(() => {
            console.log('API découverte via proxy Vite');
            this.isInitialized = true;
            resolve(this.apiBaseUrl);
          })
          .catch(async (err) => {
            console.warn('Échec de découverte via proxy, tentative directe...', err);

            // Si le proxy échoue, essaie une connexion directe
            try {
              await this._discoverApiDirect();
              console.log('API découverte directement');
              this.isInitialized = true;
              resolve(this.apiBaseUrl);
            } catch (directErr) {
              // Si tout échoue, utilise une valeur par défaut
              console.warn(
                'Échec de découverte directe, utilisation de la valeur par défaut',
                directErr
              );
              this.apiBaseUrl = 'http://localhost:3000';
              this.isInitialized = true;
              resolve(this.apiBaseUrl);
            }
          });
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'API:", error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  // Découvre l'API à travers le proxy Vite
  async _discoverApiThroughProxy() {
    try {
      // Utilise le chemin relatif qui sera géré par le proxy Vite
      const response = await axios.get('/api/server-info', { timeout: 3000 });
      if (response.data && response.data.url) {
        // Stocke l'URL complète pour les appels directs si nécessaire
        this._setApiInfo(response.data);
        // Mais pour les appels via proxy, on continue d'utiliser les chemins relatifs
        this.apiBaseUrl = '';
        return true;
      }
      throw new Error('Format de réponse invalide');
    } catch (error) {
      console.warn('Erreur lors de la découverte via proxy:', error.message);
      throw error;
    }
  }

  // Tente de découvrir l'API directement (sans proxy)
  async _discoverApiDirect() {
    // Liste des adresses IP potentielles à essayer
    const potentialHosts = this._getPotentialHosts();

    for (const host of potentialHosts) {
      try {
        console.log(`Tentative de connexion à ${host}`);
        const response = await axios.get(`${host}/api/server-info`, { timeout: 1000 });
        if (response.data && response.data.url) {
          this._setApiInfo(response.data);
          return true;
        }
      } catch (error) {
        // Continue avec l'hôte suivant
        console.debug(`Échec pour ${host}:`, error.message);
      }
    }

    throw new Error("Impossible de découvrir l'API directement");
  }

  // Génère une liste d'adresses IP potentielles à essayer
  _getPotentialHosts() {
    const hosts = ['http://localhost:3000'];

    // Ajoute d'autres ports potentiels
    for (let port = 3001; port <= 3050; port++) {
      hosts.push(`http://localhost:${port}`);
    }

    return hosts;
  }

  // Définit les informations de l'API
  _setApiInfo(data) {
    this.apiBaseUrl = data.url;
    this.apiIp = data.ip;
    this.apiPort = data.port;
    console.log(`API configurée à ${this.apiBaseUrl}`);
  }

  // Obtient l'URL de base de l'API
  getBaseUrl() {
    if (!this.isInitialized) {
      console.warn("getBaseUrl appelé avant l'initialisation de l'API");
    }
    return this.apiBaseUrl;
  }

  // Crée une URL complète pour l'API
  createUrl(path) {
    const base = this.getBaseUrl();
    // Si base est vide, on est en mode proxy, donc on retourne juste le chemin
    return base ? `${base}${path}` : path;
  }
}

// Exporte une instance unique du service
const apiConfigService = new ApiConfigService();
export default apiConfigService;
