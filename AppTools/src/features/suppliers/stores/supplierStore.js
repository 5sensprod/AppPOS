// src/features/suppliers/stores/supplierStore.js
import { createEntityTableStore } from '../../../factories/createEntityTableStore';
import { ENTITY_CONFIG } from '../constants';

// Créer le store complet avec notre nouvelle factory
const {
  useSupplier,
  useEntityStore: useSupplierStore,
  useSupplierDataStore,
  useSupplierHierarchyStore,
  useSupplierExtras,
  useSupplierTablePreferences,
  useSupplierTablePreferencesStore,
} = createEntityTableStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: true,
  imagesEnabled: false,
  cacheDuration: ENTITY_CONFIG.cacheDuration || 5 * 60 * 1000,
  defaultTablePreferences: {
    pageSize: ENTITY_CONFIG.defaultPageSize || 10,
    sort: ENTITY_CONFIG.defaultSort || { field: 'name', direction: 'asc' },
  },
});

// Exporter les hooks générés par la factory
export {
  useSupplier,
  useSupplierStore,
  useSupplierDataStore,
  useSupplierHierarchyStore,
  useSupplierTablePreferences,
  useSupplierTablePreferencesStore,
};

// Pour compatibilité avec le code existant
export { useSupplierExtras };
