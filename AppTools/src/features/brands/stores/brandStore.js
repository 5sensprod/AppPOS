import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as BRAND_CONFIG } from '../constants';

// Créer le store avec la factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

// Store Zustand dédié pour la gestion des marques avec WebSocket
export const useBrandDataStore = createWebSocketStore({
  entityName: BRAND_CONFIG.entityName,
  apiEndpoint: BRAND_CONFIG.apiEndpoint,
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Étendre useBrand
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    initWebSocketListeners: () => {
      const cleanup = useBrandDataStore.getState().initWebSocket();
      return cleanup;
    },
    fetchBrands: async (params = {}) => {
      try {
        const { page = 1, limit = 100, sort = 'name', order = 'asc', ...filters } = params;

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

export function useBrandExtras() {
  const { syncBrand } = useBrandBase();

  return {
    ...useBrand(),
    syncBrand,
    // D'autres méthodes spécifiques peuvent être ajoutées ici
  };
}
