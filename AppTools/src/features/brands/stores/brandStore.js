import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createWebSocketRedirection } from '../../../factories/createWebSocketRedirection';
import { createEntityPreferencesStore } from '../../../factories/createEntityPreferencesStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000,
};

// Créer le store avec la factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

// Store Zustand dédié pour la gestion des fournisseurs avec WebSocket
export const useBrandDataStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Store de préférences unifié avec la nouvelle factory
const {
  useTablePreferences: useBrandTablePreferences,
  useDetailPreferences: useBrandDetailPreferences,
  useFormPreferences: useBrandFormPreferences,
  useGlobalPreferences: useBrandGlobalPreferences,
} = createEntityPreferencesStore({
  entityType: 'brand',
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
      activeTab: 'general',
      scrollPosition: 0,
      expandedSections: {},
      lastViewedItems: [],
    },
    form: {
      lastValues: {},
      expandedSections: {},
      activeStep: 0,
    },
    global: {
      viewMode: 'list',
    },
  },
});

// Étendre useSupplier avec WebSocket
export function useBrand() {
  const brandStore = useBrandBase();
  return {
    ...brandStore,
    initWebSocketListeners: createWebSocketRedirection('brand', useBrandDataStore),
  };
}

export {
  useBrandStore,
  useBrandTablePreferences,
  useBrandDetailPreferences,
  useBrandFormPreferences,
  useBrandGlobalPreferences,
};

export function useBrandExtras() {
  const { syncBrand } = useBrandBase();
  return {
    ...useBrand(),
    syncBrand,
  };
}
