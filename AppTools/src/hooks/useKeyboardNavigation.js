// src/hooks/useKeyboardNavigation.js
import { useEffect } from 'react';

export const useKeyboardNavigation = ({
  selector = 'a[href], button, [tabindex]:not([tabindex="-1"])',
  direction = 'vertical',
  onActivate = null,
  onExpand = null,
  onCollapse = null,
  containerId = null,
}) => {
  useEffect(() => {
    const getContainer = () => {
      if (!containerId) return document;
      const container = document.getElementById(containerId);
      return container || document;
    };

    const getFocusableElements = () => {
      const container = getContainer();
      return Array.from(container.querySelectorAll(selector));
    };

    const handleKeyDown = (e) => {
      const focusables = getFocusableElements();

      if (!focusables.includes(document.activeElement)) return;

      const currentIndex = focusables.indexOf(document.activeElement);
      const activeElement = document.activeElement;
      const menuId = activeElement.getAttribute('data-menu-id');

      const navigationKeys =
        direction === 'horizontal'
          ? { next: 'ArrowRight', prev: 'ArrowLeft' }
          : { next: 'ArrowDown', prev: 'ArrowUp' };

      // Navigation selon la direction
      if (e.key === navigationKeys.next) {
        e.preventDefault();
        if (currentIndex < focusables.length - 1) {
          focusables[currentIndex + 1].focus();
        }
      } else if (e.key === navigationKeys.prev) {
        e.preventDefault();
        if (currentIndex > 0) {
          focusables[currentIndex - 1].focus();
        }
      }

      // Expansion/réduction (seulement pour les menus verticaux)
      else if (e.key === 'ArrowRight' && direction === 'vertical' && onExpand && menuId) {
        e.preventDefault();
        onExpand(menuId);
      } else if (e.key === 'ArrowLeft' && direction === 'vertical' && onCollapse && menuId) {
        e.preventDefault();
        onCollapse(menuId);
      }

      // Activation avec Entrée ou Espace - CORRECTION ICI
      else if ((e.key === 'Enter' || e.key === ' ') && menuId) {
        e.preventDefault();

        // Si c'est un bouton ou un lien, simuler un clic plutôt que d'appeler onActivate
        if (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'A') {
          activeElement.click();
        }
        // Sinon, utiliser la fonction d'activation si disponible
        else if (onActivate) {
          onActivate(menuId);
        }
      }

      // Navigation rapide
      else if (e.key === 'Home') {
        e.preventDefault();
        if (focusables.length > 0) {
          focusables[0].focus();
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        if (focusables.length > 0) {
          focusables[focusables.length - 1].focus();
        }
      }
    };

    // Ajouter l'écouteur au conteneur
    const container = getContainer();
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [selector, direction, onActivate, onExpand, onCollapse, containerId]);
};

export default useKeyboardNavigation;
