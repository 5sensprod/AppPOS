import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { Filter } from 'lucide-react';

const UnifiedFilterBar = ({ filterOptions = [], selectedFilters = [], onChange }) => {
  // S'assurer que selectedFilters est bien un tableau
  const filtersArray = Array.isArray(selectedFilters) ? selectedFilters : [];

  const [editingType, setEditingType] = useState(null);

  // Ajouter les options de statut si elles n'existent pas déjà
  const allFilterOptions = filterOptions.some((opt) => opt.type === 'status')
    ? filterOptions
    : [
        ...filterOptions,
        { label: 'Publié', value: 'status_published', type: 'status' },
        { label: 'Brouillon', value: 'status_draft', type: 'status' },
        { label: 'Archivé', value: 'status_archived', type: 'status' },
      ];

  const filterGroups = allFilterOptions.reduce((acc, option) => {
    if (!acc[option.type]) acc[option.type] = [];
    acc[option.type].push(option);
    return acc;
  }, {});

  const filterTypeLabels = {
    woo: 'Synchronisation',
    status: 'Statut',
    image: 'Image',
    supplier: 'Fournisseur',
    description: 'Description',
    brand: 'Marque',
    category: 'Catégorie',
  };

  const alreadySelectedValues = new Set(filtersArray.map((f) => `${f.type}:${f.value}`));
  const alreadySelectedTypes = new Set(filtersArray.map((f) => f.type));

  const availableTypes = Object.entries(filterGroups)
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

  const handleTypeSelect = (selected) => {
    setEditingType(selected?.value || null);
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
      updatedFilters = [...filtersArray, ...newFilters];
    } else {
      updatedFilters = [...filtersArray.filter((f) => f.type !== editingType), ...newFilters];
    }

    onChange(updatedFilters);
    setEditingType(null);
  };

  const getOptionsForType = (type) => {
    const selectedValues = filtersArray.filter((f) => f.type === type).map((f) => f.value);

    return (filterGroups[type] || []).map((opt) => ({
      ...opt,
      isDisabled: selectedValues.includes(opt.value),
    }));
  };

  const valueSelectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingType && valueSelectRef.current && !valueSelectRef.current.contains(event.target)) {
        setEditingType(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingType]);

  // Styles personnalisés pour correspondre à SearchBar
  const customStyles = {
    container: (base) => ({
      ...base,
      width: '100%',
    }),
    control: (base) => ({
      ...base,
      minHeight: '42px',
      height: '42px',
      borderRadius: '0.5rem',
      borderColor: 'var(--border-color, #D1D5DB)',
      backgroundColor: 'var(--bg-color, white)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--border-hover, #9CA3AF)',
      },
      paddingLeft: '36px', // Espace pour l'icône
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px',
      paddingLeft: '0',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: '42px',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '8px',
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: '8px',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--placeholder-color, #9CA3AF)',
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className="relative w-64">
      <Filter className="w-5 h-5 absolute left-3 top-3 text-gray-400 z-10" />
      {!editingType ? (
        <Select
          options={availableTypes}
          onChange={handleTypeSelect}
          placeholder="Filtrer par..."
          classNamePrefix="react-select"
          className="w-full"
          isSearchable={false}
          menuPlacement="auto"
          styles={customStyles}
          theme={(theme) => ({
            ...theme,
            colors: {
              ...theme.colors,
              primary: '#3B82F6', // Focus color (blue-500)
              primary25: '#EFF6FF', // Option highlight (blue-50)
              neutral20: '#D1D5DB', // Border color (gray-300)
            },
          })}
        />
      ) : (
        <div ref={valueSelectRef} className="w-full">
          <Select
            options={getOptionsForType(editingType)}
            onChange={handleValueSelect}
            placeholder={`Choisir ${filterTypeLabels[editingType]}`}
            isMulti={['supplier', 'brand', 'category'].includes(editingType)}
            classNamePrefix="react-select"
            className="w-full"
            autoFocus
            menuIsOpen={true}
            menuPlacement="auto"
            styles={customStyles}
            theme={(theme) => ({
              ...theme,
              colors: {
                ...theme.colors,
                primary: '#3B82F6', // Focus color
                primary25: '#EFF6FF', // Option highlight
                neutral20: '#D1D5DB', // Border color
              },
            })}
          />
        </div>
      )}
    </div>
  );
};

export default UnifiedFilterBar;
