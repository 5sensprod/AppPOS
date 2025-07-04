// src/components/common/fields/CategorySelectField/components/CategoryField.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

const CategoryField = ({ selectedLabel, placeholder, disabled, isOpen, onToggle }) => {
  return (
    <div
      className={`border rounded-md px-3 py-2 flex justify-between items-center cursor-pointer transition-colors ${
        isOpen
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      } ${
        disabled
          ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
          : 'bg-white dark:bg-gray-700'
      }`}
      onClick={onToggle}
    >
      <span
        className={`truncate ${
          selectedLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {selectedLabel || placeholder}
      </span>

      <ChevronDown
        className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </div>
  );
};

export default CategoryField;
