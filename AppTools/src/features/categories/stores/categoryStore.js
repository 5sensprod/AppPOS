// src/features/categories/stores/categoryStore.js
import { useCategoryHierarchyStore } from './categoryHierarchyStore';
import { createEntityStore } from '../../../factories/createEntityStore';
import { createEntityPreferencesStore } from '../../../factories/createEntityPreferencesStore';
import { ENTITY_CONFIG } from '../constants';

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

// Créer les stores de préférences avec la nouvelle factory
const {
  useTablePreferences: useCategoryTablePreferences,
  useDetailPreferences: useCategoryDetailPreferences,
  useFormPreferences: useCategoryFormPreferences,
  useGlobalPreferences: useCategoryGlobalPreferences,
} = createEntityPreferencesStore({
  entityType: 'category',
  defaultPreferences: {
    table: {
      pagination: {
        currentPage: 1,
        pageSize: ENTITY_CONFIG.defaultPageSize || 5,
      },
      search: {
        term: '',
        activeFilters: {},
      },
      sort: {
        ...ENTITY_CONFIG.defaultSort,
      },
      selection: {
        focusedItemId: null,
        selectedItems: [],
      },
    },
    detail: {
      activeTab: 'info',
      scrollPosition: 0,
      expandedSections: {},
      // Structure spécifique aux catégories pour mémoriser l'état développé/réduit de l'arborescence
      expandedCategories: {},
      lastViewedItems: [],
    },
    form: {
      lastValues: {},
      expandedSections: {},
      activeStep: 0,
      // Champs spécifiques aux formulaires de catégories
      selectedParentId: null,
      selectedImageTab: 'upload',
    },
    global: {
      viewMode: 'list',
      // Préférence spécifique pour l'affichage hiérarchique des catégories
      hierarchicalView: true,
    },
  },
});

// Export des hooks avec la nouvelle structure
export {
  useCategory,
  useCategoryStore,
  useCategoryTablePreferences,
  useCategoryDetailPreferences,
  useCategoryFormPreferences,
  useCategoryGlobalPreferences,
};

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
