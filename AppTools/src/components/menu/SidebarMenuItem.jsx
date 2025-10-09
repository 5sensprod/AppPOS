// src/components/menu/SidebarMenuItem.jsx - VERSION CORRIGÉE AVEC PERMISSIONS
import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMenu } from './useMenu';
import { useAuth } from '../../contexts/AuthContext';
import { hasAccessToMenu } from '../../config/rolePermissions';

// Vérifie si un élément est actif
const isActive = (menuPath, currentPath) =>
  menuPath === currentPath || (menuPath !== '/' && currentPath.startsWith(menuPath + '/'));

// Vérifie si un menu a un enfant actif
const hasActiveChild = (children, currentPath) =>
  children?.some((child) => isActive(child.path, currentPath));

const SubMenu = memo(({ children, expanded, currentPath, userRole }) => {
  // ✅ FILTRER LES ENFANTS SELON LES PERMISSIONS
  const visibleChildren = children.filter((child) => {
    // Si adminOnly est défini, vérifier le rôle admin
    if (child.adminOnly) {
      return userRole === 'admin';
    }
    // Sinon, vérifier les permissions générales
    return hasAccessToMenu(userRole, child.id);
  });

  if (visibleChildren.length === 0) return null;

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
      aria-expanded={expanded}
    >
      <ul className="ml-6 mt-1 space-y-1" role="menu">
        {visibleChildren.map((child) => (
          <li key={child.id} role="menuitem">
            <Link
              to={child.path}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 w-full ${
                isActive(child.path, currentPath)
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              aria-current={isActive(child.path, currentPath) ? 'page' : undefined}
              data-menu-id={child.id}
            >
              {child.icon}
              <span className="ml-3">{child.label}</span>
              {child.adminOnly && (
                <span className="ml-auto text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
});

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
  const { user } = useAuth();
  const currentPath = location.pathname;

  // ✅ VÉRIFIER L'ACCÈS AU MENU PARENT EN PREMIER
  const hasParentAccess = useMemo(() => {
    // Si adminOnly est défini, vérifier le rôle admin
    if (item.adminOnly) {
      return user?.role === 'admin';
    }
    // Sinon, vérifier les permissions générales
    return hasAccessToMenu(user?.role, item.id);
  }, [user, item.id, item.adminOnly]);

  // ✅ BLOQUER L'AFFICHAGE SI PAS D'ACCÈS
  if (!hasParentAccess) {
    return null;
  }

  const expanded = isExpanded(item.id);
  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      toggleExpanded(item.id);
    },
    [toggleExpanded, item.id]
  );

  // ✅ FILTRER LES ENFANTS SELON LES PERMISSIONS
  const visibleChildren = useMemo(() => {
    if (!children) return [];
    return children.filter((child) => {
      // Si adminOnly est défini, vérifier le rôle admin
      if (child.adminOnly) {
        return user?.role === 'admin';
      }
      // Sinon, vérifier les permissions générales
      return hasAccessToMenu(user?.role, child.id);
    });
  }, [children, user]);

  // Vérifier si l'élément actuel est actif ou si l'un de ses enfants est actif
  const active = useMemo(() => isActive(path, currentPath), [path, currentPath]);
  const hasActiveChildItem = useMemo(
    () => hasActiveChild(visibleChildren, currentPath),
    [visibleChildren, currentPath]
  );

  // Si un enfant est actif, développer automatiquement le parent
  useEffect(() => {
    if (hasActiveChildItem && !expanded) {
      toggleExpanded(item.id);
    }
  }, [hasActiveChildItem, expanded, toggleExpanded, item.id]);

  if (CustomComponent) {
    return (
      <CustomComponent
        item={{ ...item, active: active || hasActiveChildItem }}
        collapsed={collapsed}
      />
    );
  }

  // ✅ NE PAS AFFICHER SI TOUS LES ENFANTS SONT FILTRÉS
  const hasVisibleChildren = visibleChildren.length > 0;

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
            aria-current={active || hasActiveChildItem ? 'page' : undefined}
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

          {!collapsed && hasVisibleChildren && (
            <ExpandButton expanded={expanded} onClick={handleToggle} />
          )}
        </div>

        {!collapsed && hasVisibleChildren && (
          <SubMenu
            children={visibleChildren}
            expanded={expanded}
            currentPath={currentPath}
            userRole={user?.role}
          />
        )}
      </div>
    </li>
  );
};

export default memo(SidebarMenuItem);
