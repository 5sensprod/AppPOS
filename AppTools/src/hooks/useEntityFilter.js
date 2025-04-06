import { useFilterStore } from '../stores/filterStore';

export function useEntityFilter(entityName) {
  const filters = useFilterStore((state) => state.filters[entityName] || []);
  const setFilters = useFilterStore((state) => state.setFilters);
  const resetFilters = useFilterStore((state) => state.resetFilters);

  return {
    selectedFilters: filters,
    setSelectedFilters: (newFilters) => setFilters(entityName, newFilters),
    resetFilters: () => resetFilters(entityName),
  };
}
