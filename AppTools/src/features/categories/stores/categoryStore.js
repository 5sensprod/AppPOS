// src/features/categories/stores/categoryStore.js
import { useCategoryHierarchyStore } from './categoryHierarchyStore';
import { createEntityStore } from '../../../factories/createEntityStore';

// Configuration de l'entité Category avec options étendues
const CATEGORY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  hierarchicalEnabled: true,
  hierarchicalEndpoint: '/api/categories/hierarchical',
};

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } =
  createEntityStore(CATEGORY_CONFIG);

// Export du hook principal avec intégration directe de WebSocket
export function useCategory() {
  const categoryStore = useCategoryBase();

  return {
    ...categoryStore,
    // Utiliser directement le store hiérarchique pour initWebSocket
    initWebSocketListeners: () => {
      const cleanup = useCategoryHierarchyStore.getState().initWebSocket();
      return cleanup;
    },
  };
}

// Réexporter useCategoryStore pour maintenir la compatibilité
export { useCategoryStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const categoryStore = useCategory();
  const hierarchyStore = useCategoryHierarchyStore();

  return {
    ...categoryStore,
    // Utiliser directement la fonction du store hiérarchique
    getHierarchicalCategories: hierarchyStore.fetchHierarchicalCategories,
    // État du store hiérarchique
    hierarchicalCategories: hierarchyStore.hierarchicalCategories,
    hierarchicalLoading: hierarchyStore.loading,
  };
}
