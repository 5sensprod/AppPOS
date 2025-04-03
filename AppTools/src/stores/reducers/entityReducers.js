// src/stores/reducers/entityReducers.js

import { buildItemsById } from '../../utils/entityUtils';

/**
 * Génère les reducers standards pour les entités
 * @param {Object} ACTIONS - dictionnaire des types d'action
 * @returns {Object} dictionnaire des reducers
 */
export const getStandardEntityReducers = (ACTIONS) => ({
  [ACTIONS.FETCH_START]: () => ({ loading: true, error: null }),

  [ACTIONS.FETCH_SUCCESS]: (state, action) => ({
    items: action.payload,
    itemsById: buildItemsById(action.payload),
    loading: false,
  }),

  [ACTIONS.FETCH_ERROR]: (state, action) => ({ error: action.payload, loading: false }),

  [ACTIONS.CREATE_SUCCESS]: (state, action) => {
    const item = action.payload;
    const exists = state.items.some((i) => i._id === item._id);
    const updatedItems = exists
      ? state.items.map((i) => (i._id === item._id ? item : i))
      : [...state.items, item];

    return {
      items: updatedItems,
      itemsById: { ...state.itemsById, [item._id]: item },
      loading: false,
    };
  },

  [ACTIONS.UPDATE_SUCCESS]: (state, action) => {
    const item = action.payload;
    return {
      items: state.items.map((i) => (i._id === item._id ? item : i)),
      itemsById: { ...state.itemsById, [item._id]: item },
      loading: false,
    };
  },

  [ACTIONS.DELETE_SUCCESS]: (state, action) => {
    const id = action.payload;
    const { [id]: _, ...restById } = state.itemsById;
    return {
      items: state.items.filter((i) => i._id !== id),
      itemsById: restById,
      loading: false,
    };
  },

  [ACTIONS.SYNC_SUCCESS]: (state, action) => {
    const item = { ...action.payload, pending_sync: false };
    return {
      items: state.items.map((i) => (i._id === item._id ? item : i)),
      itemsById: { ...state.itemsById, [item._id]: item },
      loading: false,
    };
  },
});
