// src/components/common/EntityTable/components/TableHeader.jsx
import React, { useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const TableHeader = ({ columns, sort, onSort, selectAll, allSelected, someSelected }) => {
  // Référence à l'élément input pour définir la propriété indeterminate
  const checkboxRef = useRef(null);

  // Mettre à jour la propriété indeterminate quand someSelected change
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <thead className="bg-gray-50 dark:bg-gray-700">
      <tr>
        <th className="px-4 py-3 w-8">
          <input
            ref={checkboxRef}
            type="checkbox"
            onChange={(e) => selectAll(e.target.checked)}
            checked={allSelected}
            className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          />
        </th>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
              column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
            }`}
            onClick={column.sortable ? () => onSort(column.key) : undefined}
          >
            <div className="flex items-center space-x-1">
              <span>{column.label}</span>
              {column.sortable && sort.field === column.key && (
                <span>
                  {sort.direction === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
};
