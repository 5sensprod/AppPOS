//AppTools\src\components\common\EntityTable\components\UnifiedFilterBar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { X, Filter, ChevronDown, Trash2 } from 'lucide-react';
import CategorySelector from '../../../common/CategorySelector';
import { useClickOutside } from './BatchActions/hooks/useClickOutside';
import { useCategoryUtils } from '../../../hooks/useCategoryUtils';

const UnifiedFilterBar = ({
  filterOptions = [],
  selectedFilters = [],
  onChange,
  enableCategories = true,
  enableStatusFilter = true,
}) => {
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterType, setNewFilterType] = useState(null);
  const [selectedCategoriesForFilter, setSelectedCategoriesForFilter] = useState([]);
  const valueSelectRef = useRef(null);
  const filterButtonRef = useRef(null);

  // ✅ Hook simplifié - plus besoin de fetchHierarchicalCategories
  const { getCategoryName, isReady: categoriesReady, categoriesLoading } = useCategoryUtils();

  const closeFilterDropdown = () => {
    setIsAddingFilter(false);
    setNewFilterType(null);
    setSelectedCategoriesForFilter([]);
  };

  useClickOutside(valueSelectRef, isAddingFilter, closeFilterDropdown);

  const allFilterOptions = useMemo(() => {
    return filterOptions;
  }, [filterOptions]);

  const filterGroups = useMemo(() => {
    return allFilterOptions.reduce((acc, option) => {
      if (!acc[option.type]) acc[option.type] = [];
      acc[option.type].push(option);
      return acc;
    }, {});
  }, [allFilterOptions]);

  const filterTypeLabels = {
    woo: 'Synchro',
    status: 'Statut',
    image: 'Image',
    supplier: 'Fournisseur',
    description: 'Description',
    brand: 'Marque',
    category: 'Catégorie',
    barcode: 'Code barre',
  };

  const selectedTypes = new Set(selectedFilters.map((f) => f.type));
  const selectedValues = new Set(selectedFilters.map((f) => `${f.type}:${f.value}`));

  const availableTypes = useMemo(() => {
    const baseTypes = Object.entries(filterGroups)
      .filter(([type]) => {
        const allowMultiple = ['supplier', 'brand', 'category'].includes(type);
        return allowMultiple || !selectedTypes.has(type);
      })
      .map(([type]) => ({
        label: filterTypeLabels[type] || type,
        value: type,
      }));

    if (enableCategories && categoriesReady) {
      if (!baseTypes.find((type) => type.value === 'category')) {
        baseTypes.push({
          label: filterTypeLabels.category,
          value: 'category',
        });
      }
    }

    return baseTypes.sort((a, b) => {
      const order = ['woo', 'status', 'image', 'description', 'category', 'brand', 'supplier'];
      return order.indexOf(a.value) - order.indexOf(b.value);
    });
  }, [filterGroups, selectedTypes, enableCategories, categoriesReady]);

  const handleTypeSelect = (selected) => {
    setNewFilterType(selected?.value || null);
    setIsAddingFilter(true);
    setSelectedCategoriesForFilter([]);
  };

  const handleValueSelect = (selected) => {
    if (!newFilterType || !selected || newFilterType === 'category') return;

    const isMulti = ['supplier', 'brand'].includes(newFilterType);
    const selectedValuesList = Array.isArray(selected) ? selected : [selected];

    const newFilters = selectedValuesList
      .filter((s) => !selectedValues.has(`${newFilterType}:${s.value}`))
      .map((s) => ({
        type: newFilterType,
        value: s.value,
        label: s.label,
      }));

    let updatedFilters;
    if (isMulti) {
      updatedFilters = [...selectedFilters, ...newFilters];
    } else {
      updatedFilters = [...selectedFilters.filter((f) => f.type !== newFilterType), ...newFilters];
    }

    onChange(updatedFilters);
    closeFilterDropdown();
  };

  const handleRemoveFilter = (filterToRemove) => {
    onChange(
      selectedFilters.filter(
        (f) => !(f.type === filterToRemove.type && f.value === filterToRemove.value)
      )
    );
  };

  const handleClearAll = () => {
    onChange([]);
    closeFilterDropdown();
  };

  const getOptionsForType = (type) => {
    if (type === 'category') return [];
    const selectedFilterValues = selectedFilters.filter((f) => f.type === type).map((f) => f.value);
    const options = (filterGroups[type] || []).map((opt) => ({
      ...opt,
      isDisabled: selectedFilterValues.includes(opt.value),
    }));

    if (type === 'brand' || type === 'supplier') {
      return options.sort((a, b) => a.label.localeCompare(b.label));
    }

    return options;
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ position: 'relative', zIndex: 1000 }}
    >
      {isAddingFilter && newFilterType === 'category' && categoriesLoading && (
        <div className="px-3 py-2 text-sm text-gray-500">Chargement des catégories...</div>
      )}

      {!isAddingFilter && availableTypes.length > 0 && (
        <div ref={filterButtonRef} className="relative">
          <Select
            options={availableTypes}
            onChange={handleTypeSelect}
            placeholder={
              <div className="flex items-center gap-1.5 text-gray-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Ajouter un filtre</span>
              </div>
            }
            classNamePrefix="react-select"
            className="w-64"
            menuPortalTarget={document.body}
            menuPlacement="auto"
            menuPosition="fixed"
            isSearchable={false}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 99999 }),
            }}
            components={{
              DropdownIndicator: ({ innerProps }) => (
                <div {...innerProps}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              ),
            }}
          />
        </div>
      )}

      {isAddingFilter && newFilterType === 'category' && !categoriesLoading && (
        <div ref={valueSelectRef} className="relative">
          <div className="w-80" style={{ position: 'relative', zIndex: 99999 }}>
            {/* ✅ CategorySelector simplifié */}
            <CategorySelector
              mode="single"
              value={''}
              theme="elegant"
              onChange={(selectedCategoryId) => {
                if (selectedCategoryId) {
                  let categoryName;

                  // ✅ NOUVEAU - Gestion spéciale pour "Sans catégorie"
                  if (selectedCategoryId === 'no_category') {
                    categoryName = 'Sans catégorie';
                  } else {
                    categoryName = getCategoryName(selectedCategoryId);

                    if (!categoryName) {
                      const existingFilter = selectedFilters.find(
                        (f) => f.type === 'category' && f.value === selectedCategoryId
                      );
                      categoryName = existingFilter?.label;
                    }

                    if (!categoryName) {
                      console.warn('Catégorie non trouvée:', selectedCategoryId);
                      categoryName = `Catégorie ${selectedCategoryId.slice(-6)}`;
                    }
                  }

                  const newFilter = {
                    type: 'category',
                    value: selectedCategoryId,
                    label: categoryName,
                  };

                  if (!selectedValues.has(`category:${selectedCategoryId}`)) {
                    onChange([...selectedFilters, newFilter]);
                  }
                }

                closeFilterDropdown();
              }}
              placeholder="Sélectionner une catégorie"
              allowRootSelection={false}
              showSearch={true}
              showCounts={true}
              autoFocusOpen={true}
            />
          </div>
        </div>
      )}

      {isAddingFilter && newFilterType && newFilterType !== 'category' && (
        <div ref={valueSelectRef} className="relative">
          <Select
            options={getOptionsForType(newFilterType)}
            onChange={handleValueSelect}
            placeholder={`Choisir ${filterTypeLabels[newFilterType]?.toLowerCase()}`}
            isMulti={['supplier', 'brand'].includes(newFilterType)}
            classNamePrefix="react-select"
            className="w-64"
            autoFocus
            menuIsOpen={true}
            menuPortalTarget={document.body}
            menuPlacement="auto"
            menuPosition="fixed"
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 99999 }),
            }}
            onMenuClose={closeFilterDropdown}
            onBlur={closeFilterDropdown}
          />
        </div>
      )}

      {selectedFilters.map((filter, idx) => (
        <div
          key={`${filter.type}-${filter.value}-${idx}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md border border-blue-200 dark:border-blue-700 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <span
            className="font-medium text-xs cursor-pointer"
            title="Cliquer pour modifier ce filtre"
            onClick={() => {
              setNewFilterType(filter.type);
              setIsAddingFilter(true);
              if (filter.type === 'category') {
                setSelectedCategoriesForFilter([filter.value]);
              }
            }}
          >
            {filter.label}
          </span>
          <button
            onClick={() => handleRemoveFilter(filter)}
            className="flex items-center justify-center w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
            title="Supprimer ce filtre"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}

      {selectedFilters.length > 0 && (
        <button
          onClick={handleClearAll}
          className="flex items-center justify-center h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md border border-red-200 dark:border-red-700 transition-colors"
          title="Effacer tous les filtres"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default UnifiedFilterBar;
