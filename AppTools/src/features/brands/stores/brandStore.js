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

// Nouveau store de préférences pour les tables de marques avec la factory améliorée
const { usePreferences: useBrandTablePreferences } = createTablePreferencesStore({
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
      expandedCategories: {},
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

export { useBrandStore, useBrandTablePreferences };

export function useBrandExtras() {
  const { syncBrand } = useBrandBase();
  return {
    ...useBrand(),
    syncBrand,
  };
}
