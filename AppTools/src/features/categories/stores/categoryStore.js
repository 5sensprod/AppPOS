// src/features/categories/stores/categoryStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { useHierarchicalCategories } from './categoryHierarchyStore';
import { ENTITY_CONFIG as CATEGORY_CONFIG } from '../constants';

// Actions personnalisées spécifiques aux catégories
const customActions = {
  SYNC_CATEGORY: 'SYNC_CATEGORY',
};

// Reducers personnalisés spécifiques aux catégories
const customReducers = {
  SYNC_CATEGORY: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, ...action.payload.data } : item
      ),
      loading: false,
    };
  },
};

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } = createEntityStore({
  ...CATEGORY_CONFIG,
  customActions,
  customReducers,
});

// Store Zustand dédié pour la gestion des catégories avec WebSocket
export const useCategoryDataStore = createWebSocketStore({
  entityName: CATEGORY_CONFIG.entityName,
  apiEndpoint: CATEGORY_CONFIG.apiEndpoint,
  apiService,
  fetchMethodName: 'fetchCategories',
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => () => {
        console.log('[CATEGORY] Événement categories.tree.changed reçu');
        get().fetchCategories();
      },
    },
  ],
});

// Fonction explicite de synchronisation
const syncCategory = async (categoryId) => {
  console.log(`🔄 Synchronisation de la catégorie #${categoryId}`);

  try {
    // Appel API explicite pour synchroniser
    const response = await apiService.post(`/api/categories/${categoryId}/sync`);
    console.log(`✅ Catégorie synchronisée avec succès:`, response.data);

    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors de la synchronisation de la catégorie #${categoryId}:`, error);
    throw error;
  }
};

// Étendre useCategory
export function useCategory() {
  const categoryStore = useCategoryBase();
  const store = useCategoryStore();

  return {
    ...categoryStore,
    // Ajout de la fonction de synchronisation
    syncCategory: async (categoryId) => {
      store.dispatch({ type: 'FETCH_START' });

      try {
        const response = await syncCategory(categoryId);

        // Mettre à jour le store avec les données reçues
        store.dispatch({
          type: customActions.SYNC_CATEGORY,
          payload: { id: categoryId, data: response.data || {} },
        });

        return response;
      } catch (error) {
        store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
        throw error;
      }
    },
    // Utiliser directement les méthodes du store WebSocket
    initWebSocketListeners: () => {
      const cleanup = useCategoryDataStore.getState().initWebSocket();
      return cleanup;
    },
  };
}

// Réexporter useCategoryStore pour maintenir la compatibilité
export { useCategoryStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const categoryStore = useCategory();
  return {
    ...categoryStore,
    hierarchicalCategories: categoryStore.hierarchicalItems,
    hierarchicalLoading: categoryStore.hierarchicalLoading,
    getHierarchicalCategories: categoryStore.fetchHierarchicalItems,
  };
}
