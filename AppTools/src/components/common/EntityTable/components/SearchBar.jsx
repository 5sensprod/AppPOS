// src/components/common/EntityTable/components/SearchBar.jsx
import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

export const SearchBar = ({ searchTerm, onSearchChange, entityNamePlural }) => {
  // Référence vers l'élément input
  const inputRef = useRef(null);

  // Maintenir le focus après un rendu qui pourrait le faire perdre
  useEffect(() => {
    // Si l'input avait le focus avant le rendu, le restaurer
    if (
      document.activeElement === inputRef.current ||
      (document.activeElement?.tagName === 'BODY' && searchTerm)
    ) {
      inputRef.current?.focus();
    }
  });

  // Gestionnaire pour la soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    // Empêcher la perte de focus
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={`Rechercher ${entityNamePlural || 'éléments'}...`}
        value={searchTerm}
        onChange={onSearchChange}
        className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
    </form>
  );
};
