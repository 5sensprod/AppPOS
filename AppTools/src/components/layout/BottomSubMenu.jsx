// src/components/layout/BottomSubMenu.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const BottomSubMenu = ({ items, onClose, currentPath }) => {
  const isActive = (path, currentPath) =>
    path === currentPath || (path !== '/' && currentPath.startsWith(path + '/'));

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slide-up">
      {/* Header du sous-menu */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Options</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Fermer le sous-menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Liste des éléments du sous-menu */}
      <div className="px-4 py-2 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => {
            const active = isActive(item.path, currentPath);

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={`flex flex-col items-center p-3 rounded-lg transition-colors duration-200 ${
                  active
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {React.cloneElement(item.icon, {
                  className: 'h-8 w-8 mb-2',
                  'aria-hidden': 'true',
                })}
                <span className="text-sm text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomSubMenu;
