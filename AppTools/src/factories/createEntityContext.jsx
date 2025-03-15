// src/factories/createEntityContext.js
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import apiService from '../services/api';
import websocketService from '../services/websocketService';

export function createEntityContext(options) {
  const {
    entityName,
    apiEndpoint,
    syncEnabled = true,
    customActions = {},
    customReducers = {},
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

  // État initial simplifié
  const initialState = {
    items: [],
    itemsById: {}, // Cache par ID
    loading: false,
    error: null,
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
          console.log(`[REDUCER] Élément ${newItem._id} déjà présent, mise à jour au lieu d'ajout`);
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
        const updatedItems = state.items.map((item) =>
          item._id === syncedItem._id ? syncedItem : item
        );

        return {
          ...state,
          items: updatedItems,
          itemsById: { ...state.itemsById, [syncedItem._id]: syncedItem },
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
      // S'assurer que le nom utilisé pour les abonnements est correct
      // Note: entityPlural normalise le nom pour l'API WebSocket
      const entityPlural = entityName.endsWith('s') ? entityName : `${entityName}s`;
      const entityType = entityName.endsWith('y')
        ? `${entityName.slice(0, -1)}ies` // category -> categories
        : entityName.endsWith('s')
          ? entityName
          : `${entityName}s`; // product -> products

      console.log(
        `[WS-DEBUG] Configuration WebSocket pour ${entityName} (type: ${entityType}, plural: ${entityPlural})`
      );

      const handleUpdate = ({ entityId, data }) => {
        console.log(`[WS-DEBUG] Mise à jour ${entityType} reçue:`, { entityId, data });
        dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: data });
      };

      const handleCreate = ({ data }) => {
        console.log(`[WS-DEBUG] Création ${entityType} reçue:`, data);
        dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: data });
      };

      const handleDelete = ({ entityId }) => {
        console.log(`[WS-DEBUG] Suppression ${entityType} reçue:`, entityId);
        dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: entityId });
      };

      // IMPORTANT: S'abonner aussi aux événements génériques
      const handleGenericEvent = (payload) => {
        if (payload?.entityType === entityType || payload?.entityType === entityPlural) {
          console.log(`[WS-DEBUG] Événement générique pour ${entityType}:`, payload);
          if (payload.entityId && payload.data) {
            dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: payload.data });
          } else if (payload.data && !payload.entityId) {
            dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: payload.data });
          } else if (payload.entityId && !payload.data) {
            dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: payload.entityId });
          }
        }
      };

      // Vérifier la connexion et s'abonner aux mises à jour
      const subscribeToWebSocket = () => {
        if (websocketService.isConnected) {
          // S'abonner avec les deux formats possibles pour plus de sûreté
          websocketService.subscribe(entityPlural);
          if (entityType !== entityPlural) {
            websocketService.subscribe(entityType);
          }

          // Écouter les événements spécifiques (pluriel standard)
          websocketService.on(`${entityPlural}_updated`, handleUpdate);
          websocketService.on(`${entityPlural}_created`, handleCreate);
          websocketService.on(`${entityPlural}_deleted`, handleDelete);

          // Si le pluriel est spécial, écouter aussi ces formats
          if (entityType !== entityPlural) {
            websocketService.on(`${entityType}_updated`, handleUpdate);
            websocketService.on(`${entityType}_created`, handleCreate);
            websocketService.on(`${entityType}_deleted`, handleDelete);
          }

          // Écouter les événements génériques
          websocketService.on('entity_updated', handleGenericEvent);
          websocketService.on('entity_created', handleGenericEvent);
          websocketService.on('entity_deleted', handleGenericEvent);

          console.log(`[WS-DEBUG] Abonnement établi pour ${entityName} (${entityType})`);
        } else {
          console.warn(
            `[WS-DEBUG] WebSocket non connecté, impossible de s'abonner pour ${entityName}`
          );
        }
      };

      subscribeToWebSocket();

      // Écouter les reconnexions WebSocket et réabonner si nécessaire
      const handleReconnect = () => {
        console.log(`[WS-DEBUG] Reconnexion WebSocket détectée, réabonnement à ${entityType}`);
        subscribeToWebSocket();
      };

      websocketService.on('connect', handleReconnect);

      return () => {
        // Nettoyage des abonnements pour éviter les doublons
        websocketService.off(`${entityPlural}_updated`, handleUpdate);
        websocketService.off(`${entityPlural}_created`, handleCreate);
        websocketService.off(`${entityPlural}_deleted`, handleDelete);

        if (entityType !== entityPlural) {
          websocketService.off(`${entityType}_updated`, handleUpdate);
          websocketService.off(`${entityType}_created`, handleCreate);
          websocketService.off(`${entityType}_deleted`, handleDelete);
        }

        websocketService.off('entity_updated', handleGenericEvent);
        websocketService.off('entity_created', handleGenericEvent);
        websocketService.off('entity_deleted', handleGenericEvent);
        websocketService.off('connect', handleReconnect);
      };
    }, [dispatch, entityName]);

    // Actions CRUD standard
    const fetchItems = useCallback(async (params = {}) => {
      dispatch({ type: ACTIONS.FETCH_START });
      try {
        console.log(`Appel API pour ${apiEndpoint}`);
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
        delete cleanedData.gallery_images;
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

        console.log(`Données nettoyées pour mise à jour de ${entityName}:`, cleanedData);

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
      [`${entityName}sById`]: state.itemsById,
      loading: state.loading,
      error: state.error,
      [`fetch${capitalize(entityName)}s`]: fetchItems,
      [`get${capitalize(entityName)}ById`]: getItemById,
      [`create${capitalize(entityName)}`]: createItem,
      [`update${capitalize(entityName)}`]: updateItem,
      [`delete${capitalize(entityName)}`]: deleteItem,
      ...(syncEnabled && { [`sync${capitalize(entityName)}`]: syncItem }),
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

  // Helper pour capitaliser la première lettre
  function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Renvoie un objet avec les exports nommés selon l'entité
  return {
    [`${entityName}Context`]: EntityContext,
    [`${capitalize(entityName)}Provider`]: EntityProvider,
    [`use${capitalize(entityName)}`]: useEntity,
  };
}
