// src/features/brands/stores/brandStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le store avec la factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

// Store Zustand dédié pour la gestion des marques avec WebSocket
export const useBrandDataStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Étendre useBrand sans utiliser createWebSocketRedirection
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    // Utiliser directement les méthodes du store WebSocket au lieu de la redirection
    initWebSocketListeners: () => {
      const cleanup = useBrandDataStore.getState().initWebSocket();
      return cleanup;
    },
  };
}

// Réexporter useBrandStore pour maintenir la compatibilité
export { useBrandStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux marques
export function useBrandExtras() {
  const { syncBrand } = useBrandBase();

  return {
    ...useBrand(),
    syncBrand,
    // Vous pouvez ajouter ici d'autres fonctionnalités spécifiques aux marques si besoin
  };
}
