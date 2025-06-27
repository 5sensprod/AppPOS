// src/features/categories/stores/categoryStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as CATEGORY_CONFIG } from '../constants';

// Actions personnalisées
const customActions = {
  SYNC_CATEGORY: 'SYNC_CATEGORY',
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Reducers personnalisés
const customReducers = {
  SYNC_CATEGORY: (state, action) => ({
    ...state,
    items: state.items.map((item) =>
      item._id === action.payload.id ? { ...item, ...action.payload.data } : item
    ),
    loading: false,
    lastUpdated: Date.now(),
  }),
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
    console.log('🔄 WebSocket: Mise à jour catégorie reçue', action.payload);
    return {
      ...state,
      categories: state.categories.map((category) =>
        category._id === action.payload._id ? { ...category, ...action.payload } : category
      ),
      lastUpdated: Date.now(),
    };
  },
  WEBSOCKET_CREATE: (state, action) => {
    console.log('🆕 WebSocket: Nouvelle catégorie reçue', action.payload);
    const existingIndex = state.categories.findIndex((c) => c._id === action.payload._id);
    if (existingIndex >= 0) {
      return {
        ...state,
        categories: state.categories.map((category) =>
          category._id === action.payload._id ? { ...category, ...action.payload } : category
        ),
        lastUpdated: Date.now(),
      };
    } else {
      return {
        ...state,
        categories: [...state.categories, action.payload],
        lastUpdated: Date.now(),
      };
    }
  },
  WEBSOCKET_DELETE: (state, action) => {
    console.log('🗑️ WebSocket: Suppression catégorie reçue', action.payload);
    const categoryId = action.payload.entityId || action.payload.id || action.payload;
    return {
      ...state,
      categories: state.categories.filter((category) => category._id !== categoryId),
      lastUpdated: Date.now(),
    };
  },
};

// Configuration cache (3 minutes pour les catégories - plus stable que les produits)
const CACHE_DURATION = 3 * 60 * 1000;

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } = createEntityStore({
  ...CATEGORY_CONFIG,
  customActions,
  customReducers,
  initialState: {
    ...CATEGORY_CONFIG.initialState,
    lastFetched: null,
    lastUpdated: null,
  },
});

// Store WebSocket avec cache
export const useCategoryDataStore = createWebSocketStore({
  entityName: 'category',
  apiEndpoint: '/api/categories',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => (data) => {
        console.log('[CATEGORIES] Événement tree.changed reçu', data);
        get().clearCache();
        setTimeout(() => {
          get().fetchCategories(true);
        }, 500);
      },
    },
    {
      event: 'categories.updated',
      handler: (get) => (data) => {
        console.log('[CATEGORIES] WebSocket: Catégorie mise à jour', data);
        get().dispatch?.({
          type: 'WEBSOCKET_UPDATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'categories.created',
      handler: (get) => (data) => {
        console.log('[CATEGORIES] WebSocket: Nouvelle catégorie créée', data);
        get().dispatch?.({
          type: 'WEBSOCKET_CREATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'categories.deleted',
      handler: (get) => (data) => {
        console.log('[CATEGORIES] WebSocket: Catégorie supprimée', data);
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
        console.warn(`[CATEGORIES] Action non trouvée: ${action.type}`);
      }
    },

    fetchCategories: async (forceRefresh = false) => {
      const state = get();
      const now = Date.now();

      // Vérifier cache
      if (
        !forceRefresh &&
        state.categories?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 Utilisation du cache des catégories');
        return state.categories;
      }

      try {
        set({ loading: true, error: null });
        console.log("🔄 Fetch des catégories depuis l'API...");

        const response = await apiService.get('/api/categories');
        const categories = response.data.data || [];

        set({
          categories,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ ${categories.length} catégories chargées et mises en cache`);
        return categories;
      } catch (error) {
        console.error('❌ Erreur lors du fetch des catégories:', error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    refreshCategories: async () => {
      console.log('🔄 Refresh forcé des catégories...');
      return get().fetchCategories(true);
    },

    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < CACHE_DURATION;
    },

    clearCache: () => {
      console.log('🗑️ Cache des catégories nettoyé');
      set({
        categories: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    invalidateCache: () => {
      console.log('❌ Cache des catégories invalidé');
      set({
        lastFetched: null,
      });
    },
  }),
});

// Wrapper useCategory avec WebSocket intégré
export function useCategory() {
  const categoryStore = useCategoryBase();
  const store = useCategoryStore();

  const syncCategory = async (categoryId) => {
    console.log(`🔄 Synchronisation de la catégorie #${categoryId}`);
    store.dispatch({ type: 'FETCH_START' });

    try {
      const response = await apiService.post(`/api/categories/${categoryId}/sync`);
      console.log(`✅ Catégorie synchronisée avec succès:`, response.data);

      store.dispatch({
        type: customActions.SYNC_CATEGORY,
        payload: { id: categoryId, data: response.data.data || {} },
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation de la catégorie #${categoryId}:`, error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...categoryStore,
    syncCategory,
    initWebSocketListeners: () => {
      const wsStore = useCategoryDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les catégories');
      return cleanup;
    },
  };
}

export { useCategoryStore };

export function useCategoryExtras() {
  const store = useCategoryStore();
  const { syncCategory } = useCategory();

  return {
    ...useCategory(),
    syncCategory,
  };
}
