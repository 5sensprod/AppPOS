import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createCacheReducers } from '../../../utils/createCacheReducers';
import { withCacheSupport } from '../../../utils/withCacheSupport';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as BRAND_CONFIG } from '../constants';

// ✅ REDUCERS GÉNÉRIQUES - Plus de duplication !
const customReducers = createCacheReducers('brand');

// ✅ ACTIONS GÉNÉRIQUES
const customActions = {
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Store avec factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore({
  ...BRAND_CONFIG,
  customActions,
  customReducers,
  initialState: {
    ...BRAND_CONFIG.initialState,
    lastFetched: null,
    lastUpdated: null,
  },
});

// ✅ STORE WEBSOCKET SIMPLIFIÉ avec méthodes génériques
export const useBrandDataStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'brands.updated',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_UPDATE', payload: data.data || data });
      },
    },
    {
      event: 'brands.created',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_CREATE', payload: data.data || data });
      },
    },
    {
      event: 'brands.deleted',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_DELETE', payload: data });
      },
    },
  ],
  // ✅ MÉTHODES CACHE GÉNÉRIQUES - Plus de duplication !
  customMethods: withCacheSupport('brand', '/api/brands', (set, get) => ({
    // Méthodes spécifiques aux marques ici si besoin
    fetchBrandsWithParams: async (params = {}) => {
      // Fetch avec paramètres (bypass cache)
      try {
        set({ loading: true, error: null });
        const { page = 1, limit = 100, sort = 'name', order = 'asc', ...filters } = params;

        const queryParams = new URLSearchParams({ page, limit, sort, order, ...filters });
        const response = await apiService.get(`/api/brands?${queryParams.toString()}`);

        const brands = response.data.data || response.data;
        set({ brands, loading: false, error: null });
        return brands;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
  })),
});

// ✅ WRAPPER SIMPLIFIÉ
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    initWebSocketListeners: () => {
      const wsStore = useBrandDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les marques');
      return cleanup;
    },
    fetchBrands: async (params = {}) => {
      const wsStore = useBrandDataStore.getState();
      if (Object.keys(params).length > 0) {
        return wsStore.fetchBrandsWithParams(params);
      }
      return wsStore.fetchBrands(false);
    },
  };
}

export { useBrandStore };

export function useBrandExtras() {
  return {
    ...useBrand(),
    // Méthodes spécifiques si besoin
  };
}
