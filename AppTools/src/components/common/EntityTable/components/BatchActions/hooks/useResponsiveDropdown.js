// hooks/useResponsiveDropdown.js
import { useState, useCallback, useEffect, useRef } from 'react';

export const useResponsiveDropdown = (isOpen) => {
  const buttonRef = useRef(null);
  const [buttonRect, setButtonRect] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Fonction pour calculer la position du bouton
  const updateButtonPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        bottom: rect.bottom + window.scrollY,
      });
    }
  }, []);

  // Gérer l'animation d'ouverture/fermeture
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Petit délai pour permettre au DOM de se mettre à jour
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Attendre la fin de l'animation avant de désafficher
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Mettre à jour la position quand le dropdown est ouvert
  useEffect(() => {
    if (!isOpen || !shouldRender) return;

    const handleResize = () => {
      updateButtonPosition();
    };

    const handleScroll = () => {
      updateButtonPosition();
    };

    // Écouter les événements de redimensionnement et de scroll
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Nettoyage
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, shouldRender, updateButtonPosition]);

  return {
    buttonRef,
    buttonRect,
    updateButtonPosition,
    isVisible, // État pour l'animation
    shouldRender, // État pour le rendu conditionnel
  };
};
