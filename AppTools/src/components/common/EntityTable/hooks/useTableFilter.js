// src/components/common/EntityTable/hooks/useTableFilter.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { usePaginationStore } from '../../../../stores/usePaginationStore';

export const useTableFilter = (
  data,
  searchFields,
  filters,
  onSearch,
  onFilter,
  searchProcessor,
  entityName = 'default'
) => {
  // Utiliser useRef pour stocker les valeurs persistantes récupérées une seule fois
  const persistedParamsRef = useRef(null);

  // Accéder au store pour les valeurs persistantes et les fonctions
  const {
    getPaginationParams,
    setSearchTerm: saveSearchTerm,
    setActiveFilters: saveActiveFilters,
    resetPagination,
  } = usePaginationStore();

  // Initialiser persistedParamsRef une seule fois
  if (persistedParamsRef.current === null) {
    persistedParamsRef.current = getPaginationParams(entityName);
  }

  // État local initialisé avec les valeurs persistantes
  const [searchTerm, setLocalSearchTerm] = useState(persistedParamsRef.current.searchTerm || '');
  const [activeFilters, setLocalActiveFilters] = useState(
    persistedParamsRef.current.activeFilters || {}
  );

  // Référence aux fonctions pour éviter les recréations à chaque rendu
  const callbacksRef = useRef({
    onSearch,
    onFilter,
  });

  // Mettre à jour les références des callbacks lorsqu'elles changent
  useEffect(() => {
    callbacksRef.current = {
      onSearch,
      onFilter,
    };
  }, [onSearch, onFilter]);

  // Gestion de la recherche avec persistance
  const handleSearchChange = useMemo(
    () => (e) => {
      const value = e.target.value;
      setLocalSearchTerm(value);

      // Sauvegarder dans le store
      saveSearchTerm(entityName, value);

      // Réinitialiser la pagination lors d'une recherche
      resetPagination(entityName);

      // CORRECTION: Vérifier que onSearch existe ET est une fonction
      if (callbacksRef.current.onSearch && typeof callbacksRef.current.onSearch === 'function') {
        callbacksRef.current.onSearch(value, searchFields);
      }
    },
    [saveSearchTerm, resetPagination, entityName, searchFields]
  );

  // Gestion des filtres avec persistance
  const handleFilterChange = useMemo(
    () => (filterId, value) => {
      // Réinitialiser la pagination lors d'un changement de filtre
      resetPagination(entityName);

      const newFilters = {
        ...activeFilters,
        [filterId]: value,
      };

      // Si la valeur est vide ou "all", supprimer le filtre
      if (!value || value === 'all') {
        delete newFilters[filterId];
      }

      setLocalActiveFilters(newFilters);

      // Sauvegarder dans le store
      saveActiveFilters(entityName, newFilters);

      // CORRECTION: Vérifier que onFilter existe ET est une fonction
      if (callbacksRef.current.onFilter && typeof callbacksRef.current.onFilter === 'function') {
        callbacksRef.current.onFilter(newFilters);
      }
    },
    [activeFilters, saveActiveFilters, resetPagination, entityName]
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
          if (filterId === 'woo_id') {
            if (filterValue === 'synced') return item.woo_id != null;
            if (filterValue === 'unsynced') return item.woo_id == null;
            return true;
          }
          if (filterId === 'suppliers') {
            return item.suppliers?.includes(filterValue);
          }
          return item[filterId] === filterValue;
        }
        if (filterConfig.type === 'boolean') {
          const isTrue = filterValue === 'true';
          // Cas spécial : champ est "truthy" ou "null" (ex: woo_id)
          const fieldValue = item[filterId];
          // On considère que "synchronisé" = woo_id != null
          return isTrue ? fieldValue !== null && fieldValue !== undefined : fieldValue == null;
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
      return searchProcessor(dataAfterFilters, searchTerm, searchFields);
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
    setSearchTerm: (term) => {
      setLocalSearchTerm(term);
      saveSearchTerm(entityName, term);
    },
  };
};
