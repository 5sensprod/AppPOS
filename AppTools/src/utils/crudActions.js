// src/utils/crudActions.js
import apiService from '../services/api';
import { cleanUpdateData } from './entityUtils';

/**
 * Génère les actions CRUD standard pour une entité avec support cache
 * @param {string} apiEndpoint - endpoint de l'entité
 * @param {function} dispatch - dispatcher Zustand
 * @param {object} ACTIONS - types d'actions
 * @param {object} cacheConfig - configuration cache optionnelle
 */
export const createCrudActions = (apiEndpoint, dispatch, ACTIONS, cacheConfig = null) => ({
  fetchItems: async (params = {}) => {
    // Si cache disponible et pas de params, utiliser la méthode cache
    if (cacheConfig && Object.keys(params).length === 0) {
      // Déléguer au fetch avec cache du store
      return null; // Le store gère via withCacheSupport
    }

    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const res = await apiService.get(apiEndpoint, { params });
      dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: res.data.data });
      return res.data.data;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },

  getItemById: async (id) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const res = await apiService.get(`${apiEndpoint}/${id}`);
      dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: res.data.data });
      return res.data.data;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },

  createItem: async (data) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const res = await apiService.post(apiEndpoint, data);
      dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: res.data.data });

      // Invalider le cache après création
      if (cacheConfig?.invalidateOnMutation) {
        dispatch({ type: 'INVALIDATE_CACHE' });
      }

      return res.data.data;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },

  updateItem: async (id, data) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      const cleaned = cleanUpdateData(data);
      const res = await apiService.put(`${apiEndpoint}/${id}`, cleaned);
      dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: res.data.data });

      // Marquer comme mis à jour (cache reste valide)
      if (cacheConfig) {
        dispatch({ type: 'MARK_UPDATED', payload: { timestamp: Date.now() } });
      }

      return res.data.data;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },

  deleteItem: async (id) => {
    dispatch({ type: ACTIONS.FETCH_START });
    try {
      await apiService.delete(`${apiEndpoint}/${id}`);
      dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: id });

      // Marquer comme mis à jour (cache reste valide)
      if (cacheConfig) {
        dispatch({ type: 'MARK_UPDATED', payload: { timestamp: Date.now() } });
      }

      return true;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },
});
