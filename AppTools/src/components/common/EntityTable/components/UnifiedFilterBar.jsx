import React, { useState } from 'react';
import Select from 'react-select';

const UnifiedFilterBar = ({ filterOptions = [], selectedFilters = [], onChange }) => {
  const [editingType, setEditingType] = useState(null);

  const alreadySelectedTypes = selectedFilters.map((f) => f.type);

  const filterGroups = filterOptions.reduce((acc, option) => {
    if (!acc[option.type]) acc[option.type] = [];
    acc[option.type].push(option);
    return acc;
  }, {});

  const filterTypeLabels = {
    woo: 'Synchronisation',
    supplier: 'Fournisseur',
  };

  const availableTypes = Object.entries(filterGroups)
    .filter(([type]) => !alreadySelectedTypes.includes(type))
    .map(([type]) => ({
      label: filterTypeLabels[type] || type,
      value: type,
    }));

  const handleTypeSelect = (selected) => {
    setEditingType(selected?.value || null);
  };

  const handleValueSelect = (selected) => {
    if (!editingType || !selected) return;

    const isMulti = editingType === 'supplier';
    const selectedValues = Array.isArray(selected) ? selected : [selected];

    const newFilters = selectedValues
      .filter((s) => !selectedFilters.some((f) => f.type === editingType && f.value === s.value))
      .map((s) => ({
        type: editingType,
        value: s.value,
        label: `${filterTypeLabels[editingType] || editingType}: ${s.label}`,
      }));

    let updatedFilters;
    if (isMulti) {
      updatedFilters = [...selectedFilters, ...newFilters];
    } else {
      // Un seul filtre autorisé pour ce type (ex: woo)
      updatedFilters = [...selectedFilters.filter((f) => f.type !== editingType), ...newFilters];
    }

    onChange(updatedFilters);
    setEditingType(null);
  };

  const handleRemove = (filterToRemove) => {
    onChange(
      selectedFilters.filter(
        (f) => !(f.type === filterToRemove.type && f.value === filterToRemove.value)
      )
    );
  };

  const handleEdit = (filter) => {
    setEditingType(filter.type);
  };

  const getOptionsForType = (type) => {
    const selectedValues = selectedFilters.filter((f) => f.type === type).map((f) => f.value);

    return (filterGroups[type] || []).map((opt) => ({
      ...opt,
      isDisabled: selectedValues.includes(opt.value),
    }));
  };

  return (
    <div className="space-y-3 w-full max-w-xl">
      {/* Étape 1 : Choix du type de filtre */}
      {!editingType && (
        <Select
          options={availableTypes}
          onChange={handleTypeSelect}
          placeholder="Ajouter un critère de filtre..."
          classNamePrefix="react-select"
        />
      )}

      {/* Étape 2 : Choix de la valeur pour le type sélectionné */}
      {editingType && (
        <Select
          options={getOptionsForType(editingType)}
          onChange={handleValueSelect}
          placeholder={`Choisir une valeur pour "${filterTypeLabels[editingType]}"`}
          classNamePrefix="react-select"
          className="max-w-sm"
          autoFocus
          isMulti={editingType === 'supplier'}
        />
      )}

      {/* Affichage des filtres actifs sous forme de tags */}
      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFilters.map((filter, idx) => (
            <div
              key={`${filter.type}-${filter.value}-${idx}`}
              className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
            >
              <span
                className="cursor-pointer"
                onClick={() => handleEdit(filter)}
                title="Modifier ce filtre"
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
      )}
    </div>
  );
};

export default UnifiedFilterBar;
