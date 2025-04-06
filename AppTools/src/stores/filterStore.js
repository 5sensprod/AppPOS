import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFilterStore = create(
  persist(
    (set) => ({
      filters: {
        product: [],
        brand: [],
        category: [],
      },
      setFilters: (entity, selectedFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [entity]: selectedFilters,
          },
        })),
      resetFilters: (entity) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [entity]: [],
          },
        })),
    }),
    {
      name: 'entity-filters', // nom dans localStorage
    }
  )
);
