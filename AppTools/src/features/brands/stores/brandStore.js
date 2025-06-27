import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as BRAND_CONFIG } from '../constants';

// Actions personnalisées
const customActions = {
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Reducers personnalisés
const customReducers = {
  SET_CACHE_TIMESTAMP: (state, action) => ({
    ...state,
    lastFetched: action.payload.timestamp,
  }),
  CLEAR_CACHE: (state) => ({
    ...state,
    items: [],
    lastFetched: null,
    lastUpdated: null,
  }),
  WEBSOCKET_UPDATE: (state, action) => {
    console.log('🔄 WebSocket: Mise à jour marque reçue', action.payload);
    return {
      ...state,
      brands: state.brands.map((brand) =>
        brand._id === action.payload._id ? { ...brand, ...action.payload } : brand
      ),
      lastUpdated: Date.now(),
    };
  },
  WEBSOCKET_CREATE: (state, action) => {
    console.log('🆕 WebSocket: Nouvelle marque reçue', action.payload);
    const existingIndex = state.brands.findIndex((b) => b._id === action.payload._id);
    if (existingIndex >= 0) {
      return {
        ...state,
        brands: state.brands.map((brand) =>
          brand._id === action.payload._id ? { ...brand, ...action.payload } : brand
        ),
        lastUpdated: Date.now(),
      };
    } else {
      return {
        ...state,
        brands: [...state.brands, action.payload],
        lastUpdated: Date.now(),
      };
    }
  },
  WEBSOCKET_DELETE: (state, action) => {
    console.log('🗑️ WebSocket: Suppression marque reçue', action.payload);
    const brandId = action.payload.entityId || action.payload.id || action.payload;
    return {
      ...state,
      brands: state.brands.filter((brand) => brand._id !== brandId),
      lastUpdated: Date.now(),
    };
  },
};

// Configuration cache (10 minutes pour les marques - très stable)
const CACHE_DURATION = 10 * 60 * 1000;

// Créer le store avec la factory
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

// Store WebSocket avec cache
export const useBrandDataStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'brands.updated',
      handler: (get) => (data) => {
        console.log('[BRANDS] WebSocket: Marque mise à jour', data);
        get().dispatch?.({
          type: 'WEBSOCKET_UPDATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'brands.created',
      handler: (get) => (data) => {
        console.log('[BRANDS] WebSocket: Nouvelle marque créée', data);
        get().dispatch?.({
          type: 'WEBSOCKET_CREATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'brands.deleted',
      handler: (get) => (data) => {
        console.log('[BRANDS] WebSocket: Marque supprimée', data);
        get().dispatch?.({
          type: 'WEBSOCKET_DELETE',
          payload: data,
        });
      },
    },
  ],
  customMethods: (set, get) => ({
    dispatch: (action) => {
      const state = get();
      const reducer = customReducers[action.type];
      if (reducer) {
        set(reducer(state, action));
      } else {
        console.warn(`[BRANDS] Action non trouvée: ${action.type}`);
      }
    },

    fetchBrands: async (forceRefresh = false, params = {}) => {
      const state = get();
      const now = Date.now();

      // Vérifier cache (seulement si pas de params spécifiques)
      if (
        !forceRefresh &&
        Object.keys(params).length === 0 &&
        state.brands?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 Utilisation du cache des marques');
        return state.brands;
      }

      try {
        set({ loading: true, error: null });
        console.log("🔄 Fetch des marques depuis l'API...");

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
        const brands = response.data.data || response.data;

        set({
          brands,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ ${brands.length} marques chargées et mises en cache`);
        return brands;
      } catch (error) {
        console.error('❌ Erreur lors du fetch des marques:', error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    refreshBrands: async () => {
      console.log('🔄 Refresh forcé des marques...');
      return get().fetchBrands(true);
    },

    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < CACHE_DURATION;
    },

    clearCache: () => {
      console.log('🗑️ Cache des marques nettoyé');
      set({
        brands: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    invalidateCache: () => {
      console.log('❌ Cache des marques invalidé');
      set({
        lastFetched: null,
      });
    },
  }),
});

// Wrapper useBrand avec WebSocket intégré
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
      return wsStore.fetchBrands(false, params);
    },
  };
}

export { useBrandStore };

export function useBrandExtras() {
  const { syncBrand } = useBrandBase();

  return {
    ...useBrand(),
    syncBrand,
  };
}
