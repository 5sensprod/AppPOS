// src/components/common/fields/CategorySelectField/components/LoadingField.jsx
import React from 'react';

const LoadingField = () => {
  return (
    <div className="category-selector border rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Chargement des catégories...
        </span>
      </div>
    </div>
  );
};

export default LoadingField;
