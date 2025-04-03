// src/features/categories/stores/categoryStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { useHierarchicalCategories } from './categoryHierarchyStore';
import { ENTITY_CONFIG as CATEGORY_CONFIG } from '../constants';

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } =
  createEntityStore(CATEGORY_CONFIG);

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

// Étendre useCategory
export function useCategory() {
  const categoryStore = useCategoryBase();
  return {
    ...categoryStore,
    // Utiliser directement les méthodes du store WebSocket au lieu de la redirection
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
