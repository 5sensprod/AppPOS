import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createWebSocketRedirection } from '../../../factories/createWebSocketRedirection';
import { createTablePreferencesStore } from '../../../factories/createTablePreferencesStore';
import { createEntityPreferencesStore } from '../../../factories/createEntityPreferencesStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  imagesEnabled: true,
};

// Créer le store avec la factory
const { useSupplier: useSupplierBase, useEntityStore: useSupplierStore } =
  createEntityStore(SUPPLIER_CONFIG);

// Store Zustand dédié pour la gestion des fournisseurs avec WebSocket
export const useSupplierDataStore = createWebSocketStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Store de préférences unifié avec la nouvelle factory
const {
  useTablePreferences: useSupplierTablePreferences,
  useDetailPreferences: useSupplierDetailPreferences,
  useFormPreferences: useSupplierFormPreferences,
  useGlobalPreferences: useSupplierGlobalPreferences,
} = createEntityPreferencesStore({
  entityType: 'supplier',
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
export function useSupplier() {
  const supplierStore = useSupplierBase();
  return {
    ...supplierStore,
    initWebSocketListeners: createWebSocketRedirection('supplier', useSupplierDataStore),
  };
}

export {
  useSupplierStore,
  useSupplierTablePreferences,
  useSupplierDetailPreferences,
  useSupplierFormPreferences,
  useSupplierGlobalPreferences,
};

// Créer le store de préférences avec la nouvelle factory
// const { usePreferences: useSupplierTablePreferences } = createTablePreferencesStore({
//   entityType: 'supplier',
//   defaultPreferences: {
//     pagination: {
//       currentPage: 1,
//       pageSize: ENTITY_CONFIG.defaultPageSize || 5,
//     },
//     search: {
//       term: '',
//       activeFilters: {},
//     },
//     sort: {
//       ...ENTITY_CONFIG.defaultSort,
//     },
//     selection: {
//       focusedItemId: null,
//       selectedItems: [],
//     },
//     detail: {
//       activeTab: 'info',
//       scrollPosition: 0,
//     },
//   },
// });

// Réexporter useSupplierStore pour maintenir la compatibilité
// export { useSupplierStore, useSupplierTablePreferences };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux fournisseurs
export function useSupplierExtras() {
  return {
    ...useSupplier(),
    // Vous pouvez ajouter ici des fonctionnalités spécifiques aux fournisseurs si besoin
  };
}
