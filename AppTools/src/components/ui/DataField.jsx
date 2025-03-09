// src/components/ui/DataField.jsx
import React from 'react';

/**
 * Composant pour afficher un champ de données avec étiquette
 */
const DataField = ({
  label,
  value,
  icon: Icon = null,
  valueClassName = 'text-gray-900 dark:text-gray-100',
  labelClassName = 'text-sm font-medium text-gray-500 dark:text-gray-400',
}) => {
  return (
    <div className="mb-4">
      <h3 className={`flex items-center ${labelClassName}`}>
        {Icon && <Icon className="h-4 w-4 mr-1" />}
        {label}
      </h3>
      <p className={`mt-1 ${valueClassName}`}>{value || '-'}</p>
    </div>
  );
};

export default DataField;
