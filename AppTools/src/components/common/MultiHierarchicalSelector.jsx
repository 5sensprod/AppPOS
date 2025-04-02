// src/components/common/MultiHierarchicalSelector/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, X } from 'lucide-react';

const MultiHierarchicalSelector = ({
  hierarchicalData = [],
  values = [],
  onChange,
  disabled = false,
  currentSelected = [],
  placeholder = 'Sélectionner des catégories',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedItems, setSelectedItems] = useState(values || []);

  // Mettre à jour les valeurs sélectionnées quand les props values changent
  useEffect(() => {
    setSelectedItems(values || []);
  }, [values]);

  // Filtrer les catégories déjà sélectionnées dans la catégorie principale
  const filteredData = useMemo(() => {
    // Fonction pour filtrer les catégories déjà sélectionnées comme principales
    const excludeIds = new Set([...currentSelected]);

    const filterHierarchy = (items) => {
      return items.map((item) => ({
        ...item,
        children: item.children ? filterHierarchy(item.children) : [],
      }));
    };

    return filterHierarchy(hierarchicalData);
  }, [hierarchicalData, currentSelected]);

  // Filtrer par recherche
  const filteredBySearch = useMemo(() => {
    if (!searchTerm) return filteredData;

    const lowerSearchTerm = searchTerm.toLowerCase();

    const searchInHierarchy = (items) => {
      return items
        .map((item) => {
          let filteredChildren = [];

          if (item.children && item.children.length > 0) {
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

  // Développer automatiquement les catégories contenant des résultats de recherche
  useEffect(() => {
    if (!searchTerm) return;

    const expanded = {};

    const markExpanded = (items) => {
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          expanded[item._id] = true;
          markExpanded(item.children);
        }
      }
    };

    markExpanded(filteredBySearch);
    setExpandedItems((prev) => ({ ...prev, ...expanded }));
  }, [filteredBySearch, searchTerm]);

  // Trouver les labels des éléments sélectionnés
  const selectedLabels = useMemo(() => {
    const labels = [];

    const findLabelsInHierarchy = (items, ids) => {
      items.forEach((item) => {
        if (ids.includes(item._id)) {
          labels.push({
            id: item._id,
            name: item.name || 'Sans nom',
          });
        }

        if (item.children && item.children.length > 0) {
          findLabelsInHierarchy(item.children, ids);
        }
      });
    };

    findLabelsInHierarchy(hierarchicalData, selectedItems);
    return labels;
  }, [selectedItems, hierarchicalData]);

  // Gestion du clic en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.multi-hierarchical-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Toggle un élément (sélection/désélection)
  const toggleItem = (itemId) => {
    setSelectedItems((prev) => {
      const newSelection = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      // Met à jour le champ du form après l'état local
      // => pas dans le même cycle de rendu
      setTimeout(() => onChange(newSelection), 0);
      return newSelection;
    });
  };

  // Ouvrir/fermer un nœud (expand/collapse)
  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Supprimer un élément sélectionné
  const removeItem = (itemId) => {
    setSelectedItems((prev) => {
      const newSelection = prev.filter((id) => id !== itemId);
      setTimeout(() => onChange(newSelection), 0);
      return newSelection;
    });
  };

  // Rendu récursif des éléments
  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems[item._id];
      const isSelected = selectedItems.includes(item._id);
      const childCount = hasChildren ? item.children.length : 0;

      return (
        <div key={item._id}>
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={() => toggleItem(item._id)}
          >
            {hasChildren ? (
              <button
                type="button"
                className="p-1 mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                onClick={(e) => toggleExpand(item._id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <span className="flex-grow truncate">{item.name}</span>

            {hasChildren && <span className="text-xs text-gray-500 ml-2">({childCount})</span>}

            {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
          </div>

          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="multi-hierarchical-selector relative">
      <div
        className={`border rounded-md px-3 py-2 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700 cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((item) => (
              <div
                key={item.id}
                className="flex items-center bg-blue-100 dark:bg-blue-800 rounded-md px-2 py-1"
              >
                <span className="text-sm text-blue-800 dark:text-blue-200 mr-1">{item.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 dark:text-gray-500">{placeholder}</div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-72 overflow-auto">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto max-h-56">
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
};

export default MultiHierarchicalSelector;
