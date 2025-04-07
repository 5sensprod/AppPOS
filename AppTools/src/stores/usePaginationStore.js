// src/stores/usePaginationStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store Zustand étendu pour persister la pagination et les termes de recherche
export const usePaginationStore = create(
  persist(
    (set, get) => ({
      // État par défaut pour la pagination et les filtres
      paginationState: {
        // Map des paramètres de pagination par entité (supplier, product, etc.)
        entities: {
          supplier: {
            currentPage: 1,
            pageSize: 5,
            searchTerm: '', // Nouveau champ pour le terme de recherche
            activeFilters: {}, // Nouveau champ pour les filtres actifs
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

      // Nouveau : Mettre à jour le terme de recherche pour une entité
      setSearchTerm: (entityName, term) => {
        set((state) => ({
          paginationState: {
            ...state.paginationState,
            entities: {
              ...state.paginationState.entities,
              [entityName]: {
                ...state.paginationState.entities[entityName],
                searchTerm: term,
                // Retourner à la première page lors d'une recherche
                currentPage: 1,
              },
            },
          },
        }));
      },

      // Nouveau : Mettre à jour les filtres actifs pour une entité
      setActiveFilters: (entityName, filters) => {
        set((state) => ({
          paginationState: {
            ...state.paginationState,
            entities: {
              ...state.paginationState.entities,
              [entityName]: {
                ...state.paginationState.entities[entityName],
                activeFilters: filters,
                // Retourner à la première page lors d'un changement de filtre
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
          return {
            currentPage: 1,
            pageSize: 10,
            searchTerm: '',
            activeFilters: {},
          };
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
                ...state.paginationState.entities[entityName],
                currentPage: 1,
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
