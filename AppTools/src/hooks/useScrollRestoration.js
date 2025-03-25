// src/hooks/useScrollRestoration.js
import { useEffect } from 'react';

/**
 * Hook pour positionner directement sur l'élément focalisé sans animation
 * @param {Object} tablePreferences - Les préférences de la table
 * @param {string} entityType - Type d'entité (ex: 'product', 'supplier')
 */
export const useScrollRestoration = (tablePreferences, entityType) => {
  useEffect(() => {
    // Récupérer uniquement l'ID focalisé, sans utiliser la position de défilement
    const lastFocusedId =
      tablePreferences?.detail?.lastFocusedElementId || tablePreferences?.selection?.focusedItemId;

    if (lastFocusedId) {
      // Utiliser un délai plus court
      setTimeout(() => {
        const element = document.getElementById(`row-${lastFocusedId}`);
        if (element) {
          // Désactiver temporairement le comportement de défilement fluide
          const originalScrollBehavior = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';

          // Centrer la ligne dans la fenêtre sans animation
          element.scrollIntoView({ behavior: 'auto', block: 'center' });

          // Rétablir le comportement de défilement original
          document.documentElement.style.scrollBehavior = originalScrollBehavior;

          // Conserver la mise en évidence visuelle
          element.classList.add('highlight-row');
          setTimeout(() => {
            element.classList.remove('highlight-row');
          }, 2000);
        }
      }, 100); // Délai réduit pour un effet plus immédiat
    }
  }, [tablePreferences, entityType]);
};

export default useScrollRestoration;
