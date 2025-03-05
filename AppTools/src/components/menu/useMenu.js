// src/components/menu/useMenu.js
// Hook React pour utiliser le système de menu
import { useState, useEffect } from 'react';
import { menuRegistry } from './MenuRegistry';

export function useMenu() {
  const [menuState, setMenuState] = useState({
    topMenuItems: menuRegistry.getTopMenuItems(),
    sidebarItems: menuRegistry.getSidebarItems(),
  });

  useEffect(() => {
    // S'abonner aux changements du registre de menu
    const unsubscribe = menuRegistry.subscribe(setMenuState);

    // Se désabonner lorsque le composant est démonté
    return unsubscribe;
  }, []);

  return {
    topMenuItems: menuState.topMenuItems,
    sidebarItems: menuState.sidebarItems,
    addTopMenuItem: menuRegistry.addTopMenuItem.bind(menuRegistry),
    addSidebarItem: menuRegistry.addSidebarItem.bind(menuRegistry),
    removeTopMenuItem: menuRegistry.removeTopMenuItem.bind(menuRegistry),
    removeSidebarItem: menuRegistry.removeSidebarItem.bind(menuRegistry),
    updateTopMenuItem: menuRegistry.updateTopMenuItem.bind(menuRegistry),
    updateSidebarItem: menuRegistry.updateSidebarItem.bind(menuRegistry),
  };
}
