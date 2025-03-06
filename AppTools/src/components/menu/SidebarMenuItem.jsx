// src/components/menu/SidebarMenuItem.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

const SidebarMenuItem = ({ item, collapsed = false }) => {
  const { icon, label, path, badge, disabled, component: CustomComponent, children } = item;
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const isActive = (menuPath, currentPath) => {
    return menuPath === currentPath || (menuPath !== '/' && currentPath.startsWith(menuPath + '/'));
  };

  const active = isActive(path, location.pathname);
  const hasActiveChild =
    children && children.some((child) => isActive(child.path, location.pathname));

  if (CustomComponent) {
    return <CustomComponent item={{ ...item, active }} collapsed={collapsed} />;
  }

  return (
    <li className="mb-1">
      <div className="flex flex-col">
        <div className="relative">
          <Link
            to={path}
            className={`
              flex items-center px-4 py-3 rounded-lg transition-colors duration-200 w-full
              ${active || hasActiveChild ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
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

          {!collapsed && children && children.length > 0 && (
            <div
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer hover:text-white"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronRight
                className={`h-5 w-5 transition-all duration-300 ease-in-out text-blue-100 hover:text-white
      ${expanded ? 'transform rotate-90' : ''}`}
              />
            </div>
          )}
        </div>

        {/* Sous-menu avec animation */}
        {!collapsed && children && children.length > 0 && (
          <div
            className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
          `}
          >
            <ul className="ml-6 mt-1 space-y-1">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    to={child.path}
                    className={`
                      flex items-center px-4 py-2 rounded-lg transition-colors duration-200 w-full
                      ${isActive(child.path, location.pathname) ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    `}
                  >
                    {child.icon}
                    <span className="ml-3">{child.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
};

export default SidebarMenuItem;
