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

// Étendre useBrand
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    // Utiliser directement les méthodes du store WebSocket au lieu de la redirection
    initWebSocketListeners: () => {
      const cleanup = useBrandDataStore.getState().initWebSocket();
      return cleanup;
    },
    // Ajouter la méthode pour récupérer toutes les marques
    fetchBrands: async (params = {}) => {
      try {
        const { page = 1, limit = 100, sort = 'name', order = 'asc', ...filters } = params;

        // Construction de l'URL avec les paramètres
        const queryParams = new URLSearchParams({
          page,
          limit,
          sort,
          order,
          ...filters,
        });

        const url = `${BRAND_CONFIG.apiEndpoint}?${queryParams.toString()}`;
        const response = await apiService.get(url);

        return {
          success: true,
          data: response.data.data || response.data,
          total: response.data.total,
          page: response.data.page,
          totalPages: response.data.totalPages,
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des marques:', error);
        return {
          success: false,
          error: error.message,
          data: [],
        };
      }
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
