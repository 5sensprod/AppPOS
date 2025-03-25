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

  return {
    sort,
    sortedData,
    handleSort,
  };
};
