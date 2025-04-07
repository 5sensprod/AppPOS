// src/features/suppliers/stores/usePaginationStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store Zustand pour persister les paramètres de pagination
export const usePaginationStore = create(
  persist(
    (set, get) => ({
      // État par défaut pour la pagination
      paginationState: {
        // Map des paramètres de pagination par entité (supplier, product, etc.)
        entities: {
          supplier: {
            currentPage: 1,
            pageSize: 5,
          },
          // Ajoutez d'autres entités au besoin
        },
      },

      // Mettre à jour la page courante pour une entité spécifique
      setCurrentPage: (entityName, page) => {
        set((state) => ({
          paginationState: {
            ...state.paginationState,
            entities: {
              ...state.paginationState.entities,
              [entityName]: {
                ...state.paginationState.entities[entityName],
                currentPage: page,
              },
            },
          },
        }));
      },

      // Mettre à jour la taille de page pour une entité spécifique
      setPageSize: (entityName, size) => {
        set((state) => ({
          paginationState: {
            ...state.paginationState,
            entities: {
              ...state.paginationState.entities,
              [entityName]: {
                ...state.paginationState.entities[entityName],
                pageSize: size,
                // Retourner à la première page lors du changement de taille
                currentPage: 1,
              },
            },
          },
        }));
      },

      // Obtenir les paramètres de pagination pour une entité
      getPaginationParams: (entityName) => {
        const { paginationState } = get();
        // Renvoyer les valeurs par défaut si l'entité n'existe pas encore
        if (!paginationState.entities[entityName]) {
          return { currentPage: 1, pageSize: 10 };
        }
        return paginationState.entities[entityName];
      },

      // Réinitialiser la pagination pour une entité
      resetPagination: (entityName) => {
        set((state) => ({
          paginationState: {
            ...state.paginationState,
            entities: {
              ...state.paginationState.entities,
              [entityName]: {
                currentPage: 1,
                pageSize: state.paginationState.entities[entityName]?.pageSize || 10,
              },
            },
          },
        }));
      },
    }),
    {
      name: 'app-pagination-storage', // Nom utilisé pour le localStorage
    }
  )
);
