// src/features/suppliers/stores/supplierStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createWebSocketRedirection } from '../../../factories/createWebSocketRedirection';
import { createTablePreferencesStore } from '../../../factories/createTablePreferencesStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: true,
  imagesEnabled: false,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le store avec la factory
const { useSupplier: useSupplierBase, useEntityStore: useSupplierStore } =
  createEntityStore(SUPPLIER_CONFIG);

// Store Zustand dédié pour la gestion des fournisseurs avec WebSocket
export const useSupplierHierarchyStore = createWebSocketStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Alias pour compatibilité avec SupplierDetail.jsx
export const useSupplierDataStore = useSupplierHierarchyStore;

// Créer le store de préférences pour les tables de fournisseurs
export const useSupplierTablePreferencesStore = createTablePreferencesStore({
  entityType: 'supplier',
  defaultPreferences: {
    pagination: {
      currentPage: 1,
      pageSize: ENTITY_CONFIG.defaultPageSize || 10,
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

// Étendre useSupplier avec WebSocket (pour rétro-compatibilité)
export function useSupplier() {
  const supplierStore = useSupplierBase();

  return {
    ...supplierStore,
    initWebSocketListeners: createWebSocketRedirection('supplier', useSupplierHierarchyStore),
  };
}

// Réexporter useSupplierStore pour maintenir la compatibilité
export { useSupplierStore };

// Hook pour exposer les préférences de table pour les fournisseurs
export function useSupplierTablePreferences() {
  const tablePreferences = useSupplierTablePreferencesStore();

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
          // Sauvegarder la position de défilement actuelle
          if (value.focusedItemId) {
            // Sauvegarder la position de l'élément dans la page si nécessaire
            const element = document.getElementById(`row-${value.focusedItemId}`);
            if (element) {
              // Mettre à jour les détails avec la position de défilement
              tablePreferences.setDetail({
                ...tablePreferences.detail,
                scrollPosition: window.scrollY,
                lastFocusedElementId: value.focusedItemId,
              });
            }
          }

          tablePreferences.setSelection(value);

          // Efface automatiquement le focus après 1.5 secondes si focusedItemId est défini
          if (value.focusedItemId) {
            setTimeout(() => {
              tablePreferences.setSelection({
                ...tablePreferences.selection,
                focusedItemId: null,
              });
            }, 1500);
          }
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

// Fonction pour exposer des méthodes supplémentaires spécifiques aux fournisseurs
export function useSupplierExtras() {
  const { syncSupplier } = useSupplierBase();

  return {
    ...useSupplier(),
    syncSupplier,
    // Vous pouvez ajouter ici d'autres fonctionnalités spécifiques aux fournisseurs si besoin
  };
}
