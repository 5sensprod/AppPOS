// src/factories/createTablePreferencesStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Factory pour créer un store de préférences de table avec persistance
 *
 * @param {Object} config - Configuration du store
 * @param {string} config.entityType - Type d'entité (ex: 'product', 'supplier')
 * @param {Object} config.defaultPreferences - Préférences par défaut
 * @returns {Function} - Hook Zustand pour accéder au store
 */
export const createTablePreferencesStore = ({
  entityType,
  defaultPreferences = {
    pagination: {
      currentPage: 1,
      pageSize: 10,
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
  },
}) => {
  // Nom unique pour le stockage persistant
  const storeName = `entity-table-preferences-${entityType}`;

  // Middleware pour auto-effacer le focus
  const createAutoUnfocusMiddleware = (config) => (set, get, api) => {
    const state = config(set, get, api);
    return {
      ...state,
      setSelection: (selection) => {
        // Appliquer les changements immédiatement
        set((state) => ({ selection: { ...state.selection, ...selection } }));

        // Si un élément est focalisé, programmer son effacement après 1.5 secondes
        if (selection.focusedItemId) {
          setTimeout(() => {
            set((state) => ({
              selection: {
                ...state.selection,
                focusedItemId: null,
              },
            }));
          }, 1500);
        }
      },
    };
  };

  return create(
    persist(
      createAutoUnfocusMiddleware((set) => ({
        // État initial avec les préférences par défaut
        ...defaultPreferences,

        // Actions pour mettre à jour les préférences
        setPagination: (pagination) =>
          set((state) => ({ pagination: { ...state.pagination, ...pagination } })),

        setSearch: (search) => set((state) => ({ search: { ...state.search, ...search } })),

        setSort: (sort) => set((state) => ({ sort: { ...state.sort, ...sort } })),

        // setSelection est maintenant géré par le middleware

        setDetail: (detail) => set((state) => ({ detail: { ...state.detail, ...detail } })),

        // Réinitialiser toutes les préférences
        resetPreferences: () => set(defaultPreferences),

        // Réinitialiser une section spécifique
        resetSection: (section) => set((state) => ({ [section]: defaultPreferences[section] })),
      })),
      {
        name: storeName,
        // Vous pouvez personnaliser le stockage ici (localStorage par défaut)
        // storage: createJSONStorage(() => sessionStorage),
      }
    )
  );
};

/**
 * Hook pour utiliser les préférences de table
 *
 * @param {Function} usePreferencesStore - Hook du store de préférences
 * @returns {Object} - Préférences et actions
 */
export const useTablePreferences = (usePreferencesStore) => {
  const preferences = usePreferencesStore();

  return {
    // Préférences
    pagination: preferences.pagination,
    search: preferences.search,
    sort: preferences.sort,
    selection: preferences.selection,
    detail: preferences.detail,

    // Actions
    setPagination: preferences.setPagination,
    setSearch: preferences.setSearch,
    setSort: preferences.setSort,
    setSelection: preferences.setSelection,
    setDetail: preferences.setDetail,
    resetPreferences: preferences.resetPreferences,
    resetSection: preferences.resetSection,
  };
};
