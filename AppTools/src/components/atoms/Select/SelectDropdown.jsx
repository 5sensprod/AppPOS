// AppTools/src/components/atoms/Select/SelectDropdown.jsx
import React from 'react';
import { Search } from 'lucide-react';
import { sharedClasses, getThemedClasses } from './selectStyles';

const SelectDropdown = ({
  isOpen,
  searchTerm = '',
  onSearchChange,
  showSearch = false,
  searchPlaceholder = 'Rechercher...',
  children,
  className = '',
  maxHeight = 'max-h-72',
  position = 'absolute', // 'absolute' | 'relative'
  zIndex = 'z-10',
  theme = 'default',
}) => {
  if (!isOpen) return null;

  // Utilise votre classe existante + personnalisation
  let dropdownContainerClass;
  if (theme === 'default') {
    dropdownContainerClass = sharedClasses.dropdownContainer;
  } else {
    const themedClasses = getThemedClasses(theme);
    dropdownContainerClass = themedClasses.dropdownContainer;
  }

  const dropdownClassName = `${position} ${zIndex} mt-1 w-full ${dropdownContainerClass} ${maxHeight} ${className}`;

  return (
    <div className={dropdownClassName}>
      {/* Barre de recherche */}
      {showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className={sharedClasses.input.replace('w-full px-3 py-2', 'w-full pl-10 pr-4 py-2')} // Adapte pour l'icône
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="overflow-y-auto max-h-56">{children}</div>
    </div>
  );
};

export default SelectDropdown;
