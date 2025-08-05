import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const AccordionPanel = ({
  id,
  title,
  icon: Icon,
  children,
  isOpen,
  onToggle,
  className = '',
}) => {
  // 🔧 Handler pour le toggle avec gestion de la propagation
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(id);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 ${className}`}
    >
      {/* Header cliquable */}
      <button
        type="button" // 🔧 Empêche la soumission de formulaires
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-md"
      >
        <div className="flex items-center">
          {Icon && <Icon className="h-4 w-4 mr-2" />}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200" />
        )}
      </button>

      {/* Contenu - avec div qui empêche la propagation */}
      {isOpen && (
        <div
          className="px-3 pb-3"
          onClick={(e) => e.stopPropagation()} // 🔧 Stop propagation sur tout le contenu
        >
          {children}
        </div>
      )}
    </div>
  );
};
