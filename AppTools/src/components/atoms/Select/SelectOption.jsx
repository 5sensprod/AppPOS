// AppTools/src/components/atoms/Select/SelectOption.jsx
import React from 'react';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';
import { getListItemClassName } from './selectStyles';

const SelectOption = ({
  children,
  isSelected = false,
  isExpanded = false,
  hasChildren = false,
  level = 0,
  disabled = false,
  onClick,
  onExpand,
  leftIcon,
  rightIcon,
  className = '',
  indentSize = 20, // pixels par niveau
  showCounter = false,
  counterValue = 0,
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onClick?.(e);
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    onExpand?.(e);
  };

  // Utilise votre utility existante
  const optionClassName = getListItemClassName(
    isSelected,
    `${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`
  );

  return (
    <div
      className={optionClassName}
      style={{ paddingLeft: `${12 + level * indentSize}px` }}
      onClick={handleClick}
    >
      {/* Bouton expand/collapse */}
      {hasChildren ? (
        <button
          type="button"
          className="p-1 mr-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
          onClick={handleExpand}
          disabled={disabled}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      ) : (
        <div className="w-7" />
      )}

      {/* Icône gauche */}
      {leftIcon && <div className="mr-2">{leftIcon}</div>}

      {/* Contenu principal */}
      <span className="flex-grow text-sm truncate">{children}</span>

      {/* Compteur */}
      {showCounter && counterValue > 0 && (
        <span className="text-xs text-gray-500 ml-2">({counterValue})</span>
      )}

      {/* Icône droite */}
      {rightIcon && <div className="ml-2">{rightIcon}</div>}

      {/* Indicateur de sélection */}
      {isSelected && !rightIcon && (
        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
      )}
    </div>
  );
};

export default SelectOption;
