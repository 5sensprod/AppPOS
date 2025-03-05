// src/components/menu/SidebarMenuItem.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const SidebarMenuItem = ({ item, collapsed = false }) => {
  const { icon, label, path, badge, active, disabled, component: CustomComponent } = item;

  // Si un composant personnalisé est fourni, l'utiliser
  if (CustomComponent) {
    return <CustomComponent item={item} collapsed={collapsed} />;
  }

  // Utiliser Link de react-router-dom au lieu de a
  return (
    <li className="mb-1">
      <Link
        to={path}
        className={`
          flex items-center px-4 py-3 rounded-lg transition-colors duration-200
          ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        `}
      >
        {icon}
        {!collapsed && <span className="ml-3">{label}</span>}
        {!collapsed && badge && (
          <span className="ml-auto px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
};

export default SidebarMenuItem;
