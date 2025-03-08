// src/services/initServices.js
import apiService from './api';
import imageProxyService from './imageProxyService';

/**
 * Initialise tous les services nécessaires au démarrage de l'application
 */
export async function initializeServices() {
  try {
    // Récupérer les informations du serveur
    const serverInfoResponse = await apiService.get('/api/server-info');

    if (serverInfoResponse && serverInfoResponse.data) {
      const { url } = serverInfoResponse.data;

      // Initialiser le service de proxy d'images avec l'URL de l'API
      imageProxyService.initialize(url);

      console.log('Services initialisés avec succès');
      return true;
    } else {
      console.error("Impossible d'obtenir les informations du serveur");
      return false;
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des services:", error);
    return false;
  }
}
