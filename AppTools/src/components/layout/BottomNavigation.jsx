// src/components/layout/BottomNavigation.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronUp, X, Home } from 'lucide-react';
import { useMenu } from '../menu/useMenu';
import BottomSubMenu from './BottomSubMenu';

const BottomNavigation = ({ className = '' }) => {
  const { sidebarItems } = useMenu();
  const location = useLocation();
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const isActive = (path, currentPath) =>
    path === currentPath || (path !== '/' && currentPath.startsWith(path + '/'));

  const hasActiveChild = (children, currentPath) =>
    children?.some((child) => isActive(child.path, currentPath));

  const handleSubMenuToggle = (itemId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveSubmenu(activeSubmenu === itemId ? null : itemId);
  };

  // ✅ CORRECTION: Définir closeSubmenu
  const closeSubmenu = () => setActiveSubmenu(null);

  // ✅ AJOUT: Fermer le sous-menu au changement de breakpoint
  React.useEffect(() => {
    const handleResize = () => {
      setActiveSubmenu(null); // Fermer au resize
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer le sous-menu en cliquant ailleurs
  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      // Fermer seulement si on clique en dehors de la navigation
      if (!e.target.closest('nav') && !e.target.closest('[data-submenu]')) {
        closeSubmenu();
      }
    };

    if (activeSubmenu) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [activeSubmenu]);

  // Render sécurisé des icônes
  const renderIcon = (icon, iconProps = {}) => {
    if (!icon) {
      return <Home {...iconProps} />;
    }

    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, iconProps);
    }

    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent {...iconProps} />;
    }

    console.warn('Icône non valide détectée:', icon);
    return <Home {...iconProps} />;
  };

  return (
    <>
      {/* ✅ SUPPRESSION de l'overlay */}

      {/* Dropdown vertical sans overlay */}
      {activeSubmenu && (
        <BottomSubMenu
          items={sidebarItems.find((item) => item.id === activeSubmenu)?.children || []}
          parentItem={sidebarItems.find((item) => item.id === activeSubmenu)}
          onClose={closeSubmenu}
          currentPath={location.pathname}
          parentIndex={sidebarItems.findIndex((item) => item.id === activeSubmenu)}
        />
      )}

      {/* Bottom Navigation */}
      <nav
        className={`
          fixed bottom-0 left-0 right-0 
          bg-white dark:bg-gray-800 
          border-t border-gray-200 dark:border-gray-700 
          z-30
          ${className}
        `}
        role="navigation"
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {sidebarItems.slice(0, 5).map((item) => {
            const active = isActive(item.path, location.pathname);
            const hasActiveChildItem = hasActiveChild(item.children, location.pathname);
            const isActiveOrHasActiveChild = active || hasActiveChildItem;
            const hasChildren = item.children && item.children.length > 0;
            const isSubmenuOpen = activeSubmenu === item.id;

            return (
              <div key={item.id} className="flex flex-col items-center relative">
                {hasChildren ? (
                  <div className="flex flex-col items-center relative">
                    <Link
                      to={item.path}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                        isActiveOrHasActiveChild || isSubmenuOpen
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      aria-label={item.label}
                    >
                      <div className="relative">
                        {renderIcon(item.icon, {
                          className: 'h-6 w-6',
                          'aria-hidden': 'true',
                        })}
                        {hasActiveChildItem && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <span className="text-xs mt-1 text-center leading-tight">{item.label}</span>
                    </Link>

                    {/* Bouton pour ouvrir/fermer le sous-menu */}
                    <button
                      onClick={(e) => handleSubMenuToggle(item.id, e)}
                      className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors duration-200 z-10 ${
                        isSubmenuOpen
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      aria-label={`${isSubmenuOpen ? 'Fermer' : 'Ouvrir'} le sous-menu ${item.label}`}
                      aria-expanded={isSubmenuOpen}
                    >
                      <ChevronUp
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isSubmenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={closeSubmenu}
                    className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                      active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {renderIcon(item.icon, {
                      className: 'h-6 w-6',
                      'aria-hidden': 'true',
                    })}
                    <span className="text-xs mt-1 text-center leading-tight">{item.label}</span>
                  </Link>
                )}

                {/* Badge */}
                {item.badge && (
                  <span
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[1.25rem] text-center"
                    aria-label={`${item.badge} nouvelles notifications`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNavigation;
