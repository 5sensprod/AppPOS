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

  // Méthode pour trouver un élément de menu par ID
  const findMenuItemById = useCallback((items, id) => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }

      if (item.children) {
        const found = findMenuItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Méthode pour trouver le parent d'un élément de menu
  const findParentMenuItem = useCallback((items, childId) => {
    for (const item of items) {
      if (item.children && item.children.some((child) => child.id === childId)) {
        return item;
      }

      if (item.children) {
        const found = findParentMenuItem(item.children, childId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Méthode pour développer un menu
  const handleExpandMenu = useCallback(
    (menuId) => {
      const menuItem = findMenuItemById(sidebarItems, menuId);
      if (menuItem && menuItem.children && menuItem.children.length > 0) {
        if (!isExpanded(menuId)) {
          toggleExpanded(menuId);
        }
      }
    },
    [sidebarItems, isExpanded, toggleExpanded, findMenuItemById]
  );

  // Méthode pour réduire un menu
  const handleCollapseMenu = useCallback(
    (menuId) => {
      const parentItem = findParentMenuItem(sidebarItems, menuId);
      if (parentItem) {
        if (isExpanded(parentItem.id)) {
          toggleExpanded(parentItem.id);

          // Focus sur le parent
          setTimeout(() => {
            const parentElement = document.querySelector(`[data-menu-id="${parentItem.id}"]`);
            if (parentElement) {
              parentElement.focus();
            }
          }, 0);
        }
      }
    },
    [sidebarItems, isExpanded, toggleExpanded, findParentMenuItem]
  );

  // Méthode pour activer un item de menu
  const handleActivateMenu = useCallback(
    (menuId) => {
      const menuItem = findMenuItemById(sidebarItems, menuId);
      if (menuItem) {
        // Si l'élément a un onClick, l'appeler
        if (menuItem.onClick) {
          menuItem.onClick();
        }
        // Sinon, si c'est un lien, simuler un clic
        else if (menuItem.path) {
          const element = document.querySelector(`[data-menu-id="${menuId}"]`);
          if (element) {
            element.click();
          }
        }
      }
    },
    [sidebarItems, findMenuItemById]
  );

  const value = {
    activeZone,
    setActiveZone,
    handleExpandMenu,
    handleCollapseMenu,
    handleActivateMenu,
    findMenuItemById,
    findParentMenuItem,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

// Hook pour utiliser le contexte d'accessibilité
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility doit être utilisé à l'intérieur d'un AccessibilityProvider");
  }
  return context;
};
