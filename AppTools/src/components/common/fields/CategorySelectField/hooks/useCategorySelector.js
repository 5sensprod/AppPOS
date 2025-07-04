// src/components/common/fields/CategorySelectField/hooks/useCategorySelector.js
import { useState, useEffect, useMemo } from 'react';

export function useCategorySelector({ value, onChange, categoryData, autoFocus, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const selectedLabel = useMemo(() => {
    return value ? categoryData.getLabel(value) || '' : '';
  }, [value, categoryData.getLabel]);

  const searchResults = useMemo(() => {
    return categoryData.search(searchTerm);
  }, [categoryData.search, searchTerm]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      setIsOpen(true);
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (!searchTerm) return;

    const toExpand = {};
    const markExpanded = (items) => {
      items.forEach((item) => {
        if (item.children?.length > 0) {
          toExpand[item._id] = true;
          markExpanded(item.children);
        }
      });
    };

    markExpanded(searchResults);
    setExpandedItems((prev) => ({ ...prev, ...toExpand }));
  }, [searchResults, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.category-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return {
    isOpen,
    searchTerm,
    setSearchTerm,
    expandedItems,
    selectedLabel,
    searchResults,
    toggleOpen,
    handleSelect,
    toggleExpand,
  };
}
