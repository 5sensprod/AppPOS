import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Trash2,
  RefreshCw,
  FileText,
  ListFilter,
  Folder,
  FileOutput,
  FileSearch,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useHierarchicalCategories } from '../../../../features/categories/stores/categoryHierarchyStore';

// Styles CSS pour les animations des éléments du dropdown
const dropdownAnimationStyles = `
  @keyframes dropdownItemIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes dropdownItemOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-5px);
    }
  }
`;

// Ajouter les styles globalement une seule fois
(function addGlobalStyles() {
  if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = dropdownAnimationStyles;
    document.head.appendChild(styleElement);
  }
})();

// Composant HierarchicalCategorySelector adapté pour BatchActions
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

  // Recherche dans les catégories
  const filteredBySearch = React.useMemo(() => {
    if (!searchTerm) return hierarchicalData;

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

    return searchInHierarchy(hierarchicalData);
  }, [hierarchicalData, searchTerm]);

  // Auto-expansion lors de la recherche
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

  // Gestion du clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  // Ouvrir/fermer un élément
  const toggleExpand = (itemId, e) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Rendu récursif des éléments
  const renderItems = (items, level = 0) => {
    return items.map((item, index) => {
      const hasChildren = item.children && item.children.length > 0;
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
      {/* Barre de recherche */}
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

      {/* Liste des catégories */}
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

const MenuPortal = ({ isOpen, children, buttonRect }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className={`fixed transition-all duration-200 ease-in-out ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`}
      style={{
        top: `${buttonRect.bottom}px`,
        left: `${buttonRect.left}px`,
        width: `${Math.max(buttonRect.width, 320)}px`,
        zIndex: 99999,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// Composant Dropdown adapté pour la sélection hiérarchique
const HierarchicalDropdown = ({
  buttonLabel,
  buttonIcon: Icon,
  isOpen,
  toggleOpen,
  onSelect,
  buttonClass,
  hierarchicalData,
}) => {
  const buttonRef = useRef(null);
  const [buttonRect, setButtonRect] = useState({ top: 0, left: 0, bottom: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target)) {
        const menuElement = document.getElementById('hierarchical-dropdown-portal');
        if (!menuElement || !menuElement.contains(event.target)) {
          toggleOpen();
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`px-3 py-1 rounded-md flex items-center text-sm ${buttonClass}`}
        aria-label={buttonLabel}
      >
        {Icon && <Icon className="h-4 w-4 mr-1" />}
        {buttonLabel}
      </button>

      <MenuPortal isOpen={isOpen} buttonRect={buttonRect}>
        <div id="hierarchical-dropdown-portal">
          <HierarchicalCategorySelector
            hierarchicalData={hierarchicalData}
            onSelect={onSelect}
            isOpen={isOpen}
            onToggle={toggleOpen}
            placeholder="Sélectionner une catégorie"
          />
        </div>
      </MenuPortal>
    </div>
  );
};

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['delete', 'sync', 'export', 'status', 'category', 'createSheet'],
  onBatchDelete,
  onBatchSync,
  onBatchExport,
  onBatchStatusChange,
  onBatchCategoryChange,
  onCreateSheet,
  categoryOptions = [], // Conservé pour compatibilité descendante
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Utiliser les catégories hiérarchiques
  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  // Charger les catégories au montage si nécessaire
  useEffect(() => {
    if (hierarchicalCategories.length === 0 && !categoriesLoading) {
      fetchHierarchicalCategories();
    }
  }, [hierarchicalCategories, categoriesLoading, fetchHierarchicalCategories]);

  useEffect(() => {
    if (selectedItems.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [selectedItems.length]);

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  const statusOptions = [
    {
      value: 'published',
      label: 'Publié',
      color: 'bg-green-100 text-green-800 hover:bg-green-200',
    },
    { value: 'draft', label: 'Brouillon', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { value: 'archived', label: 'Archivé', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
  ];

  const actionsConfig = {
    createSheet: {
      available: typeof onCreateSheet === 'function',
      icon: FileOutput,
      label: 'Créer fiche',
      buttonClass: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
      onAction: () => onCreateSheet(selectedItems),
    },
    category: {
      available: hierarchicalCategories.length > 0 && typeof onBatchCategoryChange === 'function',
      icon: Folder,
      label: 'Catégorie',
      buttonClass: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800',
      isHierarchical: true,
      onSelect: (categoryId, categoryName) => {
        onBatchCategoryChange(selectedItems, categoryId);
        setOpenDropdown(null);
      },
    },
    status: {
      available: typeof onBatchStatusChange === 'function',
      icon: ListFilter,
      label: 'Statut',
      buttonClass: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
      options: statusOptions,
      onSelect: (value) => {
        onBatchStatusChange(selectedItems, value);
        setOpenDropdown(null);
      },
    },
    export: {
      available: typeof onBatchExport === 'function',
      icon: FileText,
      label: 'Exporter',
      buttonClass: 'bg-green-100 hover:bg-green-200 text-green-800',
      onAction: () => onBatchExport(selectedItems),
    },
    delete: {
      available: typeof onBatchDelete === 'function',
      icon: Trash2,
      label: 'Supprimer',
      buttonClass: 'bg-red-100 hover:bg-red-200 text-red-800',
      onAction: onBatchDelete,
    },
    sync: {
      available: typeof onBatchSync === 'function',
      icon: RefreshCw,
      label: 'Synchroniser',
      buttonClass: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
      onAction: onBatchSync,
    },
  };

  const availableBatchActions = batchActions.filter((action) => {
    const cfg = actionsConfig[action];
    return cfg && cfg.available;
  });

  // Composant Dropdown standard pour les options non-hiérarchiques
  const StandardDropdown = ({ action, cfg }) => {
    const buttonRef = useRef(null);
    const [buttonRect, setButtonRect] = useState({ top: 0, left: 0, bottom: 0, width: 0 });

    useEffect(() => {
      if (openDropdown === action && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          width: rect.width,
        });
      }
    }, [openDropdown, action]);

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpenDropdown(openDropdown === action ? null : action)}
          className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
          aria-label={cfg.label}
        >
          <cfg.icon className="h-4 w-4 mr-1" />
          {cfg.label}
        </button>

        <MenuPortal isOpen={openDropdown === action} buttonRect={buttonRect}>
          <div className="rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="py-1 max-h-64 overflow-y-auto">
              {cfg.options.map((opt, index) => (
                <button
                  key={opt.value}
                  onClick={() => cfg.onSelect(opt.value)}
                  className={`w-full text-left px-4 py-2 text-sm ${opt.color} transition-all hover:bg-gray-50 dark:hover:bg-gray-700`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animation:
                      openDropdown === action
                        ? 'dropdownItemIn 200ms forwards'
                        : 'dropdownItemOut 200ms forwards',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </MenuPortal>
      </div>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out overflow-hidden z-30 ${
        isVisible ? 'opacity-100 max-h-24 p-4' : 'opacity-0 max-h-0 p-0 border-b-0'
      }`}
    >
      <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel}
      </div>

      <div className="flex space-x-2">
        {availableBatchActions.map((action) => {
          const cfg = actionsConfig[action];
          if (!cfg) return null;

          // Action hiérarchique (catégories)
          if (cfg.isHierarchical) {
            return (
              <HierarchicalDropdown
                key={action}
                buttonLabel={cfg.label}
                buttonIcon={cfg.icon}
                isOpen={openDropdown === action}
                toggleOpen={() => setOpenDropdown(openDropdown === action ? null : action)}
                onSelect={cfg.onSelect}
                buttonClass={cfg.buttonClass}
                hierarchicalData={hierarchicalCategories}
              />
            );
          }

          // Action avec options (dropdown standard)
          if (cfg.options) {
            return <StandardDropdown key={action} action={action} cfg={cfg} />;
          }

          // Action simple (bouton)
          return (
            <button
              key={action}
              onClick={cfg.onAction}
              className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
              aria-label={cfg.label}
            >
              <cfg.icon className="h-4 w-4 mr-1" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BatchActions;
