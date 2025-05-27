// components/HierarchicalCategorySelector.jsx - Version avec hook d'animation centralisé
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useDropdownItemAnimation } from '../hooks/useDropdownItemAnimation';

const HierarchicalCategorySelector = ({
  hierarchicalData = [],
  onSelect,
  isOpen, // Maintenant isVisible depuis le parent
  onToggle,
  placeholder = 'Sélectionner une catégorie',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Recherche dans les catégories
  const filteredBySearch = React.useMemo(() => {
    if (!searchTerm) return hierarchicalData;

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
            return { ...item, children: filteredChildren };
          }

          return null;
        })
        .filter(Boolean);
    };

    return searchInHierarchy(hierarchicalData);
  }, [hierarchicalData, searchTerm]);

  // Auto-expansion lors de la recherche
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

  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Fonction récursive pour compter tous les items visibles
  const countAllItems = (items) => {
    let count = 0;
    items.forEach((item) => {
      count++; // Compter l'item actuel
      if (item.children?.length > 0 && expandedItems[item._id]) {
        count += countAllItems(item.children); // Compter les enfants s'ils sont expandés
      }
    });
    return count;
  };

  const totalItemCount = countAllItems(filteredBySearch);

  // Hook d'animation centralisé
  const { getItemAnimation } = useDropdownItemAnimation(isOpen, totalItemCount);

  const renderItems = (items, level = 0, startIndex = 0) => {
    let currentIndex = startIndex;

    return items.map((item) => {
      const itemIndex = currentIndex++;
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const childCount = hasChildren ? item.children.length : 0;

      const itemElement = (
        <div key={`${item._id}-${level}`}>
          <div
            {...getItemAnimation(itemIndex, {
              baseClasses: 'flex items-center px-3 py-2 cursor-pointer',
              hoverClasses: 'hover:bg-gray-100 dark:hover:bg-gray-700',
            })}
            style={{
              ...getItemAnimation(itemIndex).style,
              paddingLeft: `${12 + level * 20}px`,
            }}
            onClick={() => {
              onSelect(item._id, item.name);
              onToggle();
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="p-1 mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                onClick={(e) => toggleExpand(item._id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <span className="flex-grow truncate text-sm">{item.name}</span>

            {hasChildren && <span className="text-xs text-gray-500 ml-2">({childCount})</span>}
          </div>

          {hasChildren && isExpanded && renderItems(item.children, level + 1, currentIndex)}
        </div>
      );

      // Mettre à jour currentIndex pour les enfants si ils sont expandés
      if (hasChildren && isExpanded) {
        currentIndex += countAllItems(item.children);
      }

      return itemElement;
    });
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-96 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Rechercher une catégorie..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="overflow-y-auto max-h-80">
        {filteredBySearch.length > 0 ? (
          renderItems(filteredBySearch)
        ) : (
          <div
            className={`p-3 text-center text-gray-500 dark:text-gray-400 text-sm transition-all duration-150 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Aucune catégorie trouvée
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalCategorySelector;
