//AppTools\src\components\common\CategorySelector\hooks\useCategorySelector.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { useCategoryUtils } from '../../../hooks/useCategoryUtils';
import { useClickOutside } from '../../EntityTable/components/BatchActions/hooks/useClickOutside';

export const useCategorySelector = ({
  currentCategoryId = null,
  autoFocusOpen = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const containerRef = useRef(null);

  const {
    hierarchicalCategories,
    getCategoryName,
    getCategoryPath,
    getAllChildrenIds,
    searchInHierarchy,
  } = useCategoryUtils();

  // ✅ Gestion outclick avec votre hook
  const closeDropdown = () => setIsOpen(false);
  useClickOutside(containerRef, isOpen, closeDropdown);

  // ✅ Données filtrées (exclusion catégorie actuelle)
  const filteredData = useMemo(() => {
    if (!currentCategoryId) return hierarchicalCategories;

    const excludedIds = new Set([currentCategoryId, ...getAllChildrenIds(currentCategoryId)]);

    const filterHierarchy = (items) => {
      return items
        .filter((item) => !excludedIds.has(item._id))
        .map((item) => ({
          ...item,
          children: item.children ? filterHierarchy(item.children) : [],
        }));
    };

    return filterHierarchy(hierarchicalCategories);
  }, [hierarchicalCategories, currentCategoryId, getAllChildrenIds]);

  // ✅ Résultats de recherche
  const searchResults = useMemo(() => {
    if (!searchTerm) return filteredData;

    return searchInHierarchy(searchTerm, {
      includeChildren: true,
      maxResults: 50,
    }).filter((item) => {
      if (!currentCategoryId) return true;
      const excludedIds = new Set([currentCategoryId, ...getAllChildrenIds(currentCategoryId)]);
      return !excludedIds.has(item._id);
    });
  }, [searchTerm, filteredData, searchInHierarchy, currentCategoryId, getAllChildrenIds]);

  // ✅ Auto-focus
  useEffect(() => {
    if (autoFocusOpen && !disabled) {
      setIsOpen(true);
    }
  }, [autoFocusOpen, disabled]);

  // ✅ Expansion automatique lors de recherche
  useEffect(() => {
    if (!searchTerm) return;

    const expanded = {};
    const markExpanded = (items) => {
      for (const item of items) {
        if (item.children?.length > 0) {
          expanded[item._id] = true;
          markExpanded(item.children);
        }
      }
    };

    if (Array.isArray(searchResults)) {
      markExpanded(searchResults);
    }
    setExpandedItems((prev) => ({ ...prev, ...expanded }));
  }, [searchResults, searchTerm]);

  // ✅ Helpers
  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return {
    // État
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    expandedItems,
    setExpandedItems,
    containerRef,

    // Données
    filteredData,
    searchResults,

    // Helpers
    closeDropdown,
    toggleExpand,
    getCategoryName,
    getCategoryPath,
  };
};
