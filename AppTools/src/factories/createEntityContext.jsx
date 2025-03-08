// src/factories/createEntityContext.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import apiService from '../services/api';

export function createEntityContext(options) {
  const {
    entityName, // Nom de l'entité (ex: 'product')
    apiEndpoint, // Endpoint API (ex: '/api/products')
    syncEnabled = true, // Si la synchronisation WooCommerce est disponible
    customActions = {}, // Actions spécifiques à l'entité
    customReducers = {}, // Reducers spécifiques à l'entité
  } = options;

  // Création du contexte
  const EntityContext = createContext();

  // Actions standards et personnalisées
  const ACTIONS = {
    FETCH_START: 'FETCH_START',
    FETCH_SUCCESS: 'FETCH_SUCCESS',
    FETCH_ERROR: 'FETCH_ERROR',
    CREATE_SUCCESS: 'CREATE_SUCCESS',
    UPDATE_SUCCESS: 'UPDATE_SUCCESS',
    DELETE_SUCCESS: 'DELETE_SUCCESS',
    SYNC_SUCCESS: 'SYNC_SUCCESS',
    ...customActions,
  };

  // Reducer avec gestion des actions communes et personnalisées
  function entityReducer(state, action) {
    // Vérifier si un reducer personnalisé existe pour cette action
    if (customReducers[action.type]) {
      return customReducers[action.type](state, action);
    }

    // Reducers standards
    switch (action.type) {
      case ACTIONS.FETCH_START:
        return { ...state, loading: true, error: null };
      case ACTIONS.FETCH_SUCCESS:
        return { ...state, items: action.payload, loading: false };
      case ACTIONS.FETCH_ERROR:
        return { ...state, error: action.payload, loading: false };
      case ACTIONS.CREATE_SUCCESS:
        return {
          ...state,
          items: [...state.items, action.payload],
          loading: false,
        };
      case ACTIONS.UPDATE_SUCCESS:
        return {
          ...state,
          items: state.items.map((item) =>
            item._id === action.payload._id ? action.payload : item
          ),
          loading: false,
        };
      case ACTIONS.DELETE_SUCCESS:
        return {
          ...state,
          items: state.items.filter((item) => item._id !== action.payload),
          loading: false,
        };
      case ACTIONS.SYNC_SUCCESS:
        return {
          ...state,
          items: state.items.map((item) =>
            item._id === action.payload._id ? action.payload : item
          ),
          loading: false,
        };
      default:
        return state;
    }
  }

  // Provider du contexte
  function EntityProvider({ children, initialItems = [] }) {
    const initialState = {
      items: initialItems,
      loading: false,
      error: null,
    };

    const [state, dispatch] = useReducer(entityReducer, initialState);

    // Actions CRUD standard
    const fetchItems = useCallback(async (params = {}) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        const response = await apiService.get(apiEndpoint, { params });
        dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: response.data.data });
        return response.data;
      } catch (error) {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
        throw error;
      }
    }, []);

    const getItemById = useCallback(async (id) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        const response = await apiService.get(`${apiEndpoint}/${id}`);
        return response.data.data;
      } catch (error) {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
        throw error;
      }
    }, []);

    const createItem = useCallback(async (itemData) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        const response = await apiService.post(apiEndpoint, itemData);
        dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: response.data.data });
        return response.data;
      } catch (error) {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
        throw error;
      }
    }, []);

    const updateItem = useCallback(async (id, itemData) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        const response = await apiService.put(`${apiEndpoint}/${id}`, itemData);
        dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: response.data.data });
        return response.data;
      } catch (error) {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
        throw error;
      }
    }, []);

    const deleteItem = useCallback(async (id) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        await apiService.delete(`${apiEndpoint}/${id}`);
        dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: id });
        return true;
      } catch (error) {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
        throw error;
      }
    }, []);

    // Action de synchronisation (conditionnelle)
    const syncItem = syncEnabled
      ? useCallback(async (id) => {
          dispatch({ type: ACTIONS.FETCH_START });
          try {
            const response = await apiService.post(
              `/api/sync${apiEndpoint.replace('/api', '')}/${id}/sync`
            );
            dispatch({ type: ACTIONS.SYNC_SUCCESS, payload: response.data.data });
            return response.data;
          } catch (error) {
            dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
            throw error;
          }
        }, [])
      : null;

    // Construction de la valeur du contexte avec noms adaptés à l'entité
    const value = {
      [`${entityName}s`]: state.items,
      loading: state.loading,
      error: state.error,
      [`fetch${capitalize(entityName)}s`]: fetchItems,
      [`get${capitalize(entityName)}ById`]: getItemById,
      [`create${capitalize(entityName)}`]: createItem,
      [`update${capitalize(entityName)}`]: updateItem,
      [`delete${capitalize(entityName)}`]: deleteItem,
      ...(syncEnabled && { [`sync${capitalize(entityName)}`]: syncItem }),
    };

    return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
  }

  // Hook personnalisé pour utiliser le contexte
  function useEntity() {
    const context = useContext(EntityContext);
    if (context === undefined) {
      throw new Error(
        `use${capitalize(entityName)} must be used within a ${capitalize(entityName)}Provider`
      );
    }
    return context;
  }

  // Helper pour capitaliser la première lettre
  function capitalize(string) {
    if (!string) return ''; // Retourne une chaîne vide si string est undefined ou null
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Renvoie un objet avec les exports nommés selon l'entité
  return {
    [`${entityName}Context`]: EntityContext,
    [`${capitalize(entityName)}Provider`]: EntityProvider,
    [`use${capitalize(entityName)}`]: useEntity,
  };
}
