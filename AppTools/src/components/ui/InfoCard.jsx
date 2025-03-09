// src/components/ui/InfoCard.jsx
import React from 'react';

/**
 * Carte d'information avec titre et contenu
 */
const InfoCard = ({
  title,
  icon: Icon,
  children,
  variant = 'default', // default, success, warning, danger
  className = '',
}) => {
  // Configuration des variantes
  const variants = {
    default: 'bg-white dark:bg-gray-800',
    success: 'bg-green-50 dark:bg-green-900',
    warning: 'bg-yellow-50 dark:bg-yellow-900',
    danger: 'bg-red-50 dark:bg-red-900',
  };

  const iconColor = {
    default: 'text-gray-500 dark:text-gray-400',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    danger: 'text-red-500 dark:text-red-400',
  };

  const titleColor = {
    default: 'text-gray-800 dark:text-gray-200',
    success: 'text-green-800 dark:text-green-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    danger: 'text-red-800 dark:text-red-200',
  };

  return (
    <div className={`p-4 rounded-lg shadow-sm ${variants[variant]} ${className}`}>
      {title && (
        <h3 className={`text-md font-medium ${titleColor[variant]} mb-3 flex items-center`}>
          {Icon && <Icon className={`h-5 w-5 mr-2 ${iconColor[variant]}`} />}
          {title}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
};

export default InfoCard;
