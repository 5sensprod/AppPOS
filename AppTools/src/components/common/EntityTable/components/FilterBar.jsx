// src/components/common/EntityTable/components/FilterBar.jsx
import React from 'react';

export const FilterBar = ({ filters, activeFilters, onFilterChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <div key={filter.id} className="flex-shrink-0">
          {filter.type === 'select' && (
            <select
              value={activeFilters[filter.id] || 'all'}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">{filter.allLabel || 'Tous'}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {filter.type === 'boolean' && (
            <select
              value={activeFilters[filter.id] || 'all'}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">{filter.label}</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          )}
        </div>
      ))}
    </div>
  );
};
