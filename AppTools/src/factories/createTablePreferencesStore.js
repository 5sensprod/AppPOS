// src/factories/createTablePreferencesStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Crée un store Zustand persistant pour les préférences de table
 * @param {Object} options - Options de configuration
 * @param {string} options.entityType - Type d'entité (ex: 'product', 'category')
 * @param {Object} options.defaultPreferences - Préférences par défaut
 * @returns {Function} Hook zustand pour les préférences de table
 */
export const createTablePreferencesStore = ({ entityType, defaultPreferences }) => {
  // Valider les paramètres obligatoires
  if (!entityType) throw new Error('entityType est obligatoire');
  if (!defaultPreferences) throw new Error('defaultPreferences est obligatoire');

  // Créer le store avec persistance
  const useStore = create(
    persist(
      (set) => ({
        // État par défaut
        ...defaultPreferences,

        // Actions
        setPagination: (pagination) => set({ pagination }),
        setSearch: (search) => set({ search }),
        setSort: (sort) => set({ sort }),
        setSelection: (selection) => set({ selection }),
        setDetail: (detail) => set({ detail }),
        resetPreferences: () => set(defaultPreferences),
        resetSection: (section) => {
          if (defaultPreferences[section]) {
            set({ [section]: defaultPreferences[section] });
          } else {
            console.warn(`Section inconnue: ${section}`);
          }
        },
      }),
      {
        name: `${entityType}-table-preferences`, // Nom pour le localStorage
      }
    )
  );

  /**
   * Crée et retourne le hook d'accès aux préférences avec une API simplifiée
   * pour les composants
   */
  const createPreferencesHook = () => {
    return () => {
      const tablePreferences = useStore();

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
    };
  };

  // Retourner à la fois le store de base et le hook d'accès simplifié
  return {
    useStore,
    usePreferences: createPreferencesHook(),
  };
};

export default createTablePreferencesStore;
