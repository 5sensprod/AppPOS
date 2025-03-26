// src/features/categories/stores/categoryStore.js
import { useCategoryHierarchyStore, useHierarchicalCategories } from './categoryHierarchyStore';
import { createEntityStore } from '../../../factories/createEntityStore';

// Configuration de l'entité Category
const CATEGORY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  imagesEnabled: true,
  // Pas besoin de hierarchicalEnabled puisque nous avons un store séparé
  // Integration avec le store hiérarchique via webSocketIntegration
  webSocketIntegration: {
    storeHook: useCategoryHierarchyStore,
  },
};

// Créer le store avec la factory
const { useCategory: useCategoryBase, useEntityStore: useCategoryStore } =
  createEntityStore(CATEGORY_CONFIG);

// Export du hook principal
export function useCategory() {
  return useCategoryBase();
}

// Réexporter useCategoryStore pour maintenir la compatibilité
export { useCategoryStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const categoryStore = useCategory();
  const {
    hierarchicalCategories,
    loading: hierarchicalLoading,
    fetchHierarchicalCategories: getHierarchicalCategories,
  } = useHierarchicalCategories();

  return {
    ...categoryStore,
    // État et méthodes du store hiérarchique
    hierarchicalCategories,
    hierarchicalLoading,
    getHierarchicalCategories,
  };
}
