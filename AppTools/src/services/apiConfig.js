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
        const apiInfo = await window.electronAPI.discoverApiServer();
        console.log('✅ API découverte via mDNS :', apiInfo);
        this.apiBaseUrl = apiInfo.url;
        this.isInitialized = true;
        resolve(this.apiBaseUrl);
      } catch (mdnsError) {
        console.warn('⚠️ Découverte mDNS échouée, fallback via /api/server-info');
        try {
          const response = await axios.get('/api/server-info');
          if (response.data && response.data.url) {
            this.apiBaseUrl = response.data.url;
            this.isInitialized = true;
            resolve(this.apiBaseUrl);
          } else {
            reject(new Error('Impossible de récupérer URL API via fallback'));
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
