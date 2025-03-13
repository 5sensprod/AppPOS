// src/components/accessibility/ZoneNavigationHandler.jsx
import { useEffect, useRef } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityProvider';

/**
 * Gère la navigation entre zones avec F6 pour l'accessibilité
 */
const ZoneNavigationHandler = () => {
  const { activeZone, setActiveZone } = useAccessibility();
  const zones = useRef([
    { id: 'topnav', elementId: 'top-menu', name: 'Menu supérieur' },
    { id: 'sidebar', elementId: 'sidebar-menu', name: 'Menu latéral' },
    { id: 'main', elementId: 'main-content', name: 'Contenu principal' },
  ]);

  useEffect(() => {
    // Ajout unique de l'élément announcer pour les lecteurs d'écran
    let announcer = document.getElementById('a11y-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'a11y-announcer';
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    const announceZoneChange = (zoneName) => {
      announcer.textContent = '';
      setTimeout(() => (announcer.textContent = `Navigation vers ${zoneName}`), 50);
    };

    const handleKeyDown = (e) => {
      if (e.key !== 'F6') return;

      e.preventDefault();
      const currentIndex = zones.current.findIndex((zone) => zone.id === activeZone);
      const nextZone = zones.current[(currentIndex + 1) % zones.current.length];

      setActiveZone(nextZone.id);
      const zoneElement = document.getElementById(nextZone.elementId);

      if (zoneElement) {
        const firstFocusable = zoneElement.querySelector(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        );

        (firstFocusable || zoneElement).focus();
        announceZoneChange(nextZone.name);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeZone, setActiveZone]);

  return null; // Aucun rendu visuel
};

export default ZoneNavigationHandler;
