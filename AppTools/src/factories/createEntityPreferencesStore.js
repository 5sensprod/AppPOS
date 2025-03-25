// src/factories/createEntityPreferencesStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Crée un store Zustand persistant pour les préférences d'entité (table et détail)
 * @param {Object} options - Options de configuration
 * @param {string} options.entityType - Type d'entité (ex: 'product', 'category', 'brand')
 * @param {Object} options.defaultPreferences - Préférences par défaut
 * @returns {Object} Hooks zustand pour les préférences d'entité
 */
export const createEntityPreferencesStore = ({ entityType, defaultPreferences }) => {
  // Valider les paramètres obligatoires
  if (!entityType) throw new Error('entityType est obligatoire');
  if (!defaultPreferences) throw new Error('defaultPreferences est obligatoire');

  // Préparer la structure des préférences par défaut
  const fullDefaultPreferences = {
    // Table (liste)
    table: {
      pagination: {
        currentPage: 1,
        pageSize: 10,
        ...(defaultPreferences.table?.pagination || {}),
      },
      search: {
        term: '',
        activeFilters: {},
        ...(defaultPreferences.table?.search || {}),
      },
      sort: defaultPreferences.table?.sort || { field: 'name', direction: 'asc' },
      selection: {
        focusedItemId: null,
        selectedItems: [],
        ...(defaultPreferences.table?.selection || {}),
      },
    },
    // Détail (vue individuelle)
    detail: {
      activeTab: defaultPreferences.detail?.activeTab || 'general',
      scrollPosition: 0,
      expandedSections: {},
      lastViewedItems: [],
      ...(defaultPreferences.detail || {}),
    },
    // Formulaire (édition)
    form: {
      lastValues: {},
      expandedSections: {},
      activeStep: 0,
      ...(defaultPreferences.form || {}),
    },
    // Préférences globales pour ce type d'entité
    global: {
      viewMode: 'list', // 'list', 'grid', 'calendar'
      ...(defaultPreferences.global || {}),
    },
  };

  // Créer le store avec persistance
  const useStore = create(
    persist(
      (set, get) => ({
        // État initial complet
        ...fullDefaultPreferences,

        // Actions pour la table
        setTablePagination: (pagination) =>
          set((state) => ({
            table: { ...state.table, pagination },
          })),
        setTableSearch: (search) =>
          set((state) => ({
            table: { ...state.table, search },
          })),
        setTableSort: (sort) =>
          set((state) => ({
            table: { ...state.table, sort },
          })),
        setTableSelection: (selection) => {
          // Conserver la position de défilement si focusedItemId est défini
          if (selection.focusedItemId) {
            const element = document.getElementById(`row-${selection.focusedItemId}`);
            if (element) {
              set((state) => ({
                table: {
                  ...state.table,
                  selection,
                },
                detail: {
                  ...state.detail,
                  scrollPosition: window.scrollY,
                  lastFocusedElementId: selection.focusedItemId,
                },
              }));
              return;
            }
          }

          set((state) => ({
            table: { ...state.table, selection },
          }));
        },

        // Actions pour le détail
        setDetailActiveTab: (activeTab) =>
          set((state) => ({
            detail: { ...state.detail, activeTab },
          })),
        setDetailScrollPosition: (scrollPosition) =>
          set((state) => ({
            detail: { ...state.detail, scrollPosition },
          })),
        toggleDetailSection: (sectionId) =>
          set((state) => {
            const expandedSections = { ...state.detail.expandedSections };
            expandedSections[sectionId] = !expandedSections[sectionId];
            return {
              detail: { ...state.detail, expandedSections },
            };
          }),
        addToLastViewedItems: (itemId) =>
          set((state) => {
            // Ajouter l'élément en début de liste et éviter les doublons
            const existingItems = [...state.detail.lastViewedItems];
            const updatedItems = [itemId, ...existingItems.filter((id) => id !== itemId)].slice(
              0,
              10
            ); // Limiter à 10 éléments

            return {
              detail: { ...state.detail, lastViewedItems: updatedItems },
            };
          }),

        // Actions pour le formulaire
        setFormValues: (values) =>
          set((state) => ({
            form: { ...state.form, lastValues: values },
          })),
        setFormActiveStep: (activeStep) =>
          set((state) => ({
            form: { ...state.form, activeStep },
          })),
        toggleFormSection: (sectionId) =>
          set((state) => {
            const expandedSections = { ...state.form.expandedSections };
            expandedSections[sectionId] = !expandedSections[sectionId];
            return {
              form: { ...state.form, expandedSections },
            };
          }),

        // Actions pour les préférences globales
        setGlobalViewMode: (viewMode) =>
          set((state) => ({
            global: { ...state.global, viewMode },
          })),
        setGlobalPreference: (key, value) =>
          set((state) => ({
            global: { ...state.global, [key]: value },
          })),

        // Actions génériques
        resetSection: (section) => {
          if (fullDefaultPreferences[section]) {
            set({ [section]: fullDefaultPreferences[section] });
          } else {
            console.warn(`Section inconnue: ${section}`);
          }
        },
        resetAllPreferences: () => set(fullDefaultPreferences),
      }),
      {
        name: `${entityType}-preferences`, // Nom pour le localStorage
      }
    )
  );

  /**
   * Hook pour accéder aux préférences de table
   */
  const createTablePreferencesHook = () => {
    return () => {
      const entityPreferences = useStore();

      return {
        preferences: {
          pagination: entityPreferences.table.pagination,
          search: entityPreferences.table.search,
          sort: entityPreferences.table.sort,
          selection: entityPreferences.table.selection,
        },
        updatePreference: (section, value) => {
          switch (section) {
            case 'pagination':
              entityPreferences.setTablePagination(value);
              break;
            case 'search':
              entityPreferences.setTableSearch(value);
              break;
            case 'sort':
              entityPreferences.setTableSort(value);
              break;
            case 'selection':
              entityPreferences.setTableSelection(value);
              break;
            default:
              console.warn(`Section de préférences inconnue: ${section}`);
          }
        },
        resetPreferences: () => entityPreferences.resetSection('table'),
        resetSection: (subSection) => {
          entityPreferences.resetSection(`table.${subSection}`);
        },
      };
    };
  };

  /**
   * Hook pour accéder aux préférences de détail
   */
  const createDetailPreferencesHook = () => {
    return () => {
      const entityPreferences = useStore();

      return {
        preferences: entityPreferences.detail,
        setActiveTab: entityPreferences.setDetailActiveTab,
        setScrollPosition: entityPreferences.setDetailScrollPosition,
        toggleSection: entityPreferences.toggleDetailSection,
        addToLastViewedItems: entityPreferences.addToLastViewedItems,
        resetPreferences: () => entityPreferences.resetSection('detail'),
      };
    };
  };

  /**
   * Hook pour accéder aux préférences de formulaire
   */
  const createFormPreferencesHook = () => {
    return () => {
      const entityPreferences = useStore();

      return {
        preferences: entityPreferences.form,
        setValues: entityPreferences.setFormValues,
        setActiveStep: entityPreferences.setFormActiveStep,
        toggleSection: entityPreferences.toggleFormSection,
        resetPreferences: () => entityPreferences.resetSection('form'),
      };
    };
  };

  /**
   * Hook pour accéder aux préférences globales
   */
  const createGlobalPreferencesHook = () => {
    return () => {
      const entityPreferences = useStore();

      return {
        preferences: entityPreferences.global,
        setViewMode: entityPreferences.setGlobalViewMode,
        setPreference: entityPreferences.setGlobalPreference,
        resetPreferences: () => entityPreferences.resetSection('global'),
      };
    };
  };

  // Retourner tous les hooks d'accès
  return {
    useStore,
    useTablePreferences: createTablePreferencesHook(),
    useDetailPreferences: createDetailPreferencesHook(),
    useFormPreferences: createFormPreferencesHook(),
    useGlobalPreferences: createGlobalPreferencesHook(),
  };
};

export default createEntityPreferencesStore;
