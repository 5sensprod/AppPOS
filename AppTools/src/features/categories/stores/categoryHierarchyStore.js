import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

const useCategoryHierarchyStore = createWebSocketStore({
  entityName: 'categoryHierarchy',
  apiEndpoint: '/api/categories/hierarchical',
  dataPropertyName: 'items',
  fetchMethodName: 'fetchHierarchicalCategories',
  apiService,
  additionalChannels: ['categories'],
  additionalEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => () => {
        console.log('🌳 [HIERARCHY] Tree changed → invalidation');
        get().invalidateCache();
        get().fetchHierarchicalCategories(true); // force refetch
      },
    },
    {
      event: 'categories.created',
      handler: (get) => () => {
        console.log('🆕 [HIERARCHY] Category created → invalidation');
        get().invalidateCache();
        get().fetchHierarchicalCategories(true);
      },
    },
    {
      event: 'categories.updated',
      handler: (get) => () => {
        console.log('📝 [HIERARCHY] Category updated → invalidation');
        get().invalidateCache();
        get().fetchHierarchicalCategories(true);
      },
    },
    {
      event: 'categories.deleted',
      handler: (get) => () => {
        console.log('🗑️ [HIERARCHY] Category deleted → invalidation');
        get().invalidateCache();
        get().fetchHierarchicalCategories(true);
      },
    },
  ],
  customMethods: (set, get) => ({
    fetchHierarchicalCategories: async (forceRefresh = false) => {
      const state = get();
      const now = Date.now();

      if (
        !forceRefresh &&
        state.items?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 [HIERARCHY] Utilisation du cache');
        return state.items;
      }

      try {
        console.log('🔄 [HIERARCHY] Fetch des catégories hiérarchiques...');
        set({ loading: true, error: null });

        const res = await apiService.get('/api/categories/hierarchical');
        const data = res.data.data || [];

        set({
          items: data,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ [HIERARCHY] ${data.length} catégories hiérarchiques chargées`);
        return data;
      } catch (err) {
        console.error('❌ [HIERARCHY] Erreur fetch:', err);
        set({
          loading: false,
          error: err.message || 'Erreur de chargement',
        });
        throw err;
      }
    },

    clearCache: () => {
      console.log('🗑️ [HIERARCHY] Cache nettoyé');
      set({
        items: [],
        lastFetched: null,
      });
    },

    invalidateCache: () => {
      console.log('❌ [HIERARCHY] Cache invalidé');
      set({
        lastFetched: null,
      });
    },

    debugListeners: () => {
      console.log('🔍 [HIERARCHY] WebSocket listeners actifs');
      return get().listenersInitialized;
    },
  }),
});

// ✅ WRAPPER SIMPLIFIÉ - API identique à l'ancienne version
export function useHierarchicalCategories() {
  const store = useCategoryHierarchyStore();

  return {
    hierarchicalCategories: store.items,
    loading: store.loading,
    error: store.error,
    fetchHierarchicalCategories: store.fetchHierarchicalCategories,
    initWebSocketListeners: store.initWebSocket,
    debugListeners: store.debugListeners,
    clearCache: store.clearCache,
  };
}

export { useCategoryHierarchyStore };
