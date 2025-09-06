//AppTools\src\components\common\EntityTable\components\UnifiedFilterBar.jsx
import React, { useState, useRef, useMemo } from 'react';
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
  productsData = [],
}) => {
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterType, setNewFilterType] = useState(null);
  const [selectedCategoriesForFilter, setSelectedCategoriesForFilter] = useState([]);
  const [stockInputValue, setStockInputValue] = useState('');
  const valueSelectRef = useRef(null);
  const filterButtonRef = useRef(null);
  const stockInputRef = useRef(null);

  const [stockFilterMode, setStockFilterMode] = useState('exact'); // 'exact', 'min', 'max', 'range'
  const [stockMinValue, setStockMinValue] = useState('');
  const [stockMaxValue, setStockMaxValue] = useState('');

  // ✅ Hook simplifié - plus besoin de fetchHierarchicalCategories
  const { getCategoryName, isReady: categoriesReady, categoriesLoading } = useCategoryUtils();

  const closeFilterDropdown = () => {
    setIsAddingFilter(false);
    setNewFilterType(null);
    setSelectedCategoriesForFilter([]);
    setStockInputValue('');
    setStockFilterMode('exact');
    setStockMinValue('');
    setStockMaxValue('');
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
    stock: 'Stock', // ✅ NOUVEAU
  };

  const selectedTypes = new Set(selectedFilters.map((f) => f.type));
  const selectedValues = new Set(selectedFilters.map((f) => `${f.type}:${f.value}`));

  const availableTypes = useMemo(() => {
    const baseTypes = Object.entries(filterGroups)
      .filter(([type]) => {
        const allowMultiple = ['supplier', 'brand', 'category', 'barcode'].includes(type); // ✅ Ajout stock
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

    // ✅ Ajouter le filtre stock s'il n'existe pas dans filterGroups
    if (!baseTypes.find((type) => type.value === 'stock')) {
      baseTypes.push({
        label: filterTypeLabels.stock,
        value: 'stock',
      });
    }

    return baseTypes.sort((a, b) => {
      const order = [
        'woo',
        'status',
        'image',
        'description',
        'category',
        'brand',
        'supplier',
        'barcode',
        'stock', // ✅ Ajout stock
      ];
      return order.indexOf(a.value) - order.indexOf(b.value);
    });
  }, [filterGroups, selectedTypes, enableCategories, categoriesReady]);

  const handleTypeSelect = (selected) => {
    setNewFilterType(selected?.value || null);
    setIsAddingFilter(true);
    setSelectedCategoriesForFilter([]);
    setStockInputValue('');

    // ✅ Auto-focus pour l'input stock
    if (selected?.value === 'stock') {
      setTimeout(() => {
        if (stockInputRef.current) {
          stockInputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleValueSelect = (selected) => {
    if (!newFilterType || !selected || newFilterType === 'category' || newFilterType === 'stock')
      return;

    const isMulti = ['supplier', 'brand', 'barcode'].includes(newFilterType);
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

  // ✅ Nouvelle fonction pour gérer l'input stock
  const handleStockInputSubmit = () => {
    if (newFilterType !== 'stock') return;

    let newFilter = null;

    switch (stockFilterMode) {
      case 'exact':
        if (!stockInputValue || stockInputValue.trim() === '') return;
        const exactValue = parseInt(stockInputValue.trim(), 10);
        if (isNaN(exactValue) || exactValue < 0) return;
        newFilter = {
          type: 'stock',
          mode: 'exact',
          value: exactValue,
          label: `Stock = ${exactValue}`,
        };
        break;

      case 'min':
        if (!stockInputValue || stockInputValue.trim() === '') return;
        const minValue = parseInt(stockInputValue.trim(), 10);
        if (isNaN(minValue) || minValue < 0) return;
        newFilter = {
          type: 'stock',
          mode: 'min',
          value: minValue,
          label: `Stock ≥ ${minValue}`,
        };
        break;

      case 'max':
        if (!stockInputValue || stockInputValue.trim() === '') return;
        const maxValue = parseInt(stockInputValue.trim(), 10);
        if (isNaN(maxValue) || maxValue < 0) return;
        newFilter = {
          type: 'stock',
          mode: 'max',
          value: maxValue,
          label: `Stock ≤ ${maxValue}`,
        };
        break;

      case 'range':
        if (
          !stockMinValue ||
          !stockMaxValue ||
          stockMinValue.trim() === '' ||
          stockMaxValue.trim() === ''
        )
          return;
        const rangeMin = parseInt(stockMinValue.trim(), 10);
        const rangeMax = parseInt(stockMaxValue.trim(), 10);
        if (
          isNaN(rangeMin) ||
          isNaN(rangeMax) ||
          rangeMin < 0 ||
          rangeMax < 0 ||
          rangeMin > rangeMax
        )
          return;
        newFilter = {
          type: 'stock',
          mode: 'range',
          value: { min: rangeMin, max: rangeMax },
          label: `Stock ${rangeMin}-${rangeMax}`,
        };
        break;

      case 'zero':
        newFilter = {
          type: 'stock',
          mode: 'zero',
          value: 0,
          label: 'Rupture de stock',
        };
        break;

      case 'low':
        newFilter = {
          type: 'stock',
          mode: 'low',
          value: 5,
          label: 'Stock faible (≤ 5)',
        };
        break;

      default:
        return;
    }

    if (!newFilter) return;

    // Supprimer tous les anciens filtres stock et ajouter le nouveau
    const filtersWithoutStock = selectedFilters.filter((f) => f.type !== 'stock');
    onChange([...filtersWithoutStock, newFilter]);
    closeFilterDropdown();
  };

  // ✅ Gérer la touche Entrée pour l'input stock
  const handleStockInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStockInputSubmit();
    } else if (e.key === 'Escape') {
      closeFilterDropdown();
    }
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
    if (type === 'category' || type === 'stock') return [];
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
            {/* ✅ CategorySelector avec productsData */}
            <CategorySelector
              mode="single"
              value={''}
              theme="elegant"
              onChange={(selectedCategoryId) => {
                if (selectedCategoryId) {
                  let categoryName;

                  // ✅ Gestion spéciale pour "Sans catégorie"
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
              productsData={productsData} // ✅ Passer les données des produits filtrés
            />
          </div>
        </div>
      )}

      {/* ✅ NOUVEAU - Input pour le filtre stock */}
      {isAddingFilter && newFilterType === 'stock' && (
        <div ref={valueSelectRef} className="relative">
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3 shadow-sm min-w-80">
            {/* Sélecteur de mode */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de filtre
              </label>
              <select
                value={stockFilterMode}
                onChange={(e) => setStockFilterMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="exact">Stock exactement égal à</option>
                <option value="min">Stock minimum</option>
                <option value="max">Stock maximum</option>
                <option value="range">Stock entre (plage)</option>
                <option value="zero">Stock à zéro (rupture)</option>
                <option value="low">Stock faible (≤ 5)</option>
              </select>
            </div>

            {/* Inputs selon le mode sélectionné */}
            <div className="mb-3">
              {stockFilterMode === 'exact' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Quantité exacte
                  </label>
                  <input
                    ref={stockInputRef}
                    type="number"
                    min="0"
                    value={stockInputValue}
                    onChange={(e) => setStockInputValue(e.target.value)}
                    onKeyDown={handleStockInputKeyDown}
                    placeholder="Quantité en stock"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {stockFilterMode === 'min' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Stock minimum
                  </label>
                  <input
                    ref={stockInputRef}
                    type="number"
                    min="0"
                    value={stockInputValue}
                    onChange={(e) => setStockInputValue(e.target.value)}
                    onKeyDown={handleStockInputKeyDown}
                    placeholder="Stock ≥"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {stockFilterMode === 'max' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Stock maximum
                  </label>
                  <input
                    ref={stockInputRef}
                    type="number"
                    min="0"
                    value={stockInputValue}
                    onChange={(e) => setStockInputValue(e.target.value)}
                    onKeyDown={handleStockInputKeyDown}
                    placeholder="Stock ≤"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {stockFilterMode === 'range' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Minimum
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockMinValue}
                      onChange={(e) => setStockMinValue(e.target.value)}
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Maximum
                    </label>
                    <input
                      ref={stockInputRef}
                      type="number"
                      min="0"
                      value={stockMaxValue}
                      onChange={(e) => setStockMaxValue(e.target.value)}
                      onKeyDown={handleStockInputKeyDown}
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {(stockFilterMode === 'zero' || stockFilterMode === 'low') && (
                <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {stockFilterMode === 'zero'
                    ? 'Affiche les produits en rupture de stock (stock = 0)'
                    : 'Affiche les produits avec un stock faible (≤ 5 unités)'}
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2">
              <button
                onClick={handleStockInputSubmit}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Appliquer
              </button>
              <button
                onClick={closeFilterDropdown}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingFilter &&
        newFilterType &&
        newFilterType !== 'category' &&
        newFilterType !== 'stock' && (
          <div ref={valueSelectRef} className="relative">
            <Select
              options={getOptionsForType(newFilterType)}
              onChange={handleValueSelect}
              placeholder={`Choisir ${filterTypeLabels[newFilterType]?.toLowerCase()}`}
              isMulti={['supplier', 'brand', 'barcode'].includes(newFilterType)}
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
              } else if (filter.type === 'stock') {
                setStockInputValue(filter.value.toString());
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
