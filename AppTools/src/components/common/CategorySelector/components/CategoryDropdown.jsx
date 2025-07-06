//AppTools\src\components\common\CategorySelector\components\CategoryDropdown.jsx
import React from 'react';
import { Search } from 'lucide-react';

const CategoryDropdown = ({
  isOpen,
  searchTerm,
  setSearchTerm,
  showSearch,
  children,
  className = 'absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-72 overflow-hidden',
}) => {
  if (!isOpen) return null;

  return (
    <div className={className}>
      {/* Barre de recherche */}
      {showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Contenu du dropdown */}
      <div className="overflow-y-auto max-h-56">{children}</div>
    </div>
  );
};

export default CategoryDropdown;
