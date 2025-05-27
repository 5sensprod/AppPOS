// components/HierarchicalCategorySelector.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

const HierarchicalCategorySelector = ({
  hierarchicalData = [],
  onSelect,
  isOpen,
  onToggle,
  placeholder = 'Sélectionner une catégorie',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, isOpen, onToggle);

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

  const renderItems = (items, level = 0) => {
    return items.map((item, index) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const childCount = hasChildren ? item.children.length : 0;

      return (
        <div key={item._id}>
          <div
            className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
            style={{
              paddingLeft: `${12 + level * 20}px`,
              animationDelay: `${index * 30}ms`,
              animation: isOpen
                ? 'dropdownItemIn 200ms forwards'
                : 'dropdownItemOut 200ms forwards',
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

          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-[99999] mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-96 overflow-hidden"
      style={{ top: '100%', left: 0 }}
    >
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
          <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
            Aucune catégorie trouvée
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalCategorySelector;
