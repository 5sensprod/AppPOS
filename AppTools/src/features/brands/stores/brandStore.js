// src/features/brands/stores/brandStore.js
import { createEntityTableStore } from '../../../factories/createEntityTableStore';
import { ENTITY_CONFIG } from '../constants';

// Créer le store complet avec notre nouvelle factory
const {
  useBrand,
  useEntityStore: useBrandStore,
  useBrandDataStore,
  useBrandHierarchyStore,
  useBrandExtras,
  useBrandTablePreferences,
  useBrandTablePreferencesStore,
} = createEntityTableStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: ENTITY_CONFIG.cacheDuration || 5 * 60 * 1000,
  defaultTablePreferences: {
    pageSize: ENTITY_CONFIG.defaultPageSize || 5,
    sort: ENTITY_CONFIG.defaultSort || { field: 'name', direction: 'asc' },
  },
});

// Exporter les hooks générés par la factory
export {
  useBrand,
  useBrandStore,
  useBrandDataStore,
  useBrandHierarchyStore,
  useBrandTablePreferences,
  useBrandTablePreferencesStore,
};

// Pour compatibilité avec le code existant
export { useBrandExtras };
