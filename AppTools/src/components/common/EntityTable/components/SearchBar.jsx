// src/components/common/EntityTable/components/SearchBar.jsx
import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({ searchTerm, onSearchChange, entityNamePlural }) => {
  const inputRef = useRef(null);

  // Se concentrer sur l'input si un terme de recherche existe déjà
  useEffect(() => {
    if (searchTerm && inputRef.current) {
      // Mettre le focus sur l'input et positionner le curseur à la fin
      inputRef.current.focus();
      inputRef.current.selectionStart = searchTerm.length;
      inputRef.current.selectionEnd = searchTerm.length;
    }
  }, [searchTerm]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={`Rechercher ${entityNamePlural || 'éléments'}...`}
        value={searchTerm || ''}
        onChange={onSearchChange}
        className="w-full lg:w-72 h-9 pl-9 pr-8 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />

      {/* Icône de recherche */}
      <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />

      {/* Bouton de réinitialisation moderne */}
      {searchTerm && (
        <button
          onClick={() => onSearchChange({ target: { value: '' } })}
          className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Effacer la recherche"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
