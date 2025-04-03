// src/utils/crudActions.js
import apiService from '../services/api';
import { cleanUpdateData } from './entityUtils';

/**
 * Génère les actions CRUD standard pour une entité
 * @param {string} apiEndpoint - endpoint de l'entité
 * @param {function} dispatch - dispatcher Zustand
 * @param {object} ACTIONS - types d'actions
 */
export const createCrudActions = (apiEndpoint, dispatch, ACTIONS) => ({
  fetchItems: async (params = {}) => {
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
      return true;
    } catch (err) {
      dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
      throw err;
    }
  },
});
