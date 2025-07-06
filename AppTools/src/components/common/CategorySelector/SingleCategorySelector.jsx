// AppTools/src/components/common/CategorySelector/SingleCategorySelector.jsx
import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { SelectField } from '../../atoms/Select';
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
  variant = 'default', // ⚡ NOUVEAU: Support des variants
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

  const handleFieldClick = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const displayData = searchTerm ? searchResults : filteredData;

  // ⚡ NOUVEAU: Adaptations selon le variant
  const isPortalVariant = variant === 'portal';
  const containerClassName = isPortalVariant
    ? 'category-selector' // Pas de relative en mode portal
    : 'category-selector relative';

  // ⚡ NOUVEAU: Rendu spécial pour le variant portal (dropdown only)
  if (isPortalVariant) {
    return (
      <div ref={containerRef} className={containerClassName}>
        {/* Pas de SelectField en mode portal, directement le dropdown */}
        <CategoryDropdown
          isOpen={true} // Toujours ouvert en mode portal
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showSearch={showSearch}
          containerRef={containerRef}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80"
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
  }

  // Rendu normal (avec SelectField)
  return (
    <div ref={containerRef} className={containerClassName}>
      {/* Champ de sélection */}
      <SelectField
        value={selectedLabel}
        placeholder={defaultPlaceholder}
        isOpen={isOpen}
        disabled={disabled}
        onClick={handleFieldClick}
      />

      {/* Dropdown */}
      <CategoryDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearch={showSearch}
        containerRef={containerRef}
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
