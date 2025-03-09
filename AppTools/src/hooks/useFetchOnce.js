// src/hooks/useFetchOnce.js
import { useEffect } from 'react';

// Stockage partagé entre toutes les instances du hook pour maintenir l'état
// même après un remontage du composant (important pour StrictMode)
const fetchCache = new Map();

/**
 * Hook pour effectuer un appel fetch une seule fois, même en StrictMode
 * @param {Function} fetchFn - Fonction de fetch à appeler
 * @param {Array} items - Tableau d'items déjà en cache
 * @param {Function} isCacheStale - Fonction pour vérifier si le cache est périmé
 * @param {Object} options - Options supplémentaires
 */
export function useFetchOnce(fetchFn, items = [], isCacheStale = () => true, options = {}) {
  const { forceRefresh = false, debug = false, name = 'items' } = options;

  // Générer une clé unique basée sur le nom du fetch
  const cacheKey = `fetch_${name}`;

  useEffect(() => {
    // Vérifier si nous avons déjà effectué ce fetch dans cette session
    if (!fetchCache.has(cacheKey)) {
      fetchCache.set(cacheKey, true);

      const shouldFetch = forceRefresh || items.length === 0 || isCacheStale();

      if (shouldFetch) {
        if (debug) console.log(`Cache périmé ou vide, chargement des ${name}`);
        fetchFn();
      } else if (debug) {
        console.log(`Utilisation du cache pour ${name}`);
      }
    } else if (debug) {
      console.log(`Fetch pour ${name} déjà effectué, ignoré`);
    }

    // Cleanup qui ne fait rien pour maintenir l'état entre les montages
    return () => {};
  }, [fetchFn, items.length, name, forceRefresh, debug, cacheKey]);
}
