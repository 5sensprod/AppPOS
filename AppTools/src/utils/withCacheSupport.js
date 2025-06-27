// src/utils/withCacheSupport.js
import { createCacheConfig } from './createCacheConfig';
import apiService from '../services/api';

/**
 * Injecte les méthodes cache standardisées
 */
export function withCacheSupport(entityName, apiEndpoint, customMethods = () => ({})) {
  const cacheConfig = createCacheConfig(entityName);
  const { duration, stateKeys } = cacheConfig;

  return (set, get) => ({
    // Dispatch pour les reducers
    dispatch: (action) => {
      const state = get();
      // À compléter avec les reducers cache
      console.warn(`[${entityName.toUpperCase()}] Action: ${action.type}`);
    },

    // Fetch avec cache
    [`fetch${capitalize(entityName)}s`]: async (forceRefresh = false, params = {}) => {
      const state = get();
      const now = Date.now();

      // Vérifier cache (seulement si pas de params et pas de forceRefresh)
      if (
        !forceRefresh &&
        Object.keys(params).length === 0 &&
        state[stateKeys.items]?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < duration
      ) {
        console.log(`📦 Utilisation du cache des ${entityName}s`);
        return state[stateKeys.items];
      }

      try {
        set({ loading: true, error: null });
        console.log(`🔄 Fetch des ${entityName}s depuis l'API...`);

        const response = await apiService.get(apiEndpoint, { params });
        const items = response.data.data || [];

        set({
          [stateKeys.items]: items,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ ${items.length} ${entityName}s chargés et mis en cache`);
        return items;
      } catch (error) {
        console.error(`❌ Erreur lors du fetch des ${entityName}s:`, error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    // Refresh forcé
    [`refresh${capitalize(entityName)}s`]: async () => {
      console.log(`🔄 Refresh forcé des ${entityName}s...`);
      const fetch = get()[`fetch${capitalize(entityName)}s`];
      return fetch(true);
    },

    // Vérification cache
    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < duration;
    },

    // Nettoyage cache
    clearCache: () => {
      console.log(`🗑️ Cache des ${entityName}s nettoyé`);
      set({
        [stateKeys.items]: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    // Invalidation cache
    invalidateCache: () => {
      console.log(`❌ Cache des ${entityName}s invalidé`);
      set({ lastFetched: null });
    },

    // Méthodes custom de l'entité
    ...customMethods(set, get),
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
