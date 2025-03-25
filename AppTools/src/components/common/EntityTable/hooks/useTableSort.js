// src/components/common/EntityTable/hooks/useTableSort.js
import { useState, useMemo } from 'react';

export const useTableSort = (data, defaultSort) => {
  const [sort, setSort] = useState(defaultSort);

  const handleSort = (field) => {
    setSort((prevSort) => ({
      field,
      direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Appliquer le tri aux données
  const sortedData = useMemo(() => {
    // Vérifier si nous avons des données hiérarchiques avec _sortIndex
    const hasHierarchicalData = data.length > 0 && data[0]._sortIndex !== undefined;

    // Si c'est le cas et qu'aucun tri n'est actif, maintenir l'ordre hiérarchique
    if (hasHierarchicalData && sort.field === 'name' && sort.direction === 'asc') {
      return [...data].sort((a, b) => a._sortIndex - b._sortIndex);
    }

    return [...data].sort((a, b) => {
      // Vérification supplémentaire pour les éléments React (pour le nom avec indentation)
      const aOriginal = a._originalName !== undefined ? a._originalName : a[sort.field];
      const bOriginal = b._originalName !== undefined ? b._originalName : b[sort.field];

      // Si c'est le champ name mais qu'il y a des éléments React, utiliser _originalName
      const aValue =
        sort.field === 'name' && a._originalName !== undefined ? a._originalName : a[sort.field];

      const bValue =
        sort.field === 'name' && b._originalName !== undefined ? b._originalName : b[sort.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Pour les chaînes de caractères
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sort.direction === 'asc' ? result : -result;
      }

      // Pour les valeurs numériques ou autres types
      const result = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? result : -result;
    });
  }, [data, sort.field, sort.direction]);

  return {
    sort,
    sortedData,
    handleSort,
  };
};
