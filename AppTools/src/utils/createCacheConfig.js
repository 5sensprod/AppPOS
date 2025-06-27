// src/utils/createCacheConfig.js

/**
 * Configuration du cache par entité
 */
const ENTITY_CACHE_CONFIG = {
  product: { duration: 5 * 60 * 1000 }, // 5min - change souvent
  category: { duration: 3 * 60 * 1000 }, // 3min - tree changes
  brand: { duration: 10 * 60 * 1000 }, // 10min - très stable
  supplier: { duration: 8 * 60 * 1000 }, // 8min - moyennement stable
};

/**
 * Génère la config cache pour une entité
 */
export function createCacheConfig(entityName, customOptions = {}) {
  const defaultConfig = ENTITY_CACHE_CONFIG[entityName] || { duration: 5 * 60 * 1000 };

  return {
    duration: customOptions.duration || defaultConfig.duration,
    entityName,
    stateKeys: {
      items: `${entityName}s`,
      lastFetched: 'lastFetched',
      lastUpdated: 'lastUpdated',
    },
    methods: {
      fetch: `fetch${capitalize(entityName)}s`,
      refresh: `refresh${capitalize(entityName)}s`,
      clear: 'clearCache',
      invalidate: 'invalidateCache',
      isValid: 'isCacheValid',
    },
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
