// src/components/common/fields/CategorySelectField/components/CategoryDropdown.jsx
import React from 'react';
import { Search, Check } from 'lucide-react';
import CategoryTree from './CategoryTree';

const CategoryDropdown = ({
  searchResults,
  searchTerm,
  onSearchChange,
  expandedItems,
  onToggleExpand,
  selectedValue,
  onSelect,
  allowRootSelection,
  showSearch,
}) => {
  return (
    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-hidden">
      {showSearch && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="overflow-y-auto max-h-64">
        {allowRootSelection && (
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
              selectedValue === '' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            onClick={() => onSelect('')}
          >
            <span className="text-gray-500 dark:text-gray-400">Aucune catégorie</span>
            {selectedValue === '' && (
              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto" />
            )}
          </div>
        )}

        {searchResults.length > 0 ? (
          <CategoryTree
            items={searchResults}
            expandedItems={expandedItems}
            onToggleExpand={onToggleExpand}
            selectedValue={selectedValue}
            onSelect={onSelect}
          />
        ) : (
          <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
            {searchTerm ? 'Aucune catégorie trouvée' : 'Aucune catégorie disponible'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDropdown;
