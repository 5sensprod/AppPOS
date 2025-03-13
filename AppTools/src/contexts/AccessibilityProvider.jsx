// src/contexts/AccessibilityProvider.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import { useMenu } from '../components/menu/useMenu';

// Création du contexte
const AccessibilityContext = createContext();

/**
 * Provider pour la gestion centralisée de l'accessibilité
 */
export const AccessibilityProvider = ({ children }) => {
  const { isExpanded, toggleExpanded, sidebarItems } = useMenu();
  const [activeZone, setActiveZone] = useState(null);

  // Trouver un item de menu ou son parent par ID
  const findMenuItem = useCallback((items, id, findParent = false) => {
    for (const item of items) {
      if (!findParent && item.id === id) return item;
      if (item.children) {
        if (findParent && item.children.some((child) => child.id === id)) return item;
        const found = findMenuItem(item.children, id, findParent);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Développer un menu
  const handleExpandMenu = useCallback(
    (menuId) => {
      const menuItem = findMenuItem(sidebarItems, menuId);
      if (menuItem?.children?.length && !isExpanded(menuId)) {
        toggleExpanded(menuId);
      }
    },
    [sidebarItems, isExpanded, toggleExpanded]
  );

  // Réduire un menu
  const handleCollapseMenu = useCallback(
    (menuId) => {
      const parentItem = findMenuItem(sidebarItems, menuId, true);
      if (parentItem && isExpanded(parentItem.id)) {
        toggleExpanded(parentItem.id);
        requestAnimationFrame(() => {
          document.querySelector(`[data-menu-id="${parentItem.id}"]`)?.focus();
        });
      }
    },
    [sidebarItems, isExpanded, toggleExpanded]
  );

  // Activer un menu
  const handleActivateMenu = useCallback(
    (menuId) => {
      const menuItem = findMenuItem(sidebarItems, menuId);
      if (menuItem?.onClick) menuItem.onClick();
      else if (menuItem?.path) document.querySelector(`[data-menu-id="${menuId}"]`)?.click();
    },
    [sidebarItems]
  );

  return (
    <AccessibilityContext.Provider
      value={{
        activeZone,
        setActiveZone,
        handleExpandMenu,
        handleCollapseMenu,
        handleActivateMenu,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

// Hook pour utiliser le contexte d'accessibilité
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility doit être utilisé à l'intérieur d'un AccessibilityProvider");
  }
  return context;
};
