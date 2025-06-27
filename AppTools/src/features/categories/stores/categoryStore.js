import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createCacheReducers } from '../../../utils/createCacheReducers';
import { withCacheSupport } from '../../../utils/withCacheSupport';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as CATEGORY_CONFIG } from '../constants';

// ✅ REDUCERS GÉNÉRIQUES + custom sync
const customReducers = {
  ...createCacheReducers('category'),
  SYNC_CATEGORY: (state, action) => ({
    ...state,
    items: state.items.map((item) =>
      item._id === action.payload.id ? { ...item, ...action.payload.data } : item
    ),
    loading: false,
    lastUpdated: Date.now(),
  }),
};

const customActions = {
  SYNC_CATEGORY: 'SYNC_CATEGORY',
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Store avec factory
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

// ✅ STORE WEBSOCKET SIMPLIFIÉ
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
        setTimeout(() => get().fetchCategories(true), 500);
      },
    },
    {
      event: 'categories.updated',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_UPDATE', payload: data.data || data });
      },
    },
    {
      event: 'categories.created',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_CREATE', payload: data.data || data });
      },
    },
    {
      event: 'categories.deleted',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_DELETE', payload: data });
      },
    },
  ],
  // ✅ MÉTHODES CACHE GÉNÉRIQUES
  customMethods: withCacheSupport('category', '/api/categories'),
});

// ✅ WRAPPER AVEC SYNC SPÉCIFIQUE
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
  const { syncCategory } = useCategory();
  return {
    ...useCategory(),
    syncCategory,
  };
}
