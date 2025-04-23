// src/features/categories/stores/categoryHierarchyStore.js
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';

// Configuration spécifique pour le store hiérarchique
const HIERARCHY_CONFIG = {
  entityName: 'categoryHierarchy',
  apiEndpoint: '/api/categories/hierarchical',
  syncEnabled: false,
  imagesEnabled: false,
};

// Créer un store personnalisé avec une meilleure gestion des écouteurs WebSocket
const useCategoryHierarchyStore = create((set, get) => {
  return {
    items: [],
    loading: false,
    error: null,
    listenersInitialized: false,

    fetchItems: async () => {
      set({ loading: true, error: null });
      try {
        const response = await apiService.get(HIERARCHY_CONFIG.apiEndpoint);
        set({
          items: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        return response.data.data;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    initWebSocketListeners: () => {
      if (get().listenersInitialized) {
        return get().cleanup;
      }

      websocketService.subscribe('categories');

      const handleTreeChanged = (data) => {
        get().fetchItems();
      };

      const handleCreated = (data) => {
        get().fetchItems();
      };

      const handleUpdated = (data) => {
        get().fetchItems();
      };

      const handleDeleted = (data) => {
        get().fetchItems();
      };

      websocketService.on('categories.tree.changed', handleTreeChanged);
      websocketService.on('categories.created', handleCreated);
      websocketService.on('categories.updated', handleUpdated);
      websocketService.on('categories.deleted', handleDeleted);

      const handleReconnect = () => {
        websocketService.subscribe('categories');
      };

      websocketService.on('connect', handleReconnect);

      set({ listenersInitialized: true });

      const cleanup = () => {
        websocketService.off('categories.tree.changed', handleTreeChanged);
        websocketService.off('categories.created', handleCreated);
        websocketService.off('categories.updated', handleUpdated);
        websocketService.off('categories.deleted', handleDeleted);
        websocketService.off('connect', handleReconnect);
        set({ listenersInitialized: false });
      };

      set({
        eventHandlers: {
          treeChanged: handleTreeChanged,
          created: handleCreated,
          updated: handleUpdated,
          deleted: handleDeleted,
          reconnect: handleReconnect,
        },
        cleanup: cleanup,
      });

      return cleanup;
    },

    cleanup: () => {},

    debugListeners: () => {
      const events = [
        'categories.tree.changed',
        'categories.created',
        'categories.updated',
        'categories.deleted',
      ];
      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
      });
    },
  };
});

export function useHierarchicalCategories() {
  const store = useCategoryHierarchyStore();

  return {
    hierarchicalCategories: store.items,
    loading: store.loading,
    error: store.error,
    fetchHierarchicalCategories: store.fetchItems,
    initWebSocketListeners: store.initWebSocketListeners,
    debugListeners: store.debugListeners,
  };
}

export { useCategoryHierarchyStore };
