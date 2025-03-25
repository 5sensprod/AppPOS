// src/components/common/EntityTable/hooks/useTableFilter.js
import { useState, useMemo, useCallback, useEffect } from 'react';

export const useTableFilter = (
  data,
  searchFields = ['name'],
  filters = [],
  onSearch,
  onFilter,
  searchProcessor,
  initialSearchTerm = '',
  initialActiveFilters = {}
) => {
  // Utiliser les valeurs initiales pour les états
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilters, setActiveFilters] = useState(initialActiveFilters);

  // Gestion de la recherche
  const handleSearchChange = useCallback(
    (e) => {
      const value = typeof e === 'string' ? e : e.target.value;
      setSearchTerm(value);
      if (onSearch) {
        onSearch(value, searchFields);
      }
    },
    [onSearch, searchFields]
  );

  // Gestion des filtres
  const handleFilterChange = useCallback(
    (filterId, value) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterId]: value,
      }));
      if (onFilter) {
        onFilter({ ...activeFilters, [filterId]: value });
      }
    },
    [activeFilters, onFilter]
  );

  // Appliquer les filtres et la recherche aux données
  const filteredData = useMemo(() => {
    // Appliquer d'abord les filtres
    const dataAfterFilters = data.filter((item) => {
      // Vérifier si l'élément correspond aux filtres
      return Object.entries(activeFilters).every(([filterId, filterValue]) => {
        if (!filterValue || filterValue === 'all') return true;
        const filterConfig = filters.find((f) => f.id === filterId);
        if (!filterConfig) return true;
        if (filterConfig.type === 'select') {
          return item[filterId] === filterValue;
        }
        if (filterConfig.type === 'boolean') {
          return item[filterId] === (filterValue === 'true');
        }
        if (filterConfig.type === 'range') {
          const value = item[filterId];
          if (value === undefined) return false;
          const min = filterValue.min !== undefined ? filterValue.min : -Infinity;
          const max = filterValue.max !== undefined ? filterValue.max : Infinity;
          return value >= min && value <= max;
        }
        return true;
      });
    });

    // Ensuite appliquer la recherche
    if (!searchTerm) return dataAfterFilters;

    // Utiliser le processeur de recherche personnalisé s'il est fourni
    if (searchProcessor && typeof searchProcessor === 'function') {
      return searchProcessor(dataAfterFilters, searchTerm);
    }

    // Comportement de recherche par défaut
    return dataAfterFilters.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, activeFilters, searchFields, filters, searchProcessor]);

  return {
    searchTerm,
    activeFilters,
    filteredData,
    handleSearchChange,
    handleFilterChange,
    setActiveFilters, // Exposer cette méthode pour la réinitialisation
  };
};
