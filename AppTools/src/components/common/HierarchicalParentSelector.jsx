// src/components/common/HierarchicalParentSelector/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';

const HierarchicalParentSelector = ({
  hierarchicalData = [],
  value = '',
  onChange,
  disabled = false,
  currentCategoryId = null,
  placeholder = 'Sélectionner une catégorie parent',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Filtrer les catégories qu'on ne peut pas sélectionner comme parent
  const filteredData = useMemo(() => {
    // En mode édition, on doit filtrer uniquement la catégorie actuelle et ses descendants
    if (currentCategoryId) {
      // Fonction pour trouver les IDs des descendants à exclure
      const findDescendantIds = (items, targetId, descendantIds = new Set()) => {
        for (const item of items) {
          if (item._id === targetId) {
            // Trouvé la catégorie actuelle, ajouter ses descendants
            if (item.children && item.children.length > 0) {
              // Ajouter tous les descendants récursivement
              const addAllDescendants = (children) => {
                for (const child of children) {
                  descendantIds.add(child._id);
                  if (child.children && child.children.length > 0) {
                    addAllDescendants(child.children);
                  }
                }
              };
              addAllDescendants(item.children);
            }
            // Également ajouter la catégorie elle-même
            descendantIds.add(targetId);
            return descendantIds;
          }

          // Chercher dans les enfants
          if (item.children && item.children.length > 0) {
            findDescendantIds(item.children, targetId, descendantIds);
          }
        }
        return descendantIds;
      };

      // Obtenir les IDs à exclure
      const excludedIds = findDescendantIds(hierarchicalData, currentCategoryId);

      console.log('Catégories exclues:', [...excludedIds]);

      // Fonction de filtrage qui préserve la structure hiérarchique
      const filterHierarchy = (items) => {
        return items
          .map((item) => ({
            ...item,
            // Garder l'item s'il n'est pas exclu
            children: item.children ? filterHierarchy(item.children) : [],
          }))
          .filter((item) => !excludedIds.has(item._id));
      };

      return filterHierarchy(hierarchicalData);
    }

    // En mode création, on affiche toutes les catégories
    return hierarchicalData;
  }, [hierarchicalData, currentCategoryId]);
  // Recherche dans les catégories
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

  // Trouver et afficher le nom de la catégorie sélectionnée
  const selectedLabel = useMemo(() => {
    if (!value) return '';

    const findLabel = (items) => {
      for (const item of items) {
        if (item._id === value) {
          return item.path_string || item.name;
        }
        if (item.children && item.children.length > 0) {
          const childLabel = findLabel(item.children);
          if (childLabel) return childLabel;
        }
      }
      return '';
    };

    // Rechercher dans toutes les données, pas seulement filtrées
    return findLabel(hierarchicalData);
  }, [value, hierarchicalData]);

  // Gestion du clic en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.hierarchical-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Ouvrir/fermer un élément
  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Rendu récursif des éléments
  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems[item._id];
      const isSelected = value === item._id;
      const childCount = hasChildren ? item.children.length : 0;

      return (
        <div key={item._id}>
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={() => {
              onChange(item._id);
              setIsOpen(false);
            }}
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

  // Afficher le menu complet pour les inspections
  // En mode développement seulement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('HierarchicalParentSelector - Data:', {
        hierarchicalData,
        filteredData,
        currentCategoryId,
        value,
      });
    }
  }, [hierarchicalData, filteredData, currentCategoryId, value]);

  useEffect(() => {
    if (!value) return;

    // Fonction pour trouver et développer le chemin vers la valeur
    const expandPathToValue = (items) => {
      for (const item of items) {
        if (item._id === value) {
          return true; // Trouvé!
        }

        if (item.children && item.children.length > 0) {
          const foundInChildren = expandPathToValue(item.children);
          if (foundInChildren) {
            // Développer ce nœud parent car la valeur est dans ses enfants
            setExpandedItems((prev) => ({ ...prev, [item._id]: true }));
            return true;
          }
        }
      }
      return false;
    };

    expandPathToValue(hierarchicalData);
  }, [value, hierarchicalData]);

  return (
    <div className="hierarchical-selector relative">
      <div
        className={`border rounded-md px-3 py-2 flex justify-between items-center cursor-pointer ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate text-gray-700 dark:text-gray-300">
          {selectedLabel || placeholder}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
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
            {/* Option "Aucune" (catégorie racine) */}
            <div
              className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              <span className="text-gray-500 dark:text-gray-400">Aucune (catégorie racine)</span>
              {value === '' && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
            </div>

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
};

export default HierarchicalParentSelector;
