// src/components/common/CategorySelector/MultipleCategorySelector.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, X, Star, Search } from 'lucide-react';
import { useCategoryUtils } from '../../hooks/useCategoryUtils';
import { useClickOutside } from '../EntityTable/components/BatchActions/hooks/useClickOutside';

const MultipleCategorySelector = ({
  selectedCategories = [],
  primaryCategoryId = '',
  onMultipleChange,
  disabled = false,
  placeholder,
  currentCategoryId = null,
  showSearch = true,
  showCounts = true,
  autoFocusOpen = false,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const containerRef = useRef(null);

  // ✅ REMPLACEMENT : Utiliser votre hook
  const closeDropdown = () => setIsOpen(false);
  useClickOutside(containerRef, isOpen, closeDropdown);

  const {
    hierarchicalCategories,
    getCategoryName,
    getCategoryPath,
    getAllChildrenIds,
    searchInHierarchy,
  } = useCategoryUtils();

  // Placeholder par défaut
  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return selectedCategories.length > 0
      ? "Ajouter d'autres catégories"
      : 'Ajouter des catégories...';
  }, [placeholder, selectedCategories.length]);

  // ========================================
  // FILTRAGE DES DONNÉES
  // ========================================

  // Filtrer les catégories exclues
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
      if (!currentCategoryId) return true;
      const excludedIds = new Set([currentCategoryId, ...getAllChildrenIds(currentCategoryId)]);
      return !excludedIds.has(item._id);
    });
  }, [searchTerm, filteredData, searchInHierarchy, currentCategoryId, getAllChildrenIds]);

  // ========================================
  // DONNÉES SÉLECTIONNÉES
  // ========================================

  // Labels des catégories sélectionnées
  const selectedLabels = useMemo(() => {
    return selectedCategories
      .map((id) => ({
        id,
        name: getCategoryName(id) || 'Catégorie inconnue',
        path: getCategoryPath(id),
      }))
      .filter((item) => item.name !== 'Catégorie inconnue'); // Filtrer les catégories supprimées
  }, [selectedCategories, getCategoryName, getCategoryPath]);

  // ========================================
  // EFFETS
  // ========================================

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

  const toggleCategory = (categoryId) => {
    let newCategories;
    let newPrimaryId = primaryCategoryId;

    if (selectedCategories.includes(categoryId)) {
      // Retirer la catégorie
      newCategories = selectedCategories.filter((id) => id !== categoryId);

      // Si on retire la catégorie principale, choisir une nouvelle principale
      if (categoryId === primaryCategoryId) {
        newPrimaryId = newCategories.length > 0 ? newCategories[0] : '';
      }
    } else {
      // Ajouter la catégorie
      newCategories = [...selectedCategories, categoryId];

      // Si c'est la première catégorie, elle devient principale
      if (newCategories.length === 1) {
        newPrimaryId = categoryId;
      }
    }

    onMultipleChange({
      categories: newCategories,
      primaryId: newPrimaryId,
    });
  };

  const setPrimary = (categoryId) => {
    // S'assurer que la catégorie est dans la sélection
    let newCategories = selectedCategories;
    if (!selectedCategories.includes(categoryId)) {
      newCategories = [...selectedCategories, categoryId];
    }

    onMultipleChange({
      categories: newCategories,
      primaryId: categoryId,
    });
  };

  const removeCategory = (categoryId) => {
    const newCategories = selectedCategories.filter((id) => id !== categoryId);
    let newPrimaryId = primaryCategoryId;

    // Si on retire la catégorie principale
    if (categoryId === primaryCategoryId) {
      newPrimaryId = newCategories.length > 0 ? newCategories[0] : '';
    }

    onMultipleChange({
      categories: newCategories,
      primaryId: newPrimaryId,
    });
  };

  // ========================================
  // RENDU
  // ========================================

  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const childCount = hasChildren ? item.children.length : 0;
      const isSelected = selectedCategories.includes(item._id);
      const isPrimary = item._id === primaryCategoryId;

      return (
        <div key={item._id}>
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={() => toggleCategory(item._id)}
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

            {/* Indicateurs et actions */}
            <div className="flex items-center space-x-2">
              {/* Badge principale */}
              {isPrimary && (
                <Star
                  className="h-4 w-4 text-yellow-500 fill-current"
                  title="Catégorie principale"
                />
              )}

              {/* Bouton "Définir comme principale" */}
              {isSelected && !isPrimary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrimary(item._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-yellow-600 px-2 py-1 rounded bg-gray-100 dark:bg-gray-600"
                  title="Définir comme principale"
                >
                  ★
                </button>
              )}

              {/* Bouton Add/Remove */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(item._id);
                }}
                className={`p-1 rounded-full transition-colors ${
                  isSelected
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-800 dark:text-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
                }`}
                title={isSelected ? 'Retirer' : 'Ajouter'}
              >
                {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>
            </div>
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
      const isSelected = selectedCategories.includes(item._id);
      const isPrimary = item._id === primaryCategoryId;
      const level = item._level || 0;

      return (
        <div
          key={item._id}
          className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => toggleCategory(item._id)}
        >
          <span className="flex-grow text-sm truncate">{item._fullPath || item.name}</span>

          <div className="flex items-center space-x-2">
            {isPrimary && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" title="Catégorie principale" />
            )}

            {isSelected && !isPrimary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPrimary(item._id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-yellow-600 px-2 py-1 rounded bg-gray-100 dark:bg-gray-600"
                title="Définir comme principale"
              >
                ★
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(item._id);
              }}
              className={`p-1 rounded-full transition-colors ${
                isSelected
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-800 dark:text-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
              }`}
              title={isSelected ? 'Retirer' : 'Ajouter'}
            >
              {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className="category-selector">
      {/* Zone d'affichage des catégories sélectionnées */}
      <div className="space-y-3">
        {/* Chips des catégories sélectionnées */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((category) => {
              const isPrimary = category.id === primaryCategoryId;
              return (
                <div
                  key={category.id}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isPrimary
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 dark:bg-blue-800 dark:text-blue-100'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  title={category.path}
                >
                  {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
                  <span className="mr-2">{category.name}</span>

                  {/* Bouton "Définir comme principale" si pas déjà principale */}
                  {!isPrimary && (
                    <button
                      onClick={() => setPrimary(category.id)}
                      className="mr-1 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="Définir comme principale"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}

                  {/* Bouton supprimer */}
                  <button
                    onClick={() => removeCategory(category.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Retirer cette catégorie"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton d'ajout de catégories */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
            isOpen
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
              : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Plus className="h-5 w-5 mr-2" />
          <span className="font-medium">{defaultPlaceholder}</span>
        </button>
      </div>

      {/* Dropdown de sélection */}
      {isOpen && (
        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Barre de recherche */}
          {showSearch && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Rechercher une catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Liste des catégories */}
          <div className="overflow-y-auto max-h-64">
            {searchTerm ? (
              // Résultats de recherche
              searchResults && searchResults.length > 0 ? (
                renderSearchResults()
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Aucune catégorie trouvée
                </div>
              )
            ) : // Hiérarchie normale
            filteredData.length > 0 ? (
              renderItems(filteredData)
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Aucune catégorie disponible
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aide utilisateur */}
      {selectedLabels.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />
            <span>Catégorie principale • Cliquez sur ★ pour changer la principale</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleCategorySelector;
