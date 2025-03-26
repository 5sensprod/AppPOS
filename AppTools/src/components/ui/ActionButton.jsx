// src/components/ui/ActionButton.jsx
import React from 'react';

/**
 * Bouton d'action stylisé avec icône
 */
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  variant = 'primary', // primary, secondary, danger, success
  disabled = false,
  className = '',
  iconClassName = 'h-4 w-4 mr-2',
  isLoading = false,
  type, // Ajout de la propriété type
  form, // Ajout de la propriété form
  ...props // Ajout du reste des propriétés
}) => {
  // Configuration des variantes
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary:
      'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${variants[variant]}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      type={type} // Transmission de type
      form={form} // Transmission de form
      {...props} // Transmission des autres propriétés
    >
      {Icon && <Icon className={`${iconClassName} ${isLoading ? 'animate-spin' : ''}`} />}
      {label}
    </button>
  );
};

export default ActionButton;
