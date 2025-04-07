// src/components/common/EntityTable/components/SearchBar.jsx
import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

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
        className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

      {/* Afficher un bouton de réinitialisation si un terme de recherche existe */}
      {searchTerm && (
        <button
          onClick={() => onSearchChange({ target: { value: '' } })}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Effacer la recherche"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
