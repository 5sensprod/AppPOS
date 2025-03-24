// src/components/common/EntityTable/hooks/useTableSort.js
import { useState, useMemo, useEffect, useRef } from 'react';

export const useTableSort = (data, defaultSort) => {
  const [sort, setSort] = useState(defaultSort);
  const isInitialMount = useRef(true);
  const prevSort = useRef(defaultSort);

  // Appliquer le tri aux données
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? result : -result;
    });
  }, [data, sort.field, sort.direction]);

  // Mettre à jour le tri seulement si defaultSort change réellement
  useEffect(() => {
    // Ignorer le premier montage (useState l'a déjà initialisé)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Vérifier si defaultSort a changé
    if (
      prevSort.current.field !== defaultSort.field ||
      prevSort.current.direction !== defaultSort.direction
    ) {
      setSort(defaultSort);
      prevSort.current = defaultSort;
    }
  }, [defaultSort]);

  const handleSort = (field) => {
    const newSort = {
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    };

    setSort(newSort);
    prevSort.current = newSort;
  };

  return {
    sort,
    sortedData,
    handleSort,
  };
};
