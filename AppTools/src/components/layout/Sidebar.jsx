import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Import des icônes Lucide
import { useMenu } from '../menu/useMenu';
import SidebarMenuItem from '../menu/SidebarMenuItem';
import { useAccessibility } from '../../contexts/AccessibilityProvider';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { sidebarItems } = useMenu();
  const { handleExpandMenu, handleCollapseMenu, handleActivateMenu, setActiveZone } =
    useAccessibility();

  useKeyboardNavigation({
    direction: 'vertical',
    onExpand: handleExpandMenu,
    onCollapse: handleCollapseMenu,
    onActivate: handleActivateMenu,
    containerId: 'sidebar-menu',
    selector: 'a[href], button[role="menuitem"], [tabindex]:not([tabindex="-1"])',
  });

  useEffect(() => {
    const sidebar = document.getElementById('sidebar-menu');
    const handleFocus = () => setActiveZone('sidebar');

    if (sidebar) {
      sidebar.addEventListener('focusin', handleFocus);
      return () => sidebar.removeEventListener('focusin', handleFocus);
    }
  }, [setActiveZone]);

  const toggleCollapse = () => setCollapsed(!collapsed);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-gray-800 dark:bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col`}
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
          {collapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
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
