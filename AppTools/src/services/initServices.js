// src/services/initServices.js
import apiService from './api';
import imageProxyService from './imageProxyService';
import websocketService from './websocketService';

/**
 * Initialise tous les services nécessaires au démarrage de l'application
 */
export async function initializeServices() {
  try {
    const { data } = await apiService.get('/api/server-info');
    if (!data?.url) throw new Error("L'URL de l'API est introuvable");

    // Initialiser le service d'images
    imageProxyService.initialize(data.url);

    // Initialiser WebSocket avec l'URL fournie ou générée
    websocketService.init(data.websocket ?? data.url.replace(/^http/, 'ws') + '/ws');

    console.log('✅ Services initialisés avec succès');
    return true;
  } catch (error) {
    console.error('🚫 Échec de l’initialisation des services:', error.message);
    return false;
  }
}
