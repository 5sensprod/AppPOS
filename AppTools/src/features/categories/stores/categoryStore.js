// src/features/categories/stores/categoryStore.js
import apiService from '../../../services/api';
import { useCategoryHierarchyStore } from './categoryHierarchyStore';
import { createEntityStore } from '../../../factories/createEntityStore';
import { createTablePreferencesStore } from '../../../factories/createTablePreferencesStore';

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

// Valeurs par défaut pour les préférences de table
const DEFAULT_PREFERENCES = {
  pagination: {
    currentPage: 1,
    pageSize: 5,
  },
  search: {
    term: '',
    activeFilters: {},
  },
  sort: {
    field: 'name',
    direction: 'asc',
  },
  selection: {
    focusedItemId: null,
    selectedItems: [],
  },
  detail: {
    activeTab: 'info',
    scrollPosition: 0,
  },
};

// Créer le store de préférences pour les tables de catégories
export const useCategoryTablePreferencesStore = createTablePreferencesStore({
  entityType: 'category',
  defaultPreferences: DEFAULT_PREFERENCES,
});

// Hook pour exposer les préférences de table pour les catégories
export function useCategoryTablePreferences() {
  const tablePreferences = useCategoryTablePreferencesStore();

  return {
    preferences: {
      pagination: tablePreferences.pagination,
      search: tablePreferences.search,
      sort: tablePreferences.sort,
      selection: tablePreferences.selection,
      detail: tablePreferences.detail,
    },
    updatePreference: (section, value) => {
      switch (section) {
        case 'pagination':
          tablePreferences.setPagination(value);
          break;
        case 'search':
          tablePreferences.setSearch(value);
          break;
        case 'sort':
          tablePreferences.setSort(value);
          break;
        case 'selection':
          if (value.focusedItemId) {
            const element = document.getElementById(`row-${value.focusedItemId}`);
            if (element) {
              tablePreferences.setDetail({
                ...tablePreferences.detail,
                scrollPosition: window.scrollY,
                lastFocusedElementId: value.focusedItemId,
              });
            }
          }
          tablePreferences.setSelection(value);
          break;
        case 'detail':
          tablePreferences.setDetail(value);
          break;
        default:
          console.warn(`Section de préférences inconnue: ${section}`);
      }
    },
    resetPreferences: tablePreferences.resetPreferences,
    resetSection: tablePreferences.resetSection,
  };
}
