// src/components/common/CategorySelector/MultipleCategorySelector.jsx
import React, { useMemo } from 'react';
import { Plus, X, Star } from 'lucide-react';
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

  // Labels des catégories sélectionnées
  const selectedLabels = useMemo(() => {
    return selectedCategories
      .map((id) => ({
        id,
        name: getCategoryName(id) || 'Catégorie inconnue',
        path: getCategoryPath(id),
      }))
      .filter((item) => item.name !== 'Catégorie inconnue');
  }, [selectedCategories, getCategoryName, getCategoryPath]);

  // Placeholder par défaut
  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return selectedCategories.length > 0
      ? "Ajouter d'autres catégories"
      : 'Ajouter des catégories...';
  }, [placeholder, selectedCategories.length]);

  // Gestionnaires
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
    <div ref={containerRef} className="category-selector">
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
                  title={category.path}
                >
                  {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
                  <span className="mr-2">{category.name}</span>

                  {!isPrimary && (
                    <button
                      onClick={() => setPrimary(category.id)}
                      className="mr-1 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="Définir comme principale"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}

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
      <CategoryDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearch={showSearch}
        className="mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden"
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
