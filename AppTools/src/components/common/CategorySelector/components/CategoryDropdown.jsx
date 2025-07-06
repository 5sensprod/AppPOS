// AppTools/src/components/common/CategorySelector/components/CategoryDropdown.jsx
import React from 'react';
import { SelectDropdown } from '../../../atoms/Select';

const CategoryDropdown = ({
  isOpen,
  searchTerm,
  setSearchTerm,
  showSearch,
  children,
  className = '',
}) => {
  return (
    <SelectDropdown
      isOpen={isOpen}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      showSearch={showSearch}
      searchPlaceholder="Rechercher une catégorie..."
      className={className}
      maxHeight="max-h-72"
    >
      {children}
    </SelectDropdown>
  );
};

export default CategoryDropdown;
