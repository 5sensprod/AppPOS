// src/hooks/useScrollRestoration.js
import { useEffect } from 'react';

/**
 * Hook pour restaurer la position de défilement lors de la navigation
 * @param {Object} tablePreferences - Les préférences de la table
 * @param {string} entityType - Type d'entité (ex: 'product', 'supplier')
 */
export const useScrollRestoration = (tablePreferences, entityType) => {
  useEffect(() => {
    // Restaurer la position de défilement sauvegardée
    if (tablePreferences?.detail?.scrollPosition) {
      setTimeout(() => {
        window.scrollTo({
          top: tablePreferences.detail.scrollPosition,
          behavior: 'instant',
        });
      }, 100);
    }

    // Optionnellement, mettre en surbrillance le dernier élément focalisé
    const lastFocusedId = tablePreferences?.detail?.lastFocusedElementId;
    if (lastFocusedId) {
      const element = document.getElementById(`row-${lastFocusedId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Nettoyer les valeurs après utilisation
    return () => {
      // Si vous avez un moyen de réinitialiser ces valeurs, faites-le ici
    };
  }, [tablePreferences, entityType]);
};

export default useScrollRestoration;
