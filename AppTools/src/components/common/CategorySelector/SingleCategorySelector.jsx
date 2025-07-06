// src/components/common/CategorySelector/SingleCategorySelector.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Search, Check } from 'lucide-react';
import { useCategoryUtils } from '../../hooks/useCategoryUtils';
import { useClickOutside } from '../EntityTable/components/BatchActions/hooks/useClickOutside';

const SingleCategorySelector = ({
  value = '',
  onChange,
  disabled = false,
  placeholder,
  currentCategoryId = null,
  showSearch = true,
  showCounts = true,
  allowRootSelection = true,
  autoFocusOpen = false,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // ✅ Ref pour le conteneur principal
  const containerRef = useRef(null);

  const closeDropdown = () => setIsOpen(false);
  useClickOutside(containerRef, isOpen, closeDropdown);

  const { hierarchicalCategories, getCategoryPath, getAllChildrenIds, searchInHierarchy } =
    useCategoryUtils();

  // Placeholder par défaut
  const defaultPlaceholder = placeholder || 'Sélectionner une catégorie';

  // ========================================
  // FILTRAGE DES DONNÉES
  // ========================================

  // Filtrer les catégories exclues (catégorie actuelle et ses descendants)
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

  // Recherche dans les catégories
  const searchResults = useMemo(() => {
    if (!searchTerm) return filteredData;

    return searchInHierarchy(searchTerm, {
      includeChildren: true,
      maxResults: 50,
    }).filter((item) => {
      // Appliquer le même filtre d'exclusion aux résultats de recherche
      if (!currentCategoryId) return true;
      const excludedIds = new Set([currentCategoryId, ...getAllChildrenIds(currentCategoryId)]);
      return !excludedIds.has(item._id);
    });
  }, [searchTerm, filteredData, searchInHierarchy, currentCategoryId, getAllChildrenIds]);

  // ========================================
  // ÉTAT ET EFFETS
  // ========================================

  // Label de la catégorie sélectionnée
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return getCategoryPath(value) || 'Catégorie inconnue';
  }, [value, getCategoryPath]);

  // Expansion automatique vers la valeur sélectionnée
  useEffect(() => {
    if (!value) return;

    const expandPathToValue = (items) => {
      for (const item of items) {
        if (item._id === value) {
          return true;
        }

        if (item.children?.length > 0) {
          const foundInChildren = expandPathToValue(item.children);
          if (foundInChildren) {
            setExpandedItems((prev) => ({ ...prev, [item._id]: true }));
            return true;
          }
        }
      }
      return false;
    };

    expandPathToValue(filteredData);
  }, [value, filteredData]);

  // Auto-focus
  useEffect(() => {
    if (autoFocusOpen && !disabled) {
      setIsOpen(true);
    }
  }, [autoFocusOpen, disabled]);

  // Expansion automatique lors de la recherche
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

  // ========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ========================================

  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  // ========================================
  // RENDU
  // ========================================

  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const isSelected = value === item._id;
      const childCount = hasChildren ? item.children.length : 0;

      return (
        <div key={item._id}>
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={() => handleSelect(item._id)}
          >
            {/* Bouton expand/collapse */}
            {hasChildren ? (
              <button
                type="button"
                className="p-1 mr-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                onClick={(e) => toggleExpand(item._id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-7" />
            )}

            {/* Nom de la catégorie */}
            <span className="flex-grow text-sm truncate">{item.name}</span>

            {/* Compteur d'enfants */}
            {hasChildren && showCounts && (
              <span className="text-xs text-gray-500 ml-2">({childCount})</span>
            )}

            {/* Icône de sélection */}
            {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
          </div>

          {/* Enfants */}
          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </div>
      );
    });
  };

  const renderSearchResults = () => {
    if (!Array.isArray(searchResults)) return null;

    return searchResults.map((item) => {
      const isSelected = value === item._id;
      const level = item._level || 0;

      return (
        <div
          key={item._id}
          className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => handleSelect(item._id)}
        >
          <span className="flex-grow text-sm truncate">{item._fullPath || item.name}</span>
          {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className="category-selector relative">
      {/* Champ de sélection */}
      <div
        className={`border rounded-md px-3 py-2 flex justify-between items-center cursor-pointer ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate text-gray-700 dark:text-gray-300">
          {selectedLabel || defaultPlaceholder}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-72 overflow-hidden">
          {/* Barre de recherche */}
          {showSearch && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Liste des options */}
          <div className="overflow-y-auto max-h-56">
            {/* Option "Aucune" */}
            {allowRootSelection && !searchTerm && (
              <div
                className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSelect('')}
              >
                <span className="text-gray-500 dark:text-gray-400">Aucune (catégorie racine)</span>
                {value === '' && (
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
                )}
              </div>
            )}

            {/* Liste des catégories */}
            {searchTerm ? (
              // Résultats de recherche
              searchResults && searchResults.length > 0 ? (
                renderSearchResults()
              ) : (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                  Aucune catégorie trouvée
                </div>
              )
            ) : // Hiérarchie normale
            filteredData.length > 0 ? (
              renderItems(filteredData)
            ) : (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                Aucune catégorie disponible
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleCategorySelector;
