// UnifiedFilterBar.jsx - version corrigée sans erreurs
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { useHierarchicalCategories } from '../../../../features/categories/stores/categoryHierarchyStore';

// Styles personnalisés pour react-select avec z-index très élevé
const customSelectStyles = {
  menu: (provided) => ({
    ...provided,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    borderRadius: '0.375rem',
    zIndex: 99999, // z-index extrêmement élevé
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '0.25rem 0',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#EBF5FF' : state.isFocused ? '#F3F4F6' : 'white',
    color: state.isSelected ? '#2563EB' : '#374151',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: '#F3F4F6',
    },
    // Animation pour les options
    animation: 'fadeIn 0.2s ease-out forwards',
    animationDelay: `${Math.min(state.index || 0, 10) * 30}ms`,
    opacity: 0,
  }),
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
    ':hover': {
      borderColor: '#3B82F6',
    },
    transition: 'all 0.15s ease',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999, // Très important pour que le menu soit au-dessus de tout
  }),
};

// Style CSS injecté dans le document pour les animations
const injectAnimationStyles = () => {
  // Éviter les doublons
  if (!document.getElementById('filter-bar-animations')) {
    const style = document.createElement('style');
    style.id = 'filter-bar-animations';
    style.textContent = `
      /* Animation pour l'apparition des tags de filtre */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Animation pour la disparition des tags de filtre */
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-5px); }
      }
      
      /* Classes d'animation */
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out forwards;
      }
      
      /* Option animation */
      .option-animation {
        opacity: 0;
        animation: fadeIn 0.2s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }
};

const UnifiedFilterBar = ({
  filterOptions = [],
  selectedFilters = [],
  onChange,
  hierarchicalEnabled = true,
  enableCategories = true,
  enableStatusFilter = true,
}) => {
  const [editingType, setEditingType] = useState(null);
  const [lastEditedType, setLastEditedType] = useState(null);

  // Injecter les styles d'animation une seule fois
  useEffect(() => {
    injectAnimationStyles();

    return () => {
      const styleElement = document.getElementById('filter-bar-animations');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Reste du code inchangé...
  const {
    hierarchicalCategories: rawHierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  // Utiliser les valeurs conditionnellement
  const hierarchicalCategories = enableCategories ? rawHierarchicalCategories : [];

  // Charger les catégories au montage du composant seulement si enableCategories est true
  useEffect(() => {
    if (enableCategories && rawHierarchicalCategories.length === 0 && !categoriesLoading) {
      fetchHierarchicalCategories();
    }
  }, [rawHierarchicalCategories, categoriesLoading, fetchHierarchicalCategories, enableCategories]);

  // Générer les options de catégories
  const categoryOptions = useMemo(() => {
    if (!enableCategories) return [];

    const transform = (cats, path = '') => {
      return cats.flatMap((cat) => [
        {
          value: `category_${cat._id}`,
          label: `${path}${cat.name}`,
          type: 'category',
        },
        ...(cat.children ? transform(cat.children, `${path}${cat.name} > `) : []),
      ]);
    };

    return transform(hierarchicalCategories);
  }, [hierarchicalCategories, enableCategories]);

  // Combiner toutes les options de filtre
  const allFilterOptions = useMemo(() => {
    return [...filterOptions, ...categoryOptions];
  }, [filterOptions, categoryOptions]);

  const filterGroups = useMemo(() => {
    return allFilterOptions.reduce((acc, option) => {
      if (!acc[option.type]) acc[option.type] = [];
      acc[option.type].push(option);
      return acc;
    }, {});
  }, [allFilterOptions]);

  const filterTypeLabels = {
    woo: 'Synchronisation',
    status: 'Statut',
    image: 'Image',
    supplier: 'Fournisseur',
    description: 'Description',
    brand: 'Marque',
    category: 'Catégorie',
  };

  const alreadySelectedValues = new Set(selectedFilters.map((f) => `${f.type}:${f.value}`));
  const alreadySelectedTypes = new Set(selectedFilters.map((f) => f.type));

  const availableTypes = useMemo(() => {
    return Object.entries(filterGroups)
      .filter(([type]) => {
        const allowMultiple = ['supplier', 'brand', 'category'].includes(type);
        return allowMultiple || !alreadySelectedTypes.has(type);
      })
      .map(([type]) => ({
        label: filterTypeLabels[type] || type,
        value: type,
      }))
      .sort((a, b) => {
        const order = ['woo', 'status', 'image', 'description', 'category', 'brand', 'supplier'];
        return order.indexOf(a.value) - order.indexOf(b.value);
      });
  }, [filterGroups, alreadySelectedTypes]);

  const handleTypeSelect = (selected) => {
    setEditingType(selected?.value || null);
    if (selected?.value) {
      setLastEditedType(selected.value);
    }
  };

  const handleValueSelect = (selected) => {
    if (!editingType || !selected) return;

    const isMulti = ['supplier', 'brand', 'category'].includes(editingType);
    const selectedValues = Array.isArray(selected) ? selected : [selected];

    const newFilters = selectedValues
      .filter((s) => !alreadySelectedValues.has(`${editingType}:${s.value}`))
      .map((s) => ({
        type: editingType,
        value: s.value,
        label: `${filterTypeLabels[editingType] || editingType}: ${s.label}`,
      }));

    let updatedFilters;
    if (isMulti) {
      updatedFilters = [...selectedFilters, ...newFilters];
    } else {
      updatedFilters = [...selectedFilters.filter((f) => f.type !== editingType), ...newFilters];
    }

    onChange(updatedFilters);

    // Réinitialiser le sélecteur après une sélection
    setEditingType(null);
  };

  const handleRemove = (filterToRemove) => {
    onChange(
      selectedFilters.filter(
        (f) => !(f.type === filterToRemove.type && f.value === filterToRemove.value)
      )
    );
  };

  const getOptionsForType = (type) => {
    const selectedValues = selectedFilters.filter((f) => f.type === type).map((f) => f.value);

    return (filterGroups[type] || []).map((opt) => ({
      ...opt,
      isDisabled: selectedValues.includes(opt.value),
    }));
  };

  const handleClearAllFilters = () => {
    onChange([]);
    setEditingType(null);
    setLastEditedType(null);
  };

  const valueSelectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingType && valueSelectRef.current && !valueSelectRef.current.contains(event.target)) {
        setEditingType(null);
        setLastEditedType(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingType]);

  // Afficher un indicateur de chargement pendant le chargement des catégories
  if (editingType === 'category' && categoriesLoading) {
    return <div className="p-2 text-center">Chargement des catégories...</div>;
  }

  return (
    <div className="space-y-3 w-full">
      <div className="grid grid-cols-1 gap-3 relative z-50">
        <div>
          {!editingType ? (
            <Select
              options={availableTypes}
              onChange={handleTypeSelect}
              placeholder="Ajouter un critère de filtre..."
              classNamePrefix="react-select"
              className="w-full"
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              menuPlacement="auto"
            />
          ) : (
            <div ref={valueSelectRef} className="w-full relative z-50">
              <Select
                options={getOptionsForType(editingType)}
                onChange={handleValueSelect}
                placeholder={`Choisir une valeur pour "${filterTypeLabels[editingType]}"`}
                isMulti={['supplier', 'brand', 'category'].includes(editingType)}
                classNamePrefix="react-select"
                className="w-full"
                styles={customSelectStyles}
                autoFocus
                menuIsOpen={true}
                menuPortalTarget={document.body}
                menuPlacement="auto"
              />
            </div>
          )}
        </div>
      </div>

      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 transition-all duration-300 ease-in-out">
          <div className="flex flex-wrap gap-2 flex-grow">
            {selectedFilters.map((filter, idx) => (
              <div
                key={`${filter.type}-${filter.value}-${idx}`}
                className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full filter-tag-appear"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <span
                  className="cursor-pointer"
                  title="Filtre appliqué"
                  onClick={() => {
                    setEditingType(filter.type);
                    setLastEditedType(filter.type);
                  }}
                >
                  {filter.label}
                </span>
                <button
                  onClick={() => handleRemove(filter)}
                  className="ml-2 text-xs font-bold hover:text-blue-600 transition-colors"
                  title="Supprimer ce filtre"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleClearAllFilters}
            className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-all duration-200 ease-in-out transform hover:scale-105"
            title="Effacer tous les filtres"
          >
            Effacer tous les filtres
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedFilterBar;
