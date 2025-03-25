// src/factories/createEntityTableStore.js
import { createEntityStore } from './createEntityStore';
import { createWebSocketStore } from './createWebSocketStore';
import { createWebSocketRedirection } from './createWebSocketRedirection';
import { createTablePreferencesStore } from './createTablePreferencesStore';
import apiService from '../services/api';

/**
 * Factory pour créer un store complet d'entité avec préférences de table
 *
 * @param {Object} config - Configuration du store
 * @param {string} config.entityName - Nom de l'entité (ex: 'product', 'brand')
 * @param {string} config.apiEndpoint - Point d'API pour cette entité
 * @param {boolean} config.syncEnabled - Activer la synchronisation
 * @param {boolean} config.imagesEnabled - Activer la gestion des images
 * @param {boolean} config.hierarchicalEnabled - Activer la structure hiérarchique
 * @param {number} config.cacheDuration - Durée du cache en ms
 * @param {Object} config.defaultTablePreferences - Préférences de table par défaut
 * @param {Object} config.customActions - Actions personnalisées pour le store
 * @param {Object} config.customReducers - Reducers personnalisés pour le store
 * @param {Array} config.additionalWebSocketChannels - Canaux WebSocket supplémentaires
 * @param {Array} config.additionalWebSocketEvents - Événements WebSocket supplémentaires
 * @returns {Object} - Object contenant tous les hooks nécessaires pour l'entité
 */
export function createEntityTableStore(config) {
  const {
    entityName,
    apiEndpoint,
    syncEnabled = true,
    imagesEnabled = true,
    hierarchicalEnabled = false,
    cacheDuration = 5 * 60 * 1000,
    defaultTablePreferences = null,
    customActions = {},
    customReducers = {},
    additionalWebSocketChannels = [],
    additionalWebSocketEvents = [],
    ...otherOptions
  } = config;

  // Configuration standard pour l'entité
  const ENTITY_CONFIG = {
    entityName,
    apiEndpoint,
    syncEnabled,
    imagesEnabled,
    cacheDuration,
    hierarchicalEnabled,
    customActions,
    customReducers,
    ...otherOptions,
  };

  // Créer le store de base avec la factory existante
  const { [`use${capitalize(entityName)}`]: useEntityBase, useEntityStore } =
    createEntityStore(ENTITY_CONFIG);

  // Créer le store WebSocket avec la factory existante
  const useEntityDataStore = createWebSocketStore({
    entityName,
    apiEndpoint,
    apiService,
    additionalChannels: additionalWebSocketChannels,
    additionalEvents: additionalWebSocketEvents,
  });

  // Alias pour compatibilité avec le code existant
  const useEntityHierarchyStore = useEntityDataStore;

  // Préférences par défaut pour les tables
  const DEFAULT_PREFERENCES = {
    pagination: {
      currentPage: 1,
      pageSize: defaultTablePreferences?.pageSize || 10,
    },
    search: {
      term: '',
      activeFilters: {},
    },
    sort: {
      field: defaultTablePreferences?.sort?.field || 'name',
      direction: defaultTablePreferences?.sort?.direction || 'asc',
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

  // Créer le store de préférences pour les tables
  const useEntityTablePreferencesStore = createTablePreferencesStore({
    entityType: entityName,
    defaultPreferences: DEFAULT_PREFERENCES,
  });

  // Hook principal pour l'entité avec WebSocket
  function useEntity() {
    const entityStore = useEntityBase();
    return {
      ...entityStore,
      initWebSocketListeners: createWebSocketRedirection(entityName, useEntityDataStore),
    };
  }

  // Hook pour les fonctions supplémentaires
  function useEntityExtras() {
    const { [`sync${capitalize(entityName)}`]: syncEntity } = useEntityBase();

    return {
      ...useEntity(),
      syncEntity,
    };
  }

  // Hook pour les préférences de table
  function useEntityTablePreferences() {
    const tablePreferences = useEntityTablePreferencesStore();

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

  // Renvoyer tous les hooks dans un objet
  return {
    [`use${capitalize(entityName)}`]: useEntity,
    useEntityStore,
    [`use${capitalize(entityName)}DataStore`]: useEntityDataStore, // Export pour compatibilité
    [`use${capitalize(entityName)}HierarchyStore`]: useEntityHierarchyStore, // Export pour compatibilité
    [`use${capitalize(entityName)}Extras`]: useEntityExtras,
    [`use${capitalize(entityName)}TablePreferences`]: useEntityTablePreferences,
    [`use${capitalize(entityName)}TablePreferencesStore`]: useEntityTablePreferencesStore,
  };
}

// Utilitaire pour mettre en majuscule la première lettre
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
