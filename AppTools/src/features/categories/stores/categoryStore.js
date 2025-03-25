// src/features/categories/stores/categoryStore.js
import apiService from '../../../services/api';
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
  // Intégration directe avec le WebSocket
  webSocketIntegration: {
    storeHook: useCategoryHierarchyStore,
  },
};

// Créer le store avec la factory améliorée
const { useCategory, useEntityStore: useCategoryStore } = createEntityStore(CATEGORY_CONFIG);

// Export du hook principal sans passer par une fonction intermédiaire
export { useCategory, useCategoryStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const categoryStore = useCategory();
  const hierarchyStore = useCategoryHierarchyStore();

  return {
    ...categoryStore,
    // Utiliser directement la fonction du store hierarchique
    getHierarchicalCategories: hierarchyStore.fetchHierarchicalCategories,
    // État du store hierarchique
    hierarchicalCategories: hierarchyStore.hierarchicalCategories,
    hierarchicalLoading: hierarchyStore.loading,
  };
}
