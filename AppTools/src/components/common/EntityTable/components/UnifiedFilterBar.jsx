// src/components/common/EntityTable/components/UnifiedFilterBar.jsx
import React, { useState } from 'react';
import Select from 'react-select';

const UnifiedFilterBar = ({ filterOptions = [], selectedFilters = [], onChange }) => {
  const [editingFilter, setEditingFilter] = useState(null);

  const handleEdit = (filter) => {
    setEditingFilter(filter);
  };

  const handleValueChange = (selected) => {
    if (!editingFilter || !selected) return;

    const newFilters = selectedFilters.map((f) =>
      f.type === editingFilter.type
        ? {
            ...f,
            value: selected.value,
            label: `${getLabelForType(f.type)}: ${selected.label}`,
          }
        : f
    );

    onChange(newFilters);
    setEditingFilter(null);
  };

  const handleRemove = (filterToRemove) => {
    const newFilters = selectedFilters.filter(
      (f) => !(f.type === filterToRemove.type && f.value === filterToRemove.value)
    );
    onChange(newFilters);
  };

  const getLabelForType = (type) => {
    const def = filterOptions.find((f) => f.type === type);
    return def?.label || type;
  };

  const getOptionsForType = (type) =>
    filterOptions.filter((f) => f.type === type).map(({ value, label }) => ({ value, label }));

  return (
    <div className="space-y-3 w-full max-w-xl">
      <Select
        isMulti
        options={filterOptions}
        value={selectedFilters}
        onChange={onChange}
        placeholder="Ajouter des filtres..."
        classNamePrefix="react-select"
        closeMenuOnSelect={false}
      />

      {/* Tags interactifs */}
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
                title="Cliquer pour modifier"
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

      {/* Popup de modification */}
      {editingFilter && (
        <Select
          options={getOptionsForType(editingFilter.type)}
          onChange={handleValueChange}
          placeholder={`Modifier ${getLabelForType(editingFilter.type)}...`}
          classNamePrefix="react-select"
          className="max-w-sm mt-2"
          autoFocus
        />
      )}
    </div>
  );
};

export default UnifiedFilterBar;
