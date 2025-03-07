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
        // Récupérer l'URL actuelle
        const currentUrl = window.location.origin;
        console.log('URL actuelle:', currentUrl);

        // Chemin d'accès aux informations du serveur
        const serverInfoPath = '/api/server-info';

        try {
          // Essaie d'abord d'utiliser le proxy intégré (accès direct à /api)
          // Important: cela fonctionnera pour les accès locaux ET distants car
          // le serveur Express est configuré pour gérer le proxy /api sur les deux
          console.log("Tentative de découverte d'API via chemin relatif:", serverInfoPath);
          const response = await axios.get(serverInfoPath, { timeout: 3000 });

          if (response.data && response.data.url) {
            console.log('API découverte via proxy:', response.data);
            this._setApiInfo(response.data);

            // Pour les appels via proxy, on utilise des chemins relatifs
            // ce qui fonctionne à la fois pour localhost et les accès réseau
            this.apiBaseUrl = '';
            this.isInitialized = true;
            resolve(this.apiBaseUrl);
            return;
          }
        } catch (proxyError) {
          console.warn('Échec de découverte API via proxy:', proxyError.message);
          // Continue avec les autres méthodes
        }

        // Si le proxy échoue, essaie la découverte par les hôtes potentiels
        // y compris l'hôte actuel (important pour les accès réseau)
        const hosts = this._getPotentialHosts();
        let discovered = false;

        // Ajouter l'hôte actuel aux tentatives (avec port de l'API)
        const currentHost = window.location.hostname;
        const apiPort = 3000;
        hosts.unshift(`http://${currentHost}:${apiPort}`);

        console.log("Tentatives de découverte d'API sur hôtes:", hosts);

        for (const host of hosts) {
          try {
            console.log(`Tentative de connexion à ${host}`);
            const response = await axios.get(`${host}/api/server-info`, { timeout: 1500 });
            if (response.data && response.data.url) {
              console.log('API découverte à:', host, response.data);
              this._setApiInfo(response.data);
              discovered = true;
              break;
            }
          } catch (error) {
            console.debug(`Échec pour ${host}:`, error.message);
          }
        }

        if (discovered) {
          this.isInitialized = true;
          resolve(this.apiBaseUrl);
        } else {
          // En dernier recours, utiliser un chemin relatif (/api)
          console.log('Utilisation du chemin relatif comme fallback');
          this.apiBaseUrl = '';
          this.isInitialized = true;
          resolve(this.apiBaseUrl);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'API:", error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  // Génère une liste d'adresses IP potentielles à essayer
  _getPotentialHosts() {
    const hosts = ['http://localhost:3000'];

    // Ajoute d'autres ports potentiels
    for (let port = 3001; port <= 3010; port++) {
      hosts.push(`http://localhost:${port}`);
    }

    // Tenter de détecter l'IP locale via le serveur Express
    // qui gère également cette application web
    const networkUrls = this._getNetworkUrlsFromElectron();
    if (networkUrls && networkUrls.length > 0) {
      for (const url of networkUrls) {
        try {
          // Extraire le hostname et reconstruire avec le port de l'API
          const hostname = new URL(url).hostname;
          hosts.push(`http://${hostname}:3000`);
        } catch (e) {
          console.warn('URL invalide:', url, e);
        }
      }
    }

    return hosts;
  }

  // Récupère les URLs réseau depuis Electron si disponible
  _getNetworkUrlsFromElectron() {
    if (window.electronAPI && window.electronAPI.webServer) {
      try {
        // Tente de récupérer les URLs réseau depuis Electron
        return window.electronAPI.webServer.getUrls && window.electronAPI.webServer.getUrls();
      } catch (e) {
        console.warn("Impossible d'obtenir les URLs réseau depuis Electron:", e);
      }
    }
    return null;
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
