// UnifiedFilterBar.jsx - Version moderne et compacte
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { X, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { useHierarchicalCategories } from '../../../../features/categories/stores/categoryHierarchyStore';

// Styles modernes pour react-select
const modernSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '36px',
    height: '36px',
    borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
    borderRadius: '6px',
    fontSize: '14px',
    ':hover': {
      borderColor: '#3B82F6',
    },
    transition: 'all 0.15s ease',
  }),
  valueContainer: (provided) => ({
    ...provided,
    height: '36px',
    padding: '0 8px',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '36px',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '4px',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #E5E7EB',
    zIndex: 50,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#EBF5FF' : state.isFocused ? '#F9FAFB' : 'white',
    color: state.isSelected ? '#1D4ED8' : '#374151',
    padding: '8px 12px',
    fontSize: '14px',
    ':active': {
      backgroundColor: '#EBF5FF',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#9CA3AF',
    fontSize: '14px',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const UnifiedFilterBar = ({
  filterOptions = [],
  selectedFilters = [],
  onChange,
  enableCategories = true,
  enableStatusFilter = true,
}) => {
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterType, setNewFilterType] = useState(null);
  const valueSelectRef = useRef(null); // Ajout de la ref

  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  // Charger les catégories au montage ET quand on clique sur category
  useEffect(() => {
    if (
      enableCategories &&
      (!hierarchicalCategories || hierarchicalCategories.length === 0) &&
      !categoriesLoading
    ) {
      fetchHierarchicalCategories();
    }
  }, [hierarchicalCategories, categoriesLoading, fetchHierarchicalCategories, enableCategories]);

  // AUSSI charger quand on sélectionne le type category
  useEffect(() => {
    if (
      newFilterType === 'category' &&
      enableCategories &&
      (!hierarchicalCategories || hierarchicalCategories.length === 0) &&
      !categoriesLoading
    ) {
      fetchHierarchicalCategories();
    }
  }, [
    newFilterType,
    hierarchicalCategories,
    categoriesLoading,
    fetchHierarchicalCategories,
    enableCategories,
  ]);

  // Gestion du clic extérieur comme dans l'original
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isAddingFilter &&
        valueSelectRef.current &&
        !valueSelectRef.current.contains(event.target)
      ) {
        setIsAddingFilter(false);
        setNewFilterType(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddingFilter]);

  // Options de catégories avec debug
  const categoryOptions = useMemo(() => {
    const transform = (cats, path = '') => {
      return cats.flatMap((cat) => {
        const option = {
          value: `category_${cat._id}`,
          label: `${path}${cat.name}`,
          type: 'category',
        };

        const children = cat.children ? transform(cat.children, `${path}${cat.name} > `) : [];
        return [option, ...children];
      });
    };

    const options = transform(hierarchicalCategories);
    return options;
  }, [hierarchicalCategories, enableCategories]);

  // Toutes les options disponibles avec debug
  const allFilterOptions = useMemo(() => {
    const combined = [...filterOptions, ...categoryOptions];
    return combined;
  }, [filterOptions, categoryOptions]);

  // Grouper par type
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
  };

  // Types déjà sélectionnés
  const selectedTypes = new Set(selectedFilters.map((f) => f.type));
  const selectedValues = new Set(selectedFilters.map((f) => `${f.type}:${f.value}`));

  // Types disponibles pour ajout
  const availableTypes = useMemo(() => {
    return Object.entries(filterGroups)
      .filter(([type]) => {
        const allowMultiple = ['supplier', 'brand', 'category'].includes(type);
        return allowMultiple || !selectedTypes.has(type);
      })
      .map(([type]) => ({
        label: filterTypeLabels[type] || type,
        value: type,
      }))
      .sort((a, b) => {
        const order = ['woo', 'status', 'image', 'description', 'category', 'brand', 'supplier'];
        return order.indexOf(a.value) - order.indexOf(b.value);
      });
  }, [filterGroups, selectedTypes]);

  const handleTypeSelect = (selected) => {
    setNewFilterType(selected?.value || null);
    setIsAddingFilter(true);
  };

  const handleValueSelect = (selected) => {
    if (!newFilterType || !selected) return;

    const isMulti = ['supplier', 'brand', 'category'].includes(newFilterType);
    const selectedValuesList = Array.isArray(selected) ? selected : [selected];

    const newFilters = selectedValuesList
      .filter((s) => !selectedValues.has(`${newFilterType}:${s.value}`))
      .map((s) => ({
        type: newFilterType,
        value: s.value,
        label: s.label, // MODIFICATION: Juste le label sans préfixe
      }));

    let updatedFilters;
    if (isMulti) {
      updatedFilters = [...selectedFilters, ...newFilters];
    } else {
      updatedFilters = [...selectedFilters.filter((f) => f.type !== newFilterType), ...newFilters];
    }

    onChange(updatedFilters);
    setIsAddingFilter(false);
    setNewFilterType(null);
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
    setIsAddingFilter(false);
    setNewFilterType(null);
  };

  const getOptionsForType = (type) => {
    const selectedFilterValues = selectedFilters.filter((f) => f.type === type).map((f) => f.value);
    return (filterGroups[type] || []).map((opt) => ({
      ...opt,
      isDisabled: selectedFilterValues.includes(opt.value),
    }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Indicateur de chargement pour les catégories */}
      {isAddingFilter && newFilterType === 'category' && categoriesLoading && (
        <div className="px-3 py-2 text-sm text-gray-500">Chargement des catégories...</div>
      )}

      {/* Filtres actifs */}
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

      {/* Bouton d'ajout de filtre */}
      {!isAddingFilter && availableTypes.length > 0 && (
        <div className="relative">
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
            className="min-w-[140px]"
            styles={modernSelectStyles}
            menuPortalTarget={document.body}
            menuPlacement="auto"
            isSearchable={false}
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

      {/* Sélecteur de valeur (quand un type est sélectionné) */}
      {isAddingFilter && newFilterType && (
        <div ref={valueSelectRef} className="relative">
          <Select
            options={getOptionsForType(newFilterType)}
            onChange={handleValueSelect}
            placeholder={`Choisir ${filterTypeLabels[newFilterType]?.toLowerCase()}`}
            isMulti={['supplier', 'brand', 'category'].includes(newFilterType)}
            classNamePrefix="react-select"
            className="min-w-[180px]"
            styles={modernSelectStyles}
            autoFocus
            menuIsOpen={true}
            menuPortalTarget={document.body}
            menuPlacement="auto"
            onMenuClose={() => {
              setIsAddingFilter(false);
              setNewFilterType(null);
            }}
            onBlur={() => {
              setIsAddingFilter(false);
              setNewFilterType(null);
            }}
          />
        </div>
      )}

      {/* Bouton tout effacer - Version icône trash harmonisée */}
      {selectedFilters.length > 0 && (
        <button
          onClick={handleClearAll}
          className="flex items-center justify-center h-9 w-9 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md border border-red-200 dark:border-red-700 transition-colors"
          title="Effacer tous les filtres"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default UnifiedFilterBar;
