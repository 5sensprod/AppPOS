// src/components/common/fields/CategorySelectField/index.jsx
import React from 'react';
import { useCategoryData } from './hooks/useCategoryData';
import { useCategorySelector } from './hooks/useCategorySelector';
import CategoryField from './components/CategoryField';
import CategoryDropdown from './components/CategoryDropdown';
import LoadingField from './components/LoadingField';

const CategorySelectField = ({
  hierarchicalData = null,
  value = '',
  onChange,
  placeholder = 'Sélectionner une catégorie',
  disabled = false,
  allowRootSelection = true,
  showSearch = true,
  autoFocus = false,
  excludeIds = [],
}) => {
  const categoryData = useCategoryData({ hierarchicalData, excludeIds });
  const selectorState = useCategorySelector({
    value,
    onChange,
    categoryData,
    autoFocus,
    disabled,
  });

  if (categoryData.isLoading) {
    return <LoadingField />;
  }

  return (
    <div className="category-selector relative">
      <CategoryField
        selectedLabel={selectorState.selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        isOpen={selectorState.isOpen}
        onToggle={selectorState.toggleOpen}
      />

      {selectorState.isOpen && (
        <CategoryDropdown
          searchResults={selectorState.searchResults}
          searchTerm={selectorState.searchTerm}
          onSearchChange={selectorState.setSearchTerm}
          expandedItems={selectorState.expandedItems}
          onToggleExpand={selectorState.toggleExpand}
          selectedValue={value}
          onSelect={selectorState.handleSelect}
          allowRootSelection={allowRootSelection}
          showSearch={showSearch}
        />
      )}
    </div>
  );
};

export default CategorySelectField;
