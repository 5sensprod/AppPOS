import { create } from 'zustand';
import { pluralize, capitalize } from '../utils/entityUtils';
import apiService from '../services/api';
import websocketService from '../services/websocketService';
import { createEntityImageHandlers } from './createEntityImageHandlers';
import { getStandardEntityReducers } from '../stores/reducers/entityReducers';
import { createCrudActions } from '../utils/crudActions';

export function createEntityStore(options) {
  const {
    entityName,
    apiEndpoint,
    features = { sync: true, images: true, hierarchy: false },
    hierarchicalEndpoint = null,
    webSocketIntegration = null,
    customActions = {},
    customReducers = {},
  } = options;

  const entityPlural = pluralize(entityName);
  const entityUpper = entityName.toUpperCase();

  const ACTIONS = {
    FETCH_START: 'FETCH_START',
    FETCH_SUCCESS: 'FETCH_SUCCESS',
    FETCH_ERROR: 'FETCH_ERROR',
    CREATE_SUCCESS: 'CREATE_SUCCESS',
    UPDATE_SUCCESS: 'UPDATE_SUCCESS',
    DELETE_SUCCESS: 'DELETE_SUCCESS',
    SYNC_SUCCESS: 'SYNC_SUCCESS',
    ...(features.hierarchy && {
      HIERARCHICAL_FETCH_START: 'HIERARCHICAL_FETCH_START',
      HIERARCHICAL_FETCH_SUCCESS: 'HIERARCHICAL_FETCH_SUCCESS',
      HIERARCHICAL_FETCH_ERROR: 'HIERARCHICAL_FETCH_ERROR',
    }),
    ...(features.images && {
      UPLOAD_IMAGE: 'UPLOAD_IMAGE',
      DELETE_IMAGE: 'DELETE_IMAGE',
    }),
    ...customActions,
  };

  const initialState = {
    items: [],
    itemsById: {},
    loading: false,
    error: null,
    ...(features.hierarchy && {
      hierarchicalItems: [],
      hierarchicalLoading: false,
      hierarchicalError: null,
    }),
  };

  const useEntityStore = create((set, get) => {
    const state = get();

    const standardImageReducers = features.images
      ? {
          [ACTIONS.UPLOAD_IMAGE]: (state, action) => {
            const { id, image } = action.payload;
            return {
              ...state,
              items: state.items.map((i) => (i._id === id ? { ...i, image } : i)),
              itemsById: {
                ...state.itemsById,
                [id]: { ...state.itemsById[id], image },
              },
              loading: false,
            };
          },
          [ACTIONS.DELETE_IMAGE]: (state, action) => {
            const { id } = action.payload;
            return {
              ...state,
              items: state.items.map((i) => (i._id === id ? { ...i, image: null } : i)),
              itemsById: {
                ...state.itemsById,
                [id]: { ...state.itemsById[id], image: null },
              },
              loading: false,
            };
          },
        }
      : {};

    const reducers = {
      ...getStandardEntityReducers(ACTIONS),
      ...customReducers,
      ...standardImageReducers,
      ...(features.hierarchy && {
        [ACTIONS.HIERARCHICAL_FETCH_START]: () => ({
          hierarchicalLoading: true,
          hierarchicalError: null,
        }),
        [ACTIONS.HIERARCHICAL_FETCH_SUCCESS]: (state, action) => ({
          hierarchicalItems: action.payload,
          hierarchicalLoading: false,
        }),
        [ACTIONS.HIERARCHICAL_FETCH_ERROR]: (state, action) => ({
          hierarchicalError: action.payload,
          hierarchicalLoading: false,
        }),
      }),
    };

    const dispatch = (action) => {
      const currentState = get();
      const reducer = reducers[action.type];
      if (reducer) {
        set(reducer(currentState, action));
      } else {
        console.warn(`[${entityUpper}] Aucune action définie pour: ${action.type}`);
      }
    };

    const imageHandlers = features.images
      ? createEntityImageHandlers(entityName, apiEndpoint, dispatch, ACTIONS)
      : {};

    return {
      ...initialState,
      dispatch,

      // === CRUD actions ===
      ...createCrudActions(apiEndpoint, dispatch, ACTIONS),

      ...(features.sync && {
        syncItem: async (id) => {
          dispatch({ type: ACTIONS.FETCH_START });
          try {
            const res = await apiService.post(`${apiEndpoint}/${id}/sync`);
            dispatch({ type: ACTIONS.SYNC_SUCCESS, payload: res.data.data });
            return res.data.data;
          } catch (err) {
            dispatch({ type: ACTIONS.FETCH_ERROR, payload: err.message });
            throw err;
          }
        },
      }),

      ...(features.images && imageHandlers),

      ...(features.hierarchy && {
        fetchHierarchicalItems: async () => {
          dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_START });
          try {
            const res = await apiService.get(hierarchicalEndpoint || `${apiEndpoint}/hierarchical`);
            dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_SUCCESS, payload: res.data.data });
            return res.data.data;
          } catch (err) {
            dispatch({ type: ACTIONS.HIERARCHICAL_FETCH_ERROR, payload: err.message });
            throw err;
          }
        },
      }),

      initWebSocketListeners: webSocketIntegration
        ? () => {
            console.log(`[${entityUpper}] Utilisation du WebSocket personnalisé`);
            const wsStore = webSocketIntegration.storeHook.getState();
            wsStore.initWebSocket();
            return wsStore.cleanup;
          }
        : (() => {
            const handleUpdate = ({ entityId, data }) => {
              dispatch({ type: ACTIONS.UPDATE_SUCCESS, payload: data });
            };
            const handleCreate = (data) => {
              dispatch({ type: ACTIONS.CREATE_SUCCESS, payload: data });
            };
            const handleDelete = ({ entityId }) => {
              dispatch({ type: ACTIONS.DELETE_SUCCESS, payload: entityId });
            };

            websocketService.subscribe(entityPlural);
            websocketService.on(`${entityPlural}.updated`, handleUpdate);
            websocketService.on(`${entityPlural}.created`, handleCreate);
            websocketService.on(`${entityPlural}.deleted`, handleDelete);
            websocketService.on('connect', () => websocketService.subscribe(entityPlural));

            return () => {
              websocketService.off(`${entityPlural}.updated`, handleUpdate);
              websocketService.off(`${entityPlural}.created`, handleCreate);
              websocketService.off(`${entityPlural}.deleted`, handleDelete);
              websocketService.off('connect');
            };
          })(),
    };
  });

  const renamedStore = {
    [`use${capitalize(entityName)}`]: () => {
      const store = useEntityStore();

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
        ...(features.sync && { [`sync${capitalize(entityName)}`]: store.syncItem }),
        ...(features.images && {
          uploadImage: store.uploadImage,
          deleteImage: store.deleteImage,
        }),
        ...(features.hierarchy && {
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
