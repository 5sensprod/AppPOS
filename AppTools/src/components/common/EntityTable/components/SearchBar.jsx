// src/components/common/EntityTable/components/SearchBar.jsx
import React from 'react';
import { Search } from 'lucide-react';

export const SearchBar = ({ searchTerm, onSearchChange, entityNamePlural }) => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={`Rechercher ${entityNamePlural || 'éléments'}...`}
        value={searchTerm}
        onChange={onSearchChange}
        className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
    </div>
  );
};
