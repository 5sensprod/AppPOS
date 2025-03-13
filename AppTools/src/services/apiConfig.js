// src/services/apiConfig.js
import axios from 'axios';

class ApiConfigService {
  constructor() {
    this.apiBaseUrl = null;
  }

  async init() {
    if (this.apiBaseUrl) return this.apiBaseUrl;

    // 1️⃣ Découverte via mDNS
    try {
      const apiInfo = await window.electronAPI.discoverApiServer();
      console.log('✅ API découverte via mDNS:', apiInfo.url);
      return (this.apiBaseUrl = apiInfo.url);
    } catch {
      console.warn('⚠️ Échec de la découverte mDNS, tentative de connexion directe...');
    }

    // 2️⃣ Tentative de connexion directe sur le même hôte
    const directApiUrl = `http://${window.location.hostname}:3000`;
    try {
      const { data } = await axios.get(`${directApiUrl}/api/server-info`, { timeout: 2000 });
      return (this.apiBaseUrl = data.url || directApiUrl);
    } catch {
      console.warn('⚠️ Connexion directe échouée, tentative via proxy...');
    }

    // 3️⃣ Fallback via proxy
    try {
      const { data } = await axios.get('/api/server-info');
      return (this.apiBaseUrl = data.url || '');
    } catch (error) {
      console.error('🚫 Impossible de récupérer l’URL de l’API:', error);
      throw error;
    }
  }

  getBaseUrl() {
    return this.apiBaseUrl || '';
  }

  createUrl(path) {
    return this.apiBaseUrl ? `${this.apiBaseUrl}${path}` : path;
  }
}

export default new ApiConfigService();
