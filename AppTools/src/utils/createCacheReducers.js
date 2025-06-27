// src/utils/createCacheReducers.js

/**
 * Génère les reducers cache standardisés pour une entité
 */
export function createCacheReducers(entityName) {
  const itemsKey = `${entityName}s`;

  return {
    SET_CACHE_TIMESTAMP: (state, action) => ({
      ...state,
      lastFetched: action.payload.timestamp,
    }),

    CLEAR_CACHE: (state) => ({
      ...state,
      [itemsKey]: [],
      lastFetched: null,
      lastUpdated: null,
    }),

    WEBSOCKET_UPDATE: (state, action) => {
      console.log(`🔄 WebSocket: Mise à jour ${entityName} reçue`, action.payload);
      return {
        ...state,
        [itemsKey]: state[itemsKey].map((item) =>
          item._id === action.payload._id ? { ...item, ...action.payload } : item
        ),
        lastUpdated: Date.now(),
      };
    },

    WEBSOCKET_CREATE: (state, action) => {
      console.log(`🆕 WebSocket: Nouveau ${entityName} reçu`, action.payload);
      const existingIndex = state[itemsKey].findIndex((item) => item._id === action.payload._id);
      if (existingIndex >= 0) {
        return {
          ...state,
          [itemsKey]: state[itemsKey].map((item) =>
            item._id === action.payload._id ? { ...item, ...action.payload } : item
          ),
          lastUpdated: Date.now(),
        };
      } else {
        return {
          ...state,
          [itemsKey]: [...state[itemsKey], action.payload],
          lastUpdated: Date.now(),
        };
      }
    },

    WEBSOCKET_DELETE: (state, action) => {
      console.log(`🗑️ WebSocket: Suppression ${entityName} reçue`, action.payload);
      const itemId = action.payload.entityId || action.payload.id || action.payload;
      return {
        ...state,
        [itemsKey]: state[itemsKey].filter((item) => item._id !== itemId),
        lastUpdated: Date.now(),
      };
    },
  };
}
