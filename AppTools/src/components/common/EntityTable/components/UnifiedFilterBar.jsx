// UnifiedFilterBar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { useHierarchicalCategories } from '../../../../features/categories/stores/categoryHierarchyStore';

const UnifiedFilterBar = ({
  filterOptions = [],
  selectedFilters = [],
  onChange,
  hierarchicalEnabled = true, // Gardé pour compatibilité
  enableCategories = true,
  enableStatusFilter = true,
}) => {
  const [editingType, setEditingType] = useState(null);
  const [lastEditedType, setLastEditedType] = useState(null);

  // Toujours appeler le hook, mais utiliser les résultats conditionnellement
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

  // Générer les options de catégories seulement si enableCategories est true
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

  // Ajouter les options de filtre de statut
  const statusOptions = [
    { label: 'Publié', value: 'status_published', type: 'status' },
    { label: 'Brouillon', value: 'status_draft', type: 'status' },
    { label: 'Archivé', value: 'status_archived', type: 'status' },
  ];

  // Combiner toutes les options de filtre
  const allFilterOptions = useMemo(() => {
    // Ne plus ajouter les statusOptions du composant car ils sont déjà dans filterOptions
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
    return (
      Object.entries(filterGroups)
        .filter(([type]) => {
          // Un seul filtre autorisé pour woo et status, plusieurs pour supplier, brand et category
          const allowMultiple = ['supplier', 'brand', 'category'].includes(type);
          return allowMultiple || !alreadySelectedTypes.has(type);
        })
        .map(([type]) => ({
          label: filterTypeLabels[type] || type,
          value: type,
        }))
        // Définir l'ordre explicite des options
        .sort((a, b) => {
          const order = ['woo', 'status', 'image', 'description', 'category', 'brand', 'supplier'];
          return order.indexOf(a.value) - order.indexOf(b.value);
        })
    );
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

    // Toujours réinitialiser le sélecteur après une sélection
    setEditingType(null);
    // Ne pas réinitialiser lastEditedType ici pour permettre de cliquer sur les tags
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
    onChange([]); // Réinitialiser les filtres avec un tableau vide
    setEditingType(null); // Fermer le sélecteur
    setLastEditedType(null); // Réinitialiser le dernier type édité
  };

  const valueSelectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingType && valueSelectRef.current && !valueSelectRef.current.contains(event.target)) {
        setEditingType(null);
        setLastEditedType(null); // Réinitialiser le dernier type édité
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
      <div className="grid grid-cols-1 gap-3">
        {/* Sélecteur de type de filtre standard */}
        <div>
          {!editingType ? (
            <Select
              options={availableTypes}
              onChange={handleTypeSelect}
              placeholder="Ajouter un critère de filtre..."
              classNamePrefix="react-select"
              className="w-full"
            />
          ) : (
            <div ref={valueSelectRef} className="w-full">
              <Select
                options={getOptionsForType(editingType)}
                onChange={handleValueSelect}
                placeholder={`Choisir une valeur pour "${filterTypeLabels[editingType]}"`}
                isMulti={['supplier', 'brand', 'category'].includes(editingType)}
                classNamePrefix="react-select"
                className="w-full"
                autoFocus
                menuIsOpen={true}
              />
            </div>
          )}
        </div>
      </div>

      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2 flex-grow">
            {selectedFilters.map((filter, idx) => (
              <div
                key={`${filter.type}-${filter.value}-${idx}`}
                className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
              >
                <span
                  className="cursor-pointer"
                  title="Filtre appliqué"
                  onClick={() => {
                    // Réouvrir le sélecteur pour ce type de filtre
                    setEditingType(filter.type);
                    setLastEditedType(filter.type);
                  }}
                >
                  {filter.label}
                </span>
                <button
                  onClick={() => handleRemove(filter)}
                  className="ml-2 text-xs font-bold"
                  title="Supprimer ce filtre"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleClearAllFilters}
            className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
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
