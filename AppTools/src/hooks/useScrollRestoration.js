// src/hooks/useScrollRestoration.js
import { useEffect } from 'react';

/**
 * Hook pour restaurer la position de défilement lors de la navigation
 * @param {Object} tablePreferences - Les préférences de la table
 * @param {string} entityType - Type d'entité (ex: 'product', 'supplier')
 */
export const useScrollRestoration = (tablePreferences, entityType) => {
  useEffect(() => {
    // Vérifier si nous avons des préférences de scroll
    const scrollPosition =
      tablePreferences?.detail?.scrollPosition || tablePreferences?.selection?.scrollPosition || 0;

    console.log(`[ScrollRestoration] Tentative de restauration à position: ${scrollPosition}`);

    if (scrollPosition > 0) {
      // Utiliser un délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'instant',
        });
        console.log(`[ScrollRestoration] Position restaurée à: ${scrollPosition}`);
      }, 400); // Augmenter le délai pour donner plus de temps au rendu
    }

    // Optionnellement, mettre en surbrillance le dernier élément focalisé
    const lastFocusedId =
      tablePreferences?.detail?.lastFocusedElementId || tablePreferences?.selection?.focusedItemId;

    if (lastFocusedId) {
      console.log(`[ScrollRestoration] Recherche de l'élément: row-${lastFocusedId}`);

      setTimeout(() => {
        const element = document.getElementById(`row-${lastFocusedId}`);
        if (element) {
          console.log(`[ScrollRestoration] Élément trouvé, défilement vers: row-${lastFocusedId}`);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-row'); // Ajouter une classe pour la mise en évidence

          // Retirer la classe après un moment
          setTimeout(() => {
            element.classList.remove('highlight-row');
          }, 2000);
        } else {
          console.log(`[ScrollRestoration] Élément non trouvé: row-${lastFocusedId}`);
        }
      }, 400);
    }

    // Pas besoin de nettoyer les valeurs ici, car elles doivent persister
  }, [tablePreferences, entityType]);
};

export default useScrollRestoration;
