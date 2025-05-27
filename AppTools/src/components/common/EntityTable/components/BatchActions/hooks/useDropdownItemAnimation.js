// hooks/useDropdownItemAnimation.js
import { useMemo } from 'react';

export const useDropdownItemAnimation = (isVisible, totalItems) => {
  // Fonction pour obtenir les classes d'animation d'un item
  const getItemAnimationClasses = useMemo(() => {
    return (index, customClasses = '') => {
      const baseClasses = `transition-all duration-150 ${customClasses} ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
      }`;

      return baseClasses;
    };
  }, [isVisible]);

  // Fonction pour obtenir le style avec délai d'animation
  const getItemAnimationStyle = useMemo(() => {
    return (index) => ({
      transitionDelay: isVisible
        ? `${index * 20}ms`
        : `${Math.max(0, totalItems - index - 1) * 15}ms`,
    });
  }, [isVisible, totalItems]);

  // Fonction pour les items avec hover
  const getItemWithHoverClasses = useMemo(() => {
    return (index, baseClasses = '', hoverClasses = 'hover:bg-gray-50 dark:hover:bg-gray-700') => {
      return `${baseClasses} ${getItemAnimationClasses(index)} ${hoverClasses}`;
    };
  }, [getItemAnimationClasses]);

  // Fonction complète qui combine classes + style
  const getItemAnimation = useMemo(() => {
    return (index, options = {}) => {
      const {
        baseClasses = '',
        hoverClasses = 'hover:bg-gray-50 dark:hover:bg-gray-700',
        additionalClasses = '',
      } = options;

      return {
        className: `${baseClasses} ${getItemAnimationClasses(index, additionalClasses)} ${hoverClasses}`,
        style: getItemAnimationStyle(index),
      };
    };
  }, [getItemAnimationClasses, getItemAnimationStyle]);

  return {
    getItemAnimationClasses,
    getItemAnimationStyle,
    getItemWithHoverClasses,
    getItemAnimation, // API la plus simple à utiliser
  };
};
