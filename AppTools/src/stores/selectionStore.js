//AppTools\src\stores\selectionStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSelectionStore = create(
  persist(
    (set, get) => ({
      // Structure: { entityName: { pageKey: [selectedIds] } }
      selections: {},

      /**
       * Définir la sélection pour une entité/page spécifique
       * @param {string} entityName - nom de l'entité (product, category, etc.)
       * @param {string} pageKey - clé de la page/filtre (pour séparer les contextes)
       * @param {string[]} selectedIds - tableau des IDs sélectionnés
       */
      setSelection: (entityName, pageKey = 'default', selectedIds) =>
        set((state) => ({
          selections: {
            ...state.selections,
            [entityName]: {
              ...state.selections[entityName],
              [pageKey]: selectedIds,
            },
          },
        })),

      /**
       * Ajouter un item à la sélection
       */
      addToSelection: (entityName, pageKey = 'default', itemId) =>
        set((state) => {
          const current = state.selections[entityName]?.[pageKey] || [];
          if (current.includes(itemId)) return state;

          return {
            selections: {
              ...state.selections,
              [entityName]: {
                ...state.selections[entityName],
                [pageKey]: [...current, itemId],
              },
            },
          };
        }),

      /**
       * Retirer un item de la sélection
       */
      removeFromSelection: (entityName, pageKey = 'default', itemId) =>
        set((state) => {
          const current = state.selections[entityName]?.[pageKey] || [];
          return {
            selections: {
              ...state.selections,
              [entityName]: {
                ...state.selections[entityName],
                [pageKey]: current.filter((id) => id !== itemId),
              },
            },
          };
        }),

      /**
       * Toggle un item dans la sélection
       */
      toggleSelection: (entityName, pageKey = 'default', itemId) => {
        const current = get().selections[entityName]?.[pageKey] || [];
        const action = current.includes(itemId) ? 'removeFromSelection' : 'addToSelection';
        get()[action](entityName, pageKey, itemId);
      },

      /**
       * Récupérer la sélection pour une entité/page
       */
      getSelection: (entityName, pageKey = 'default') => {
        return get().selections[entityName]?.[pageKey] || [];
      },

      /**
       * Vider la sélection pour une entité/page spécifique
       */
      clearSelection: (entityName, pageKey = 'default') =>
        set((state) => ({
          selections: {
            ...state.selections,
            [entityName]: {
              ...state.selections[entityName],
              [pageKey]: [],
            },
          },
        })),

      /**
       * Vider toutes les sélections d'une entité
       */
      clearEntitySelections: (entityName) =>
        set((state) => {
          const { [entityName]: _, ...restSelections } = state.selections;
          return { selections: restSelections };
        }),

      /**
       * Sélectionner tous les items d'une liste
       */
      selectAll: (entityName, pageKey = 'default', allIds) =>
        set((state) => ({
          selections: {
            ...state.selections,
            [entityName]: {
              ...state.selections[entityName],
              [pageKey]: [...allIds],
            },
          },
        })),

      /**
       * Vérifier si un item est sélectionné
       */
      isSelected: (entityName, pageKey = 'default', itemId) => {
        const current = get().selections[entityName]?.[pageKey] || [];
        return current.includes(itemId);
      },

      /**
       * Obtenir le nombre d'items sélectionnés
       */
      getSelectionCount: (entityName, pageKey = 'default') => {
        return get().selections[entityName]?.[pageKey]?.length || 0;
      },
    }),
    {
      name: 'entity-selections', // nom dans localStorage
      // Optionnel: nettoyer les anciennes sélections au démarrage
      onRehydrateStorage: () => (state) => {
        // console.log('Sélections rechargées:', state?.selections);
      },
    }
  )
);
