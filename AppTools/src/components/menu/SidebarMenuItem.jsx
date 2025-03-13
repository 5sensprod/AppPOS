// src/components/menu/SidebarMenuItem.jsx
import React, { memo, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMenu } from './useMenu';

// Vérifie si un élément est actif
const isActive = (menuPath, currentPath) =>
  menuPath === currentPath || (menuPath !== '/' && currentPath.startsWith(menuPath + '/'));

// Vérifie si un menu a un enfant actif
const hasActiveChild = (children, currentPath) =>
  children?.some((child) => isActive(child.path, currentPath));

const SubMenu = memo(({ children, expanded }) => (
  <div
    className={`overflow-hidden transition-all duration-300 ease-in-out ${
      expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
    }`}
    aria-expanded={expanded}
  >
    <ul className="ml-6 mt-1 space-y-1" role="menu">
      {children.map((child) => (
        <li key={child.id} role="menuitem">
          <Link
            to={child.path}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 w-full ${
              isActive(child.path, window.location.pathname)
                ? 'bg-blue-500 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            aria-current={isActive(child.path, window.location.pathname) ? 'page' : undefined}
            data-menu-id={child.id}
          >
            {child.icon}
            <span className="ml-3">{child.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
));

const ExpandButton = memo(({ expanded, onClick }) => (
  <div
    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer hover:text-white"
    onClick={onClick}
    role="button"
    aria-expanded={expanded}
    aria-label={expanded ? 'Réduire le sous-menu' : 'Développer le sous-menu'}
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
  >
    <ChevronRight
      className={`h-5 w-5 transition-all duration-300 ease-in-out text-blue-100 hover:text-white ${
        expanded ? 'rotate-90' : ''
      }`}
    />
  </div>
));

const SidebarMenuItem = ({ item, collapsed = false }) => {
  const { icon, label, path, badge, disabled, component: CustomComponent, children } = item;
  const location = useLocation();
  const { isExpanded, toggleExpanded } = useMenu();

  const expanded = isExpanded(item.id);
  const handleToggle = useCallback(() => toggleExpanded(item.id), [toggleExpanded, item.id]);

  const active = useMemo(() => isActive(path, location.pathname), [path, location.pathname]);
  const hasActiveChildItem = useMemo(
    () => hasActiveChild(children, location.pathname),
    [children, location.pathname]
  );

  if (CustomComponent) {
    return <CustomComponent item={{ ...item, active }} collapsed={collapsed} />;
  }

  return (
    <li className="mb-1" role="none">
      <div className="flex flex-col">
        <div className="relative">
          <Link
            to={path}
            className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 w-full ${
              active || hasActiveChildItem
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-current={active ? 'page' : undefined}
            aria-disabled={disabled}
            role="menuitem"
            tabIndex={disabled ? -1 : 0}
            data-menu-id={item.id}
          >
            {icon && (
              <span className="flex items-center" aria-hidden="true">
                {icon}
              </span>
            )}
            {!collapsed && <span className="ml-3">{label}</span>}
            {!collapsed && badge && (
              <span
                className="ml-auto px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full"
                aria-label={`${badge} nouvelles notifications`}
              >
                {badge}
              </span>
            )}
          </Link>

          {!collapsed && children?.length > 0 && (
            <ExpandButton expanded={expanded} onClick={handleToggle} />
          )}
        </div>

        {!collapsed && children?.length > 0 && <SubMenu children={children} expanded={expanded} />}
      </div>
    </li>
  );
};

export default memo(SidebarMenuItem);
