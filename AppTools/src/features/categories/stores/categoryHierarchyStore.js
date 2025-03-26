// src/features/categories/stores/categoryHierarchyStore.js
import { createEntityStore } from '../../../factories/createEntityStore';

// Configuration spécifique pour le store hiérarchique
const HIERARCHY_CONFIG = {
  entityName: 'categoryHierarchy', // Un nom distinct pour éviter les conflits
  apiEndpoint: '/api/categories/hierarchical', // Point d'API spécifique
  syncEnabled: false, // Pas besoin de synchronisation individuelle
  imagesEnabled: false, // Pas de gestion d'images à ce niveau
  // Actions et reducers personnalisés si nécessaire
  customActions: {},
  customReducers: {},
};

// Créer le store avec la factory
const { useCategoryHierarchy, useEntityStore: useCategoryHierarchyStore } =
  createEntityStore(HIERARCHY_CONFIG);

// Exporter les hooks
export { useCategoryHierarchy, useCategoryHierarchyStore };

// Fonction utilitaire pour accéder directement aux données hiérarchiques
export function useHierarchicalCategories() {
  const {
    categoryHierarchys: hierarchicalCategories,
    loading,
    error,
    fetchCategoryHierarchys: fetchHierarchicalCategories,
    initWebSocketListeners,
  } = useCategoryHierarchy();

  return {
    hierarchicalCategories,
    loading,
    error,
    fetchHierarchicalCategories,
    initWebSocketListeners,
  };
}
