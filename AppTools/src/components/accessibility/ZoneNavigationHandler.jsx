// src/components/accessibility/ZoneNavigationHandler.jsx
import { useEffect } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityProvider';

/**
 * Composant pour gérer la navigation entre zones avec F6
 */
const ZoneNavigationHandler = () => {
  const { activeZone, setActiveZone } = useAccessibility();

  useEffect(() => {
    const zones = [
      { id: 'topnav', elementId: 'top-menu', name: 'Menu supérieur' },
      { id: 'sidebar', elementId: 'sidebar-menu', name: 'Menu latéral' },
      { id: 'main', elementId: 'main-content', name: 'Contenu principal' },
    ];

    const handleKeyDown = (e) => {
      // Navigation entre zones avec F6
      if (e.key === 'F6') {
        e.preventDefault();

        // Trouver l'index de la zone active
        const currentIndex = zones.findIndex((zone) => zone.id === activeZone);

        // Calculer la zone suivante (cyclique)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % zones.length;
        const nextZone = zones[nextIndex];

        // Changer de zone
        setActiveZone(nextZone.id);

        // Focus sur le premier élément de la zone
        const zoneElement = document.getElementById(nextZone.elementId);
        if (zoneElement) {
          const firstFocusable = zoneElement.querySelector(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            // Si pas d'élément focusable, focus sur la zone elle-même
            zoneElement.tabIndex = -1;
            zoneElement.focus();
          }

          // Annoncer le changement de zone pour les lecteurs d'écran
          announceZoneChange(nextZone.name);
        }
      }
    };

    // Fonction pour annoncer le changement de zone aux lecteurs d'écran
    const announceZoneChange = (zoneName) => {
      const announcer = document.getElementById('a11y-announcer');
      if (!announcer) {
        const newAnnouncer = document.createElement('div');
        newAnnouncer.id = 'a11y-announcer';
        newAnnouncer.setAttribute('aria-live', 'assertive');
        newAnnouncer.setAttribute('aria-atomic', 'true');
        newAnnouncer.className = 'sr-only';
        document.body.appendChild(newAnnouncer);

        setTimeout(() => {
          newAnnouncer.textContent = `Navigation vers ${zoneName}`;
        }, 50);
      } else {
        announcer.textContent = '';
        setTimeout(() => {
          announcer.textContent = `Navigation vers ${zoneName}`;
        }, 50);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeZone, setActiveZone]);

  // Pas de rendu visuel
  return null;
};

export default ZoneNavigationHandler;
