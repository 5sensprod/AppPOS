// src/services/apiConfig.js (version finale et propre)
import axios from 'axios';

class ApiConfigService {
  constructor() {
    this.apiBaseUrl = '';
    this.isInitialized = false;
    this.initPromise = null;
  }

  init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        // Priorité 1: Découverte mDNS (la meilleure option)
        const apiInfo = await window.electronAPI.discoverApiServer();
        console.log('✅ API découverte via mDNS :', apiInfo);
        this.apiBaseUrl = apiInfo.url;
        this.isInitialized = true;
        resolve(this.apiBaseUrl);
      } catch (mdnsError) {
        console.warn('⚠️ Découverte mDNS échouée, essai direct');

        // Priorité 2: Essayer directement l'API sur le même hôte que le frontend
        const currentHost = window.location.hostname;
        const apiPort = 3000;
        const directApiUrl = `http://${currentHost}:${apiPort}`;

        try {
          const response = await axios.get(`${directApiUrl}/api/server-info`, { timeout: 2000 });
          if (response.data && response.data.url) {
            this.apiBaseUrl = response.data.url;
            this.isInitialized = true;
            resolve(this.apiBaseUrl);
            return;
          }
        } catch (directError) {
          console.warn('⚠️ Connexion directe échouée');
        }

        // Priorité 3: Fallback via proxy (moins optimal)
        try {
          const response = await axios.get('/api/server-info');
          if (response.data && response.data.url) {
            this.apiBaseUrl = ''; // Utiliser le proxy
            this.isInitialized = true;
            resolve(this.apiBaseUrl);
          } else {
            reject(new Error('Impossible de récupérer URL API'));
          }
        } catch (fallbackError) {
          reject(fallbackError);
        }
      }
    });

    return this.initPromise;
  }

  getBaseUrl() {
    return this.apiBaseUrl;
  }

  createUrl(path) {
    return this.apiBaseUrl ? `${this.apiBaseUrl}${path}` : path;
  }
}

const apiConfigService = new ApiConfigService();
export default apiConfigService;
