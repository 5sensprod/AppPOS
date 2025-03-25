// src/factories/createEntityStore.js
import { create } from 'zustand';
import { pluralize, capitalize } from '../utils/entityUtils';
import apiService from '../services/api';
import websocketService from '../services/websocketService';
import { createEntityImageHandlers } from './createEntityImageHandlers';

export function createEntityStore(options) {
  const {
    entityName,
    apiEndpoint,
    syncEnabled = true,
    imagesEnabled = true,
    hierarchicalEnabled = false,
    hierarchicalEndpoint = null,
    webSocketIntegration = null,
    customActions = {},
    customReducers = {},
  } = options;

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
    ...(hierarchicalEnabled && {
      HIERARCHICAL_FETCH_START: 'HIERARCHICAL_FETCH_START',
      HIERARCHICAL_FETCH_SUCCESS: 'HIERARCHICAL_FETCH_SUCCESS',
      HIERARCHICAL_FETCH_ERROR: 'HIERARCHICAL_FETCH_ERROR',
    }),
    ...standardImageActions,
    ...customActions,
  };

  // Reducers standards pour les images
  const standardImageReducers = imagesEnabled
    ? {
        UPLOAD_IMAGE: (state, action) => ({
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
        }),
        DELETE_IMAGE: (state, action) => ({
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
        }),
      }
    : {};

  // État initial
  const initialState = {
    items: [],
    itemsById: {},
    loading: false,
    error: null,
    ...(hierarchicalEnabled && {
      hierarchicalItems: [],
      hierarchicalLoading: false,
      hierarchicalError: null,
    }),
  };

  // Création du store Zustand
  const useEntityStore = create((set, get) => {
    // Fonction pour dispatcher des actions
    const dispatch = (action) => {
      const state = get();

      // Vérifier si un reducer personnalisé existe pour cette action
      if (customReducers[action.type]) {
        set(customReducers[action.type](state, action));
        return;
      }

      // Vérifier si un reducer standard pour images existe pour cette action
      if (standardImageReducers[action.type]) {
        set(standardImageReducers[action.type](state, action));
        return;
      }

      // Reducers standards
      switch (action.type) {
        case ACTIONS.FETCH_START:
          set({ loading: true, error: null });
          break;

        case ACTIONS.FETCH_SUCCESS:
          // Construit un cache par ID pour un accès rapide
          const itemsById = action.payload.reduce((acc, item) => {
            acc[item._id] = item;
            return acc;
          }, {});

          set({
            items: action.payload,
            itemsById,
            loading: false,
          });
          break;

        case ACTIONS.FETCH_ERROR:
          set({ error: action.payload, loading: false });
          break;

        case ACTIONS.CREATE_SUCCESS: {
          const newItem = action.payload;

          // Vérifier si l'élément existe déjà pour éviter les doublons
          const itemExists = state.items.some((item) => item._id === newItem._id);

          if (itemExists) {
            set({
              items: state.items.map((item) => (item._id === newItem._id ? newItem : item)),
              itemsById: { ...state.itemsById, [newItem._id]: newItem },
              loading: false,
            });
          } else {
            // Si l'élément n'existe pas, l'ajouter normalement
            set({
              items: [...state.items, newItem],
              itemsById: { ...state.itemsById, [newItem._id]: newItem },
              loading: false,
            });
          }
          break;
        }

        case ACTIONS.UPDATE_SUCCESS: {
          const updatedItem = action.payload;
          set({
            items: state.items.map((item) => (item._id === updatedItem._id ? updatedItem : item)),
            itemsById: { ...state.itemsById, [updatedItem._id]: updatedItem },
            loading: false,
          });
          break;
        }

        case ACTIONS.DELETE_SUCCESS: {
          const newItemsById = { ...state.itemsById };
          delete newItemsById[action.payload];
          set({
            items: state.items.filter((item) => item._id !== action.payload),
            itemsById: newItemsById,
            loading: false,
          });
          break;
        }

        case ACTIONS.SYNC_SUCCESS: {
          const syncedItem = action.payload;
          const updatedSyncedItem = { ...syncedItem, pending_sync: false };
          set({
            items: state.items.map((item) =>
              item._id === updatedSyncedItem._id ? updatedSyncedItem : item
            ),
            itemsById: { ...state.itemsById, [updatedSyncedItem._id]: updatedSyncedItem },
            loading: false,
          });
          break;
        }

        // Ajout des reducers pour les données hiérarchiques
        case ACTIONS.HIERARCHICAL_FETCH_START:
          set({ hierarchicalLoading: true, hierarchicalError: null });
          break;

        case ACTIONS.HIERARCHICAL_FETCH_SUCCESS:
          set({
            hierarchicalItems: action.payload,
            hierarchicalLoading: false,
          });
          break;

        case ACTIONS.HIERARCHICAL_FETCH_ERROR:
          set({ hierarchicalError: action.payload, hierarchicalLoading: false });
          break;

        default:
          break;
      }
    };

    // Créer les gestionnaires d'images si nécessaire
    const imageHandlers = imagesEnabled
      ? createEntityImageHandlers(entityName, apiEndpoint, dispatch, ACTIONS)
      : {};

    const storeActions = {
      // État initial
      ...initialState,

      // Méthode pour dispatcher des actions
      dispatch,

      // Actions CRUD
      fetchItems: async (params = {}) => {
        dispatch({ type: ACTIONS.FETCH_START });
        try {
          const response = await apiService.get(apiEndpoint, { params });
          dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: response.data.data });
          return response.data;
        } catch (error) {
          dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
          throw error;
        }
      },

      getItemById: async (id) => {
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
      },

      createItem: async (itemData) => {
        dispatch({ type: ACTIONS.FETCH_START });
        try {
          const response = await apiService.post(apiEndpoint, itemData);
          dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: response.data.data });
          return response.data;
        } catch (error) {
          dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
          throw error;
        }
      },

      updateItem: async (id, itemData) => {
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
      },

      deleteItem: async (id) => {
        dispatch({ type: ACTIONS.FETCH_START });
        try {
          await apiService.delete(`${apiEndpoint}/${id}`);
          dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: id });
          return true;
        } catch (error) {
          dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
          throw error;
        }
      },

      // Fonction de synchronisation (si activée)
      ...(syncEnabled && {
        syncItem: async (id) => {
          dispatch({ type: ACTIONS.FETCH_START });
          try {
            const response = await apiService.post(`${apiEndpoint}/${id}/sync`);
            dispatch({ type: ACTIONS.SYNC_SUCCESS, payload: response.data.data });
            return response.data;
          } catch (error) {
            dispatch({ type: ACTIONS.FETCH_ERROR, payload: error.message });
            throw error;
          }
        },
      }),

      // Fonctions de gestion d'images (si activées)
      ...(imagesEnabled && {
        uploadImage: imageHandlers.uploadImage,
        deleteImage: imageHandlers.deleteImage,
      }),

      // Fonctions pour données hiérarchiques (si activées)
      ...(hierarchicalEnabled && {
        fetchHierarchicalItems: async () => {
          dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_START });
          try {
            const response = await apiService.get(
              hierarchicalEndpoint || `${apiEndpoint}/hierarchical`
            );
            dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_SUCCESS, payload: response.data.data });
            return response.data.data;
          } catch (error) {
            dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_ERROR, payload: error.message });
            throw error;
          }
        },
      }),

      // Utiliser l'intégration WebSocket si fournie, sinon utiliser l'implémentation standard
      initWebSocketListeners: webSocketIntegration
        ? () => {
            const wsStore = webSocketIntegration.storeHook.getState();
            wsStore.initWebSocket();
            return wsStore.cleanup;
          }
        : () => {
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

            // S'abonner aux mises à jour WebSocket
            if (websocketService.isConnected) {
              websocketService.subscribe(entityPlural);

              // Écouter les événements spécifiques
              websocketService.on(`${entityPlural}.updated`, handleUpdate);
              websocketService.on(`${entityPlural}.created`, handleCreate);
              websocketService.on(`${entityPlural}.deleted`, handleDelete);
            } else {
              console.warn(
                `[WS-DEBUG] WebSocket non connecté, impossible de s'abonner pour ${entityName}`
              );
            }

            // Écouter les reconnexions WebSocket
            const handleReconnect = () => {
              if (websocketService.isConnected) {
                websocketService.subscribe(entityPlural);
              }
            };

            websocketService.on('connect', handleReconnect);

            // Retourner une fonction de nettoyage pour les composants React
            return () => {
              websocketService.off(`${entityPlural}.updated`, handleUpdate);
              websocketService.off(`${entityPlural}.created`, handleCreate);
              websocketService.off(`${entityPlural}.deleted`, handleDelete);
              websocketService.off('connect', handleReconnect);
            };
          },
    };

    return storeActions;
  });

  // Renommer les fonctions pour correspondre à la convention de nommage actuelle
  const renamedStore = {
    [`use${capitalize(entityName)}`]: () => {
      const store = useEntityStore();
      const entityPlural = pluralize(entityName);

      return {
        [`${entityPlural}`]: store.items,
        [`${entityName}sById`]: store.itemsById,
        loading: store.loading,
        error: store.error,
        [`fetch${capitalize(entityPlural)}`]: store.fetchItems,
        [`get${capitalize(entityName)}ById`]: store.getItemById,
        [`create${capitalize(entityName)}`]: store.createItem,
        [`update${capitalize(entityName)}`]: store.updateItem,
        [`delete${capitalize(entityName)}`]: store.deleteItem,
        ...(syncEnabled && { [`sync${capitalize(entityName)}`]: store.syncItem }),
        ...(imagesEnabled && {
          uploadImage: store.uploadImage,
          deleteImage: store.deleteImage,
        }),
        ...(hierarchicalEnabled && {
          hierarchicalItems: store.hierarchicalItems,
          hierarchicalLoading: store.hierarchicalLoading,
          hierarchicalError: store.hierarchicalError,
          [`fetchHierarchical${capitalize(entityPlural)}`]: store.fetchHierarchicalItems,
        }),
        dispatch: store.dispatch,
        initWebSocketListeners: store.initWebSocketListeners,
      };
    },
    useEntityStore,
  };

  return renamedStore;
}
