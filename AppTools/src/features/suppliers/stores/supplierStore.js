import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createWebSocketRedirection } from '../../../factories/createWebSocketRedirection';
import { createTablePreferencesStore } from '../../../factories/createTablePreferencesStore';
import { ENTITY_CONFIG } from '../constants';
import apiService from '../../../services/api';

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

// Étendre useSupplier avec WebSocket (pour rétro-compatibilité)
export function useSupplier() {
  const supplierStore = useSupplierBase();
  return {
    ...supplierStore,
    initWebSocketListeners: createWebSocketRedirection('supplier', useSupplierDataStore),
  };
}

// Créer le store de préférences avec la nouvelle factory
const { usePreferences: useSupplierTablePreferences } = createTablePreferencesStore({
  entityType: 'supplier',
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

// Réexporter useSupplierStore pour maintenir la compatibilité
export { useSupplierStore, useSupplierTablePreferences };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux fournisseurs
export function useSupplierExtras() {
  return {
    ...useSupplier(),
    // Vous pouvez ajouter ici des fonctionnalités spécifiques aux fournisseurs si besoin
  };
}
