// src/components/common/EntityTable/components/FilterBar.jsx
import React from 'react';
import Select from 'react-select';

export const FilterBar = ({ filters, activeFilters, onFilterChange }) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      {filters.map((filter) => {
        const commonProps = {
          className: 'min-w-[180px]',
        };

        if (filter.type === 'boolean') {
          const options = [
            { value: 'all', label: 'Tous' },
            { value: 'true', label: 'Oui' },
            { value: 'false', label: 'Non' },
          ];

          const currentValue =
            options.find((opt) => opt.value === (activeFilters[filter.id] || 'all')) || options[0];

          return (
            <div key={filter.id} {...commonProps}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {filter.label}
              </label>
              <Select
                value={currentValue}
                options={options}
                onChange={(selected) => onFilterChange(filter.id, selected.value)}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          );
        }

        // fallback pour les autres types (ex: select standard)
        if (filter.type === 'select') {
          const options = [
            { value: 'all', label: filter.allLabel || 'Tous' },
            ...filter.options.map((o) => ({ value: o.value, label: o.label })),
          ];

          const currentValue =
            options.find((opt) => opt.value === (activeFilters[filter.id] || 'all')) || options[0];

          return (
            <div key={filter.id} {...commonProps}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {filter.label}
              </label>
              <Select
                value={currentValue}
                options={options}
                onChange={(selected) => onFilterChange(filter.id, selected.value)}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
