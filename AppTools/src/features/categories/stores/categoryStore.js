// src/features/categories/stores/categoryStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { useHierarchicalCategories } from './categoryHierarchyStore';

// Configuration de l'entité Category
const CATEGORY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  imagesEnabled: true,
};

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } =
  createEntityStore(CATEGORY_CONFIG);

// Store Zustand dédié pour la gestion des catégories avec WebSocket
export const useCategoryDataStore = createWebSocketStore({
  entityName: 'category',
  apiEndpoint: '/api/categories',
  apiService,
  fetchMethodName: 'fetchCategories', // Spécifier explicitement le nom
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

// Étendre useCategory sans utiliser createWebSocketRedirection
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
  const {
    hierarchicalCategories,
    loading: hierarchicalLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  return {
    ...categoryStore,
    // État et méthodes du store hiérarchique
    hierarchicalCategories,
    hierarchicalLoading,
    getHierarchicalCategories: fetchHierarchicalCategories,
  };
}
