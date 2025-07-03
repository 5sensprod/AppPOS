// src/components/common/CategorySelector/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, X, Star, Search, Check } from 'lucide-react';

/**
 * Composant unifié pour la sélection de catégories
 * Supporte deux modes :
 * - single : Sélection d'une seule catégorie (remplace HierarchicalParentSelector)
 * - multiple : Sélection multiple avec catégorie principale (remplace ModernCategorySelector)
 */
const CategorySelector = ({
  // Données
  hierarchicalData = [],

  // Mode de fonctionnement
  mode = 'single', // 'single' | 'multiple'

  // Props pour mode single
  value = '', // string pour single
  onChange, // (value: string) => void pour single

  // Props pour mode multiple
  selectedCategories = [], // string[] pour multiple
  primaryCategoryId = '', // string pour multiple
  onMultipleChange, // ({ categories: string[], primaryId: string }) => void pour multiple

  // Configuration commune
  disabled = false,
  placeholder,
  currentCategoryId = null, // Pour exclure la catégorie actuelle et ses descendants

  // Style et comportement
  showSearch = true,
  showCounts = true,
  allowRootSelection = true, // Permet de sélectionner "Aucune" en mode single
  variant = 'default', // 'default' | 'compact' | 'modern'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Déterminer les placeholders par défaut
  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;

    if (mode === 'single') {
      return 'Sélectionner une catégorie parent';
    } else {
      return selectedCategories.length > 0
        ? "Ajouter d'autres catégories"
        : 'Ajouter des catégories...';
    }
  }, [mode, placeholder, selectedCategories.length]);

  // ========================================
  // LOGIQUE COMMUNE - Filtrage des données
  // ========================================

  // Filtrer les catégories qu'on ne peut pas sélectionner (exclusion de la catégorie actuelle et descendants)
  const filteredData = useMemo(() => {
    if (!currentCategoryId) return hierarchicalData;

    const findDescendantIds = (items, targetId, descendantIds = new Set()) => {
      for (const item of items) {
        if (item._id === targetId) {
          descendantIds.add(targetId);
          if (item.children?.length > 0) {
            const addAllDescendants = (children) => {
              for (const child of children) {
                descendantIds.add(child._id);
                if (child.children?.length > 0) {
                  addAllDescendants(child.children);
                }
              }
            };
            addAllDescendants(item.children);
          }
          return descendantIds;
        }
        if (item.children?.length > 0) {
          findDescendantIds(item.children, targetId, descendantIds);
        }
      }
      return descendantIds;
    };

    const excludedIds = findDescendantIds(hierarchicalData, currentCategoryId);

    const filterHierarchy = (items) => {
      return items
        .map((item) => ({
          ...item,
          children: item.children ? filterHierarchy(item.children) : [],
        }))
        .filter((item) => !excludedIds.has(item._id));
    };

    return filterHierarchy(hierarchicalData);
  }, [hierarchicalData, currentCategoryId]);

  // Filtrage par recherche
  const filteredBySearch = useMemo(() => {
    if (!searchTerm) return filteredData;

    const lowerSearchTerm = searchTerm.toLowerCase();

    const searchInHierarchy = (items) => {
      return items
        .map((item) => {
          let filteredChildren = [];

          if (item.children?.length > 0) {
            filteredChildren = searchInHierarchy(item.children);
          }

          const nameMatch = item.name?.toLowerCase().includes(lowerSearchTerm);
          const childrenMatch = filteredChildren.length > 0;

          if (nameMatch || childrenMatch) {
            return {
              ...item,
              children: filteredChildren,
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    return searchInHierarchy(filteredData);
  }, [filteredData, searchTerm]);

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

    markExpanded(filteredBySearch);
    setExpandedItems((prev) => ({ ...prev, ...expanded }));
  }, [filteredBySearch, searchTerm]);

  // ========================================
  // LOGIQUE SPÉCIFIQUE - Mode single
  // ========================================

  // Trouver le label de la catégorie sélectionnée (mode single)
  const selectedLabel = useMemo(() => {
    if (mode !== 'single' || !value) return '';

    const findLabel = (items) => {
      for (const item of items) {
        if (item._id === value) {
          return item.path_string || item.name;
        }
        if (item.children?.length > 0) {
          const childLabel = findLabel(item.children);
          if (childLabel) return childLabel;
        }
      }
      return '';
    };

    return findLabel(hierarchicalData);
  }, [mode, value, hierarchicalData]);

  // Expansion automatique vers la valeur sélectionnée (mode single)
  useEffect(() => {
    if (mode !== 'single' || !value) return;

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

    expandPathToValue(hierarchicalData);
  }, [mode, value, hierarchicalData]);

  // ========================================
  // LOGIQUE SPÉCIFIQUE - Mode multiple
  // ========================================

  // Trouver les labels des catégories sélectionnées (mode multiple)
  const selectedLabels = useMemo(() => {
    if (mode !== 'multiple') return [];

    const labels = [];
    const findLabelsInHierarchy = (items, ids) => {
      items.forEach((item) => {
        if (ids.includes(item._id)) {
          labels.push({
            id: item._id,
            name: item.name || 'Sans nom',
            path_string: item.path_string || item.name,
          });
        }

        if (item.children?.length > 0) {
          findLabelsInHierarchy(item.children, ids);
        }
      });
    };

    findLabelsInHierarchy(hierarchicalData, selectedCategories);
    return labels;
  }, [mode, selectedCategories, hierarchicalData]);

  // ========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ========================================

  // Gestion du clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.category-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Toggle expansion d'un élément
  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Sélection en mode single
  const handleSingleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  // Sélection en mode multiple
  const toggleCategory = (categoryId) => {
    if (mode !== 'multiple') return;

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

  // Définir une catégorie comme principale (mode multiple)
  const setPrimary = (categoryId) => {
    if (mode !== 'multiple') return;

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

  // Retirer une catégorie (mode multiple)
  const removeCategory = (categoryId) => {
    if (mode !== 'multiple') return;

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
  // RENDU DES ÉLÉMENTS
  // ========================================

  // Rendu récursif des catégories
  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const childCount = hasChildren ? item.children.length : 0;

      // État selon le mode
      const isSelected =
        mode === 'single' ? value === item._id : selectedCategories.includes(item._id);
      const isPrimary = mode === 'multiple' && item._id === primaryCategoryId;

      return (
        <div key={item._id}>
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={() => {
              if (mode === 'single') {
                handleSingleSelect(item._id);
              } else {
                toggleCategory(item._id);
              }
            }}
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

            {/* Mode single : icône de sélection */}
            {mode === 'single' && isSelected && (
              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
            )}

            {/* Mode multiple : indicateurs et actions */}
            {mode === 'multiple' && (
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
            )}
          </div>

          {/* Enfants */}
          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </div>
      );
    });
  };

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  if (mode === 'single') {
    return (
      <div className="category-selector relative">
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
              {allowRootSelection && (
                <div
                  className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleSingleSelect('')}
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    Aucune (catégorie racine)
                  </span>
                  {value === '' && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
                  )}
                </div>
              )}

              {/* Liste des catégories */}
              {filteredBySearch.length > 0 ? (
                renderItems(filteredBySearch)
              ) : (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                  Aucune catégorie trouvée
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode multiple
  return (
    <div className="category-selector">
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
            {filteredBySearch.length > 0 ? (
              renderItems(filteredBySearch)
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Aucune catégorie trouvée
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

export default CategorySelector;
