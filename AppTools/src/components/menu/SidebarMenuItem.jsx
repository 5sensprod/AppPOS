// src/components/menu/SidebarMenuItem.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const SidebarMenuItem = ({ item, collapsed = false }) => {
  const { icon, label, path, badge, disabled, component: CustomComponent } = item;
  const location = useLocation();

  // Fonction améliorée pour déterminer l'état actif
  const isActive = (menuPath, currentPath) => {
    // Correspondance exacte
    if (menuPath === currentPath) return true;

    // Pour les sous-chemins (ex: /products/123 active le menu /products)
    if (menuPath !== '/' && currentPath.startsWith(menuPath + '/')) return true;

    return false;
  };

  // Vérifier si cet élément est actif
  const active = isActive(path, location.pathname);

  if (CustomComponent) {
    return <CustomComponent item={{ ...item, active }} collapsed={collapsed} />;
  }

  return (
    <li className="mb-1">
      <Link
        to={path}
        className={`
          flex items-center px-4 py-3 rounded-lg transition-colors duration-200
          ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
