// src/components/menu/MenuButton.jsx
import React, { memo } from 'react';

const MenuButton = memo(
  ({
    icon,
    label,
    onClick,
    className = '',
    badge = null,
    active = false,
    disabled = false,
    ...props // Important pour recevoir data-menu-id et autres attributs ARIA
  }) => {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
        flex items-center px-3 py-2 rounded-lg transition-colors duration-200
        ${active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        {icon && (
          <span className="mr-2" aria-hidden="true">
            {icon}
          </span>
        )}
        {label && <span>{label}</span>}
        {badge && (
          <span
            className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full"
            aria-label={`${badge} nouvelles notifications`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }
);

export default MenuButton;
