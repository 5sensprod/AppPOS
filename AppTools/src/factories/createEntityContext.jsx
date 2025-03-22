// src/factories/createEntityContext.js
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import apiService from '../services/api';
import websocketService from '../services/websocketService';
import { pluralize, capitalize } from '../utils/entityUtils';
import { createEntityImageHandlers } from './createEntityImageHandlers';

export function createEntityContext(options) {
  const {
    entityName,
    apiEndpoint,
    syncEnabled = true,
    imagesEnabled = true, // Nouvelle option pour activer/désactiver la gestion des images
    customActions = {},
    customReducers = {},
  } = options;

  // Création du contexte
  const EntityContext = createContext();

  // Actions standards pour les images
  const standardImageActions = imagesEnabled
    ? {
        UPLOAD_IMAGE: 'UPLOAD_IMAGE',
        DELETE_IMAGE: 'DELETE_IMAGE',
      }
    : {};

  // Actions standards et personnalisées
  const ACTIONS = {
    FETCH_START: 'FETCH_START',
    FETCH_SUCCESS: 'FETCH_SUCCESS',
    FETCH_ERROR: 'FETCH_ERROR',
    CREATE_SUCCESS: 'CREATE_SUCCESS',
    UPDATE_SUCCESS: 'UPDATE_SUCCESS',
    DELETE_SUCCESS: 'DELETE_SUCCESS',
    SYNC_SUCCESS: 'SYNC_SUCCESS',
    ...standardImageActions,
    ...customActions,
  };

  // Reducers standards pour les images
  const standardImageReducers = imagesEnabled
    ? {
        UPLOAD_IMAGE: (state, action) => {
          return {
            ...state,
            items: state.items.map((item) =>
              item._id === action.payload.id ? { ...item, image: action.payload.image } : item
            ),
            itemsById: {
              ...state.itemsById,
              [action.payload.id]: {
                ...state.itemsById[action.payload.id],
                image: action.payload.image,
              },
            },
            loading: false,
          };
        },
        DELETE_IMAGE: (state, action) => {
          return {
            ...state,
            items: state.items.map((item) =>
              item._id === action.payload.id ? { ...item, image: null } : item
            ),
            itemsById: {
              ...state.itemsById,
              [action.payload.id]: {
                ...state.itemsById[action.payload.id],
                image: null,
              },
            },
            loading: false,
          };
        },
      }
    : {};

  // État initial simplifié
  const initialState = {
    items: [],
    itemsById: {},
    loading: false,
    error: null,
  };

  // Reducer avec gestion des actions communes et personnalisées
  function entityReducer(state, action) {
    // Vérifier si un reducer personnalisé existe pour cette action
    if (customReducers[action.type]) {
      return customReducers[action.type](state, action);
    }

    // Vérifier si un reducer standard pour images existe pour cette action
    if (standardImageReducers[action.type]) {
      return standardImageReducers[action.type](state, action);
    }

    // Reducers standards
    switch (action.type) {
      case ACTIONS.FETCH_START:
        return { ...state, loading: true, error: null };

      case ACTIONS.FETCH_SUCCESS:
        // Construit un cache par ID pour un accès rapide
        const itemsById = action.payload.reduce((acc, item) => {
          acc[item._id] = item;
          return acc;
        }, {});

        return {
          ...state,
          items: action.payload,
          itemsById,
          loading: false,
        };

      case ACTIONS.FETCH_ERROR:
        return { ...state, error: action.payload, loading: false };

      case ACTIONS.CREATE_SUCCESS: {
        const newItem = action.payload;

        // Vérifier si l'élément existe déjà pour éviter les doublons
        const itemExists = state.items.some((item) => item._id === newItem._id);

        if (itemExists) {
          const updatedItems = state.items.map((item) =>
            item._id === newItem._id ? newItem : item
          );

          return {
            ...state,
            items: updatedItems,
            itemsById: { ...state.itemsById, [newItem._id]: newItem },
            loading: false,
          };
        }

        // Si l'élément n'existe pas, l'ajouter normalement
        const updatedItems = [...state.items, newItem];

        return {
          ...state,
          items: updatedItems,
          itemsById: { ...state.itemsById, [newItem._id]: newItem },
          loading: false,
        };
      }

      case ACTIONS.UPDATE_SUCCESS: {
        const updatedItem = action.payload;
        const updatedItems = state.items.map((item) =>
          item._id === updatedItem._id ? updatedItem : item
        );

        return {
          ...state,
          items: updatedItems,
          itemsById: { ...state.itemsById, [updatedItem._id]: updatedItem },
          loading: false,
        };
      }

      case ACTIONS.DELETE_SUCCESS: {
        const newItemsById = { ...state.itemsById };
        delete newItemsById[action.payload];
        const filteredItems = state.items.filter((item) => item._id !== action.payload);

        return {
          ...state,
          items: filteredItems,
          itemsById: newItemsById,
          loading: false,
        };
      }

      case ACTIONS.SYNC_SUCCESS: {
        const syncedItem = action.payload;

        // S'assurer que pending_sync est à false dans l'item synchronisé
        const updatedSyncedItem = {
          ...syncedItem,
          pending_sync: false,
        };

        const updatedItems = state.items.map((item) =>
          item._id === updatedSyncedItem._id ? updatedSyncedItem : item
        );

        return {
          ...state,
          items: updatedItems,
          itemsById: { ...state.itemsById, [updatedSyncedItem._id]: updatedSyncedItem },
          loading: false,
        };
      }

      default:
        return state;
    }
  }

  // Provider du contexte
  function EntityProvider({ children, initialItems = [] }) {
    const [state, dispatch] = useReducer(entityReducer, {
      ...initialState,
      items: initialItems,
      itemsById: initialItems.reduce((acc, item) => {
        acc[item._id] = item;
        return acc;
      }, {}),
    });

    useEffect(() => {
      const entityPlural = pluralize(entityName);

      const handleUpdate = ({ entityId, data }) => {
        dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: data });
      };

      const handleCreate = (data) => {
        dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: data });
      };

      const handleDelete = ({ entityId }) => {
        dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: entityId });
      };

      // Vérifier la connexion et s'abonner aux mises à jour
      const subscribeToWebSocket = () => {
        if (websocketService.isConnected) {
          // S'abonner avec le format pluriel uniquement
          websocketService.subscribe(entityPlural);

          // Écouter les événements spécifiques avec le format point
          websocketService.on(`${entityPlural}.updated`, handleUpdate);
          websocketService.on(`${entityPlural}.created`, handleCreate);
          websocketService.on(`${entityPlural}.deleted`, handleDelete);
        } else {
          console.warn(
            `[WS-DEBUG] WebSocket non connecté, impossible de s'abonner pour ${entityName}`
          );
        }
      };

      subscribeToWebSocket();

      // Écouter les reconnexions WebSocket et réabonner si nécessaire
      const handleReconnect = () => {
        subscribeToWebSocket();
      };

      websocketService.on('connect', handleReconnect);

      return () => {
        // Nettoyage des abonnements pour éviter les doublons
        websocketService.off(`${entityPlural}.updated`, handleUpdate);
        websocketService.off(`${entityPlural}.created`, handleCreate);
        websocketService.off(`${entityPlural}.deleted`, handleDelete);

        websocketService.off('connect', handleReconnect);
      };
    }, [dispatch, entityName]);

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
      // Toujours récupérer les données fraîches
      dispatch({ type: ACTIONS.FETCH_START });

      try {
        const response = await apiService.get(`${apiEndpoint}/${id}`);
        const item = response.data.data;

        dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: item });
        return item;
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
        // Nettoyer les données avant envoi
        const cleanedData = { ...itemData };

        // Supprimer les champs non autorisés
        delete cleanedData._id;
        delete cleanedData.woo_id;
        delete cleanedData.last_sync;
        delete cleanedData.createdAt;
        delete cleanedData.updatedAt;
        delete cleanedData.image;
        delete cleanedData.pending_sync;
        delete cleanedData.SKU;

        // Convertir chaînes vides en null pour les champs de premier niveau
        Object.keys(cleanedData).forEach((key) => {
          if (cleanedData[key] === '') {
            cleanedData[key] = null;
          }
          // Traiter les objets imbriqués
          else if (typeof cleanedData[key] === 'object' && cleanedData[key] !== null) {
            Object.keys(cleanedData[key]).forEach((subKey) => {
              if (cleanedData[key][subKey] === '') {
                cleanedData[key][subKey] = null;
              }
            });
          }
        });

        const response = await apiService.put(`${apiEndpoint}/${id}`, cleanedData);
        dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: response.data.data });
        return response.data;
      } catch (error) {
        console.error(`Erreur lors de la mise à jour de ${entityName}:`, error);
        if (error.response && error.response.data) {
          console.error("Détails de l'erreur:", error.response.data);
        }
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
      ? useCallback(
          async (id) => {
            dispatch({ type: ACTIONS.FETCH_START });
            try {
              // Utiliser le path standardisé pour tous les types d'entités
              const response = await apiService.post(`${apiEndpoint}/${id}/sync`);
              dispatch({ type: ACTIONS.SYNC_SUCCESS, payload: response.data.data });
              return response.data;
            } catch (error) {
              dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
              throw error;
            }
          },
          [apiEndpoint]
        )
      : null;

    // Fonctions de gestion d'images (conditionnelles)
    const imageHandlers = imagesEnabled
      ? createEntityImageHandlers(entityName, apiEndpoint, dispatch, ACTIONS)
      : {};

    // Construction de la valeur du contexte avec noms adaptés à l'entité
    const value = {
      [`${pluralize(entityName)}`]: state.items,
      [`${entityName}sById`]: state.itemsById,
      loading: state.loading,
      error: state.error,
      [`fetch${capitalize(entityName)}s`]: fetchItems,
      [`get${capitalize(entityName)}ById`]: getItemById,
      [`create${capitalize(entityName)}`]: createItem,
      [`update${capitalize(entityName)}`]: updateItem,
      [`delete${capitalize(entityName)}`]: deleteItem,
      ...(syncEnabled && { [`sync${capitalize(entityName)}`]: syncItem }),
      ...(imagesEnabled && {
        [`uploadImage`]: imageHandlers.uploadImage,
        [`deleteImage`]: imageHandlers.deleteImage,
      }),
      // Exposer dispatch pour permettre des actions personnalisées
      dispatch,
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

  // Hook personnalisé pour les fonctionnalités supplémentaires (comme ExtrasHook)
  function useEntityExtras() {
    const context = useEntity();
    return {
      ...context,
    };
  }

  // Renvoie un objet avec les exports nommés selon l'entité
  return {
    [`${entityName}Context`]: EntityContext,
    [`${capitalize(entityName)}Provider`]: EntityProvider,
    [`use${capitalize(entityName)}`]: useEntity,
    [`use${capitalize(entityName)}Extras`]: useEntityExtras,
  };
}
