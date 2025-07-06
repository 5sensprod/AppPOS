// src/components/common/CategorySelector/SingleCategorySelector.jsx
import React, { useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useCategorySelector } from './hooks/useCategorySelector';
import { CategoryDropdown, CategoryList } from './components';

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
}) => {
  const {
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    expandedItems,
    setExpandedItems,
    containerRef,
    filteredData,
    searchResults,
    toggleExpand,
    getCategoryPath,
  } = useCategorySelector({
    currentCategoryId,
    autoFocusOpen,
    disabled,
  });

  // Label sélectionné
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return getCategoryPath(value) || 'Catégorie inconnue';
  }, [value, getCategoryPath]);

  // Placeholder par défaut
  const defaultPlaceholder = placeholder || 'Sélectionner une catégorie';

  // Expansion automatique vers la valeur sélectionnée
  React.useEffect(() => {
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
  }, [value, filteredData, setExpandedItems]);

  // Gestionnaires
  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const displayData = searchTerm ? searchResults : filteredData;

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
      <CategoryDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearch={showSearch}
      >
        {/* Option "Aucune" */}
        {allowRootSelection && !searchTerm && (
          <div
            className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => handleSelect('')}
          >
            <span className="text-gray-500 dark:text-gray-400">Aucune (catégorie racine)</span>
            {value === '' && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
          </div>
        )}

        {/* Liste des catégories */}
        <CategoryList
          items={displayData}
          mode="single"
          selectedValue={value}
          searchTerm={searchTerm}
          expandedItems={expandedItems}
          showCounts={showCounts}
          onSelect={handleSelect}
          onToggleExpand={toggleExpand}
        />
      </CategoryDropdown>
    </div>
  );
};

export default SingleCategorySelector;
