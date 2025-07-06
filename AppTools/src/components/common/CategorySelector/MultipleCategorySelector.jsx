// AppTools/src/components/common/CategorySelector/MultipleCategorySelector.jsx
import React, { useMemo } from 'react';
import { Plus, Star } from 'lucide-react';
import { SelectChip } from '../../atoms/Select';
import { useCategorySelector } from './hooks/useCategorySelector';
import { CategoryDropdown, CategoryList } from './components';

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
}) => {
  const {
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    expandedItems,
    containerRef,
    filteredData,
    searchResults,
    toggleExpand,
    getCategoryName,
    getCategoryPath,
  } = useCategorySelector({
    currentCategoryId,
    autoFocusOpen,
    disabled,
  });

  // ⚡ CORRECTION: Labels des catégories sélectionnées (manquait dans la version précédente)
  const selectedLabels = useMemo(() => {
    return selectedCategories
      .map((id) => ({
        id,
        name: getCategoryName(id) || 'Catégorie inconnue',
        path: getCategoryPath(id),
      }))
      .filter((item) => item.name !== 'Catégorie inconnue');
  }, [selectedCategories, getCategoryName, getCategoryPath]);

  // ⚡ CORRECTION: Placeholder par défaut (manquait aussi)
  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return selectedCategories.length > 0
      ? "Ajouter d'autres catégories"
      : 'Ajouter des catégories...';
  }, [placeholder, selectedCategories.length]);

  // ⚡ CORRECTION: Gestionnaires (manquaient aussi)
  const toggleCategory = (categoryId) => {
    let newCategories;
    let newPrimaryId = primaryCategoryId;

    if (selectedCategories.includes(categoryId)) {
      newCategories = selectedCategories.filter((id) => id !== categoryId);
      if (categoryId === primaryCategoryId) {
        newPrimaryId = newCategories.length > 0 ? newCategories[0] : '';
      }
    } else {
      newCategories = [...selectedCategories, categoryId];
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

    if (categoryId === primaryCategoryId) {
      newPrimaryId = newCategories.length > 0 ? newCategories[0] : '';
    }

    onMultipleChange({
      categories: newCategories,
      primaryId: newPrimaryId,
    });
  };

  const displayData = searchTerm ? searchResults : filteredData;

  return (
    <div ref={containerRef} className="category-selector relative">
      {/* Zone d'affichage des catégories sélectionnées */}
      <div className="space-y-3">
        {/* Chips des catégories sélectionnées */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((category) => {
              const isPrimary = category.id === primaryCategoryId;
              return (
                <SelectChip
                  key={category.id}
                  isPrimary={isPrimary}
                  onRemove={() => removeCategory(category.id)}
                  onPrimary={() => setPrimary(category.id)}
                  primaryToggle={!isPrimary}
                  title={category.path}
                  size="md"
                >
                  {category.name}
                </SelectChip>
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
      <CategoryDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearch={showSearch}
        containerRef={containerRef}
        className="mt-2 max-h-80"
      >
        <CategoryList
          items={displayData}
          mode="multiple"
          selectedValues={selectedCategories}
          primaryId={primaryCategoryId}
          searchTerm={searchTerm}
          expandedItems={expandedItems}
          showCounts={showCounts}
          onSelect={toggleCategory}
          onToggleExpand={toggleExpand}
          onSetPrimary={setPrimary}
        />
      </CategoryDropdown>

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
