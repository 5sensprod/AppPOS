// src/features/brands/stores/brandStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createWebSocketRedirection } from '../../../factories/createWebSocketRedirection';
import { createTablePreferencesStore } from '../../../factories/createTablePreferencesStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// Configuration existante...
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000,
};

// Stores existants...
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

export const useBrandHierarchyStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Nouveau store de préférences pour les tables de marques
export const useBrandTablePreferencesStore = createTablePreferencesStore({
  entityType: 'brand',
  defaultPreferences: {
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
    detail: {
      activeTab: 'info',
      scrollPosition: 0,
    },
  },
});

// Functions existantes...
export function useBrand() {
  const brandStore = useBrandBase();
  return {
    ...brandStore,
    initWebSocketListeners: createWebSocketRedirection('brand', useBrandHierarchyStore),
  };
}

export { useBrandStore };

export function useBrandExtras() {
  const { syncBrand } = useBrandBase();
  return {
    ...useBrand(),
    syncBrand,
  };
}

// Nouveau hook pour exposer les préférences de table
export function useBrandTablePreferences() {
  const tablePreferences = useBrandTablePreferencesStore();

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
