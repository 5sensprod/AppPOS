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
    const container = containerId ? document.getElementById(containerId) || document : document;
    const focusables = () => Array.from(container.querySelectorAll(selector));

    const navigationKeys = new Map([
      ['ArrowDown', { move: 1, condition: direction === 'vertical' }],
      ['ArrowUp', { move: -1, condition: direction === 'vertical' }],
      ['ArrowRight', { action: onExpand, condition: direction === 'vertical' }],
      ['ArrowLeft', { action: onCollapse, condition: direction === 'vertical' }],
      ['Enter', { action: true }],
      [' ', { action: true }],
      ['Home', { move: 'start' }],
      ['End', { move: 'end' }],
    ]);

    const handleKeyDown = (e) => {
      const elements = focusables();
      const activeElement = document.activeElement;
      if (!elements.includes(activeElement)) return;

      const { key } = e;
      const action = navigationKeys.get(key);
      if (!action) return;

      e.preventDefault();
      const currentIndex = elements.indexOf(activeElement);
      const menuId = activeElement.getAttribute('data-menu-id');

      if (action.move !== undefined) {
        if (action.move === 'start') elements[0]?.focus();
        else if (action.move === 'end') elements[elements.length - 1]?.focus();
        else {
          const nextIndex = currentIndex + action.move;
          if (elements[nextIndex]) elements[nextIndex].focus();
        }
      }

      if (action.action && menuId) {
        if (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'A') {
          activeElement.click();
        } else {
          action.action(menuId);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [selector, direction, onActivate, onExpand, onCollapse, containerId]);
};

export default useKeyboardNavigation;
