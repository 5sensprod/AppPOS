// UnifiedFilterBar.jsx - Version finale avec CategorySelector et useClickOutside
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { X, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { useHierarchicalCategories } from '../../../../features/categories/stores/categoryHierarchyStore';
import CategorySelector from '../../../common/CategorySelector';
import { useClickOutside } from './BatchActions/hooks/useClickOutside'; // ✅ AJOUTÉ

// Styles modernes pour react-select (conservés pour les autres filtres)
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
  const [selectedCategoriesForFilter, setSelectedCategoriesForFilter] = useState([]);
  const valueSelectRef = useRef(null);

  const closeFilterDropdown = () => {
    setIsAddingFilter(false);
    setNewFilterType(null);
    setSelectedCategoriesForFilter([]);
  };

  // ✅  Utiliser useClickOutside pour gérer la fermeture
  useClickOutside(valueSelectRef, isAddingFilter, closeFilterDropdown);

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

  // Toutes les options disponibles (sans les catégories car elles sont gérées différemment)
  const allFilterOptions = useMemo(() => {
    return filterOptions; // Juste les options non-catégories
  }, [filterOptions]);

  // Grouper par type (sans les catégories)
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
    const baseTypes = Object.entries(filterGroups)
      .filter(([type]) => {
        const allowMultiple = ['supplier', 'brand', 'category'].includes(type); // ✅ AJOUTÉ category pour permettre multiples
        return allowMultiple || !selectedTypes.has(type);
      })
      .map(([type]) => ({
        label: filterTypeLabels[type] || type,
        value: type,
      }));

    // ✅ Ajouter category si activé et qu'on a des données - TOUJOURS disponible maintenant
    if (enableCategories && hierarchicalCategories.length > 0) {
      // On vérifie si category n'est pas déjà dans baseTypes pour éviter les doublons
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
  }, [filterGroups, selectedTypes, enableCategories, hierarchicalCategories]);

  const handleTypeSelect = (selected) => {
    setNewFilterType(selected?.value || null);
    setIsAddingFilter(true);
    setSelectedCategoriesForFilter([]);

    // ✅ Pour les catégories, on ouvre directement sans étape intermédiaire
    if (selected?.value === 'category') {
      // Le CategorySelector s'ouvrira automatiquement avec autoFocusOpen
    }
  };

  // ✅ Handler pour les autres types (non-catégories)
  const handleValueSelect = (selected) => {
    if (!newFilterType || !selected || newFilterType === 'category') return; // ✅ Exclure category

    const isMulti = ['supplier', 'brand'].includes(newFilterType); // ✅ category supprimée
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

    // Tri alphabétique pour les marques ET les fournisseurs
    if (type === 'brand' || type === 'supplier') {
      return options.sort((a, b) => a.label.localeCompare(b.label));
    }

    return options;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Indicateur de chargement pour les catégories */}
      {isAddingFilter && newFilterType === 'category' && categoriesLoading && (
        <div className="px-3 py-2 text-sm text-gray-500">Chargement des catégories...</div>
      )}

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
            className="w-64"
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

      {/* ✅ MODIFIÉ : Sélecteur de catégories - Version directe avec z-index élevé */}
      {isAddingFilter && newFilterType === 'category' && !categoriesLoading && (
        <div ref={valueSelectRef} className="relative z-[9999]">
          <div className="w-80">
            <CategorySelector
              mode="single"
              hierarchicalData={hierarchicalCategories}
              value={''}
              onChange={(selectedCategoryId) => {
                if (selectedCategoryId) {
                  // ✅ AMÉLIORÉ : Fonction de recherche plus robuste
                  const findCategoryName = (categories, id) => {
                    if (!categories || categories.length === 0) return null;

                    for (const cat of categories) {
                      if (cat._id === id) {
                        return cat.name;
                      }
                      if (cat.children && cat.children.length > 0) {
                        const found = findCategoryName(cat.children, id);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  // ✅ AMÉLIORÉ : Recherche avec fallback
                  let categoryName = findCategoryName(hierarchicalCategories, selectedCategoryId);

                  // ✅ NOUVEAU : Fallback si pas trouvé dans hierarchicalCategories
                  if (!categoryName) {
                    // Chercher dans les filtres existants au cas où
                    const existingFilter = selectedFilters.find(
                      (f) => f.type === 'category' && f.value === selectedCategoryId
                    );
                    categoryName = existingFilter?.label;
                  }

                  // ✅ NOUVEAU : Dernier fallback avec l'ID
                  if (!categoryName) {
                    console.warn(
                      'Catégorie non trouvée:',
                      selectedCategoryId,
                      'dans',
                      hierarchicalCategories
                    );
                    categoryName = `Catégorie ${selectedCategoryId.slice(-6)}`; // Utiliser les 6 derniers caractères de l'ID
                  }

                  // Ajouter directement le filtre
                  const newFilter = {
                    type: 'category',
                    value: selectedCategoryId,
                    label: categoryName,
                  };

                  // Vérifier qu'il n'existe pas déjà
                  if (!selectedValues.has(`category:${selectedCategoryId}`)) {
                    onChange([...selectedFilters, newFilter]);
                  }
                }

                // Fermer après sélection
                closeFilterDropdown(); // ✅ SIMPLIFIÉ
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

      {/* Sélecteur de valeur pour les autres types (non-catégories) */}
      {isAddingFilter && newFilterType && newFilterType !== 'category' && (
        <div ref={valueSelectRef} className="relative">
          <Select
            options={getOptionsForType(newFilterType)}
            onChange={handleValueSelect}
            placeholder={`Choisir ${filterTypeLabels[newFilterType]?.toLowerCase()}`}
            isMulti={['supplier', 'brand'].includes(newFilterType)} // ✅ category supprimée
            classNamePrefix="react-select"
            className="w-64"
            styles={modernSelectStyles}
            autoFocus
            menuIsOpen={true}
            menuPortalTarget={document.body}
            menuPlacement="auto"
            onMenuClose={() => {
              closeFilterDropdown(); // ✅ SIMPLIFIÉ
            }}
            onBlur={() => {
              closeFilterDropdown(); // ✅ SIMPLIFIÉ
            }}
          />
        </div>
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
              // ✅ NOUVEAU : Pour les catégories, pré-sélectionner la catégorie actuelle
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

      {/* Bouton tout effacer */}
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
