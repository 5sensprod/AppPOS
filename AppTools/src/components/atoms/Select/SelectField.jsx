// AppTools/src/components/atoms/Select/SelectField.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { sharedClasses } from './selectStyles';

const SelectField = ({
  value = '',
  placeholder = 'Sélectionner...',
  isOpen = false,
  disabled = false,
  error = false,
  onClick,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  // Styles par taille cohérents avec BaseSelect
  const sizeStyles = {
    sm: 'px-2 py-1 text-sm min-h-[32px]',
    md: 'px-3 py-2 text-base min-h-[38px]', // Cohérent avec baseSelectStyles
    lg: 'px-4 py-3 text-lg min-h-[44px]',
  };

  // Utilise les classes existantes
  let fieldClassName = sharedClasses.input.replace(
    'w-full px-3 py-2',
    `w-full ${sizeStyles[size]}`
  );

  // États spéciaux
  if (error) {
    fieldClassName = fieldClassName.replace(
      'focus:ring-blue-500 focus:border-blue-500',
      'focus:ring-red-500 focus:border-red-500 border-red-500'
    );
  } else if (isOpen) {
    fieldClassName = fieldClassName.replace(
      'border-gray-300 dark:border-gray-600',
      'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200'
    );
  }

  if (disabled) {
    fieldClassName += ` ${sharedClasses.disabled}`;
  }

  return (
    <div
      className={`${fieldClassName} flex justify-between items-center cursor-pointer ${className}`}
      onClick={() => !disabled && onClick?.()}
    >
      <div className="truncate">
        {value || <span className="text-gray-500">{placeholder}</span>}
      </div>
      <ChevronDown
        className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`}
      />
    </div>
  );
};

export default SelectField;
