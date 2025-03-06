// src/components/menu/KeyboardNavigation.jsx
import { useEffect } from 'react';
import { useMenu } from './useMenu';

/**
 * Component qui gère la navigation au clavier pour la sidebar
 */
export const KeyboardNavigation = () => {
  const { sidebarItems, toggleExpanded, isExpanded } = useMenu();

  useEffect(() => {
    // On cible tout le document pour capturer les événements clavier
    const handleKeyDown = (e) => {
      // Trouver tous les éléments focusables dans le menu
      const focusables = Array.from(
        document.querySelectorAll(
          'aside a[href], aside button, aside [tabindex]:not([tabindex="-1"])'
        )
      );

      // Si aucun élément du menu n'est actuellement focusé, ignorer
      if (!focusables.includes(document.activeElement)) {
        return;
      }

      const currentIndex = focusables.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < focusables.length - 1) {
            focusables[currentIndex + 1].focus();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            focusables[currentIndex - 1].focus();
          }
          break;

        case 'ArrowRight':
          // Trouver l'élément de menu correspondant à l'élément actif
          const activeElement = document.activeElement;
          const menuId = activeElement.getAttribute('data-menu-id');

          if (menuId) {
            // Trouver cet élément dans les sidebarItems
            const menuItem = findMenuItemById(sidebarItems, menuId);

            if (menuItem && menuItem.children && menuItem.children.length > 0) {
              e.preventDefault();
              if (!isExpanded(menuId)) {
                toggleExpanded(menuId);
              }
            }
          }
          break;

        case 'ArrowLeft':
          // Si l'élément actif est dans un sous-menu, fermer le parent
          const focusedElement = document.activeElement;
          const focusedMenuId = focusedElement.getAttribute('data-menu-id');

          if (focusedMenuId) {
            // Chercher le parent
            const parentItem = findParentMenuItem(sidebarItems, focusedMenuId);
            if (parentItem) {
              e.preventDefault();
              if (isExpanded(parentItem.id)) {
                toggleExpanded(parentItem.id);
                // Mettre le focus sur le parent
                const parentElement = document.querySelector(`[data-menu-id="${parentItem.id}"]`);
                if (parentElement) {
                  parentElement.focus();
                }
              }
            }
          }
          break;

        case 'Home':
          e.preventDefault();
          if (focusables.length > 0) {
            focusables[0].focus();
          }
          break;

        case 'End':
          e.preventDefault();
          if (focusables.length > 0) {
            focusables[focusables.length - 1].focus();
          }
          break;

        default:
          break;
      }
    };

    // Fonction récursive pour trouver un élément de menu par ID
    const findMenuItemById = (items, id) => {
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
    };

    // Fonction pour trouver le parent d'un élément
    const findParentMenuItem = (items, childId) => {
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
    };

    // Ajouter l'écouteur d'événements au document entier
    document.addEventListener('keydown', handleKeyDown);

    // Nettoyage
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarItems, toggleExpanded, isExpanded]); // Dépendances importantes

  // Ce composant n'a pas de rendu visuel
  return null;
};

export default KeyboardNavigation;
