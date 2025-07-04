// src/components/common/fields/CategorySelectField/hooks/useCategoryData.js
import { useMemo } from 'react';
import { useCategoryUtils } from '../../../../../hooks/useCategoryUtils';

export function useCategoryData({ hierarchicalData, excludeIds = [] }) {
  const { hierarchicalCategories, categoriesLoading, getCategoryPath, searchInHierarchy } =
    useCategoryUtils();

  const resolvedData = hierarchicalData || hierarchicalCategories;
  const isLoading = !hierarchicalData && categoriesLoading;

  const filteredData = useMemo(() => {
    if (!excludeIds.length) return resolvedData;

    const filterRecursive = (items) => {
      return items
        .filter((item) => !excludeIds.includes(item._id))
        .map((item) => ({
          ...item,
          children: item.children ? filterRecursive(item.children) : [],
        }));
    };

    return filterRecursive(resolvedData);
  }, [resolvedData, excludeIds]);

  const search = useMemo(() => {
    if (!hierarchicalData && searchInHierarchy) {
      return (term) => searchInHierarchy(term, { includeChildren: true, maxResults: 50 });
    }

    return (term) => {
      if (!term) return filteredData;

      const lowerTerm = term.toLowerCase();
      const searchRecursive = (items) => {
        return items
          .map((item) => {
            const nameMatch = item.name?.toLowerCase().includes(lowerTerm);
            const childResults = item.children ? searchRecursive(item.children) : [];

            if (nameMatch || childResults.length > 0) {
              return { ...item, children: childResults };
            }
            return null;
          })
          .filter(Boolean);
      };

      return searchRecursive(filteredData);
    };
  }, [hierarchicalData, searchInHierarchy, filteredData]);

  const getLabel = useMemo(() => {
    if (!hierarchicalData && getCategoryPath) {
      return getCategoryPath;
    }

    return (categoryId) => {
      const findLabel = (items) => {
        for (const item of items) {
          if (item._id === categoryId) return item.name;
          if (item.children) {
            const found = findLabel(item.children);
            if (found) return found;
          }
        }
        return '';
      };

      return findLabel(resolvedData);
    };
  }, [hierarchicalData, getCategoryPath, resolvedData]);

  return {
    data: filteredData,
    isLoading,
    search,
    getLabel,
  };
}
