// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useMenu } from '../menu/useMenu';
import SidebarMenuItem from '../menu/SidebarMenuItem';
import { useAccessibility } from '../../contexts/AccessibilityProvider';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { sidebarItems } = useMenu();
  const { handleExpandMenu, handleCollapseMenu, handleActivateMenu, setActiveZone } =
    useAccessibility();

  // Configuration de la navigation clavier
  useKeyboardNavigation({
    direction: 'vertical',
    onExpand: handleExpandMenu,
    onCollapse: handleCollapseMenu,
    onActivate: handleActivateMenu,
    containerId: 'sidebar-menu',
    selector: 'a[href], button[role="menuitem"], [tabindex]:not([tabindex="-1"])',
  });

  // Définir la zone active au focus
  useEffect(() => {
    const sidebar = document.getElementById('sidebar-menu');

    const handleFocus = () => {
      setActiveZone('sidebar');
    };

    if (sidebar) {
      sidebar.addEventListener('focusin', handleFocus);
      return () => {
        sidebar.removeEventListener('focusin', handleFocus);
      };
    }
  }, [setActiveZone]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-800 dark:bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col`}
      role="navigation"
      aria-label="Menu principal"
    >
      {/* En-tête du sidebar */}
      <div className="p-4 flex items-center justify-between border-b border-gray-700">
        {!collapsed && <span className="font-bold text-xl">Menu</span>}
        <button
          onClick={toggleCollapse}
          className="text-gray-300 hover:text-white"
          aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
          tabIndex={0}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
            />
          </svg>
        </button>
      </div>

      {/* Liste des éléments du menu */}
      <nav className="flex-1 overflow-y-auto py-4" id="sidebar-menu">
        <ul role="menubar" aria-orientation="vertical">
          {sidebarItems.map((item) => (
            <SidebarMenuItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
