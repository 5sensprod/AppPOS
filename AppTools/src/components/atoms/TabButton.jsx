// src/components/atoms/TabButton.jsx
import React from 'react';

const TabButton = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-4 px-6 text-sm font-medium transition-colors duration-150 ease-in-out
        ${
          active
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
    >
      {children}
    </button>
  );
};

export default TabButton;
