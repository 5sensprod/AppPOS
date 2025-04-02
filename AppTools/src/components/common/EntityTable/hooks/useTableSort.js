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
    // Si aucune donnée, retourner un tableau vide
    if (!data || data.length === 0) return [];

    // Vérifier si nous avons des données hiérarchiques
    const hasHierarchicalData =
      data.length > 0 && (data[0]._hierarchyIndex !== undefined || data[0]._level !== undefined);

    // Si nous avons des données hiérarchiques et que le tri par défaut est actif
    if (hasHierarchicalData && sort.field === 'name' && sort.direction === 'asc') {
      // Si nous avons un index hiérarchique, l'utiliser pour le tri
      if (data[0]._hierarchyIndex !== undefined) {
        return [...data].sort((a, b) => a._hierarchyIndex.localeCompare(b._hierarchyIndex));
      }

      // Sinon, trier par l'index de tri standard
      return [...data].sort((a, b) => a._sortIndex - b._sortIndex);
    }

    // Pour les autres types de tri, respecter la hiérarchie au sein de chaque niveau
    return [...data].sort((a, b) => {
      // Obtenir les valeurs à comparer
      const aValue =
        sort.field === 'name' && a._originalName !== undefined ? a._originalName : a[sort.field];

      const bValue =
        sort.field === 'name' && b._originalName !== undefined ? b._originalName : b[sort.field];

      // Si les valeurs sont égales, maintenir l'ordre hiérarchique
      if (aValue === bValue) {
        // Si nous avons un index hiérarchique, utiliser cela en premier
        if (a._hierarchyIndex !== undefined && b._hierarchyIndex !== undefined) {
          return a._hierarchyIndex.localeCompare(b._hierarchyIndex);
        }

        // Sinon, utiliser le niveau et l'index de tri
        if (a._level !== undefined && b._level !== undefined) {
          // Si les niveaux sont différents, trier par niveau d'abord
          if (a._level !== b._level) {
            return a._level - b._level;
          }
          // Sinon utiliser l'index de tri
          return a._sortIndex - b._sortIndex;
        }

        return 0;
      }

      // Gérer les valeurs nulles ou non définies
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
